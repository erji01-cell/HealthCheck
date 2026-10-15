import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { getReservationDateState, getReservationCapacityMessage } from '../lib/reservationCapacity.js';

test('日別人数上限のDB制約と表示状態', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.health_reserv (
      id text primary key, date date, company_id text, patient_name text
    );
    alter table public.health_reserv enable row level security;
    create policy reservations on public.health_reserv for all to authenticated using (true) with check (true);
    grant select, insert, update, delete on public.health_reserv to authenticated;
    insert into public.health_reserv values ('existing', '2026-10-20', 'A', 'テスト');
  `);
  await db.exec(await readFile(new URL('../supabase_health_reservation_closed_dates.sql', import.meta.url), 'utf8'));
  await db.exec("insert into public.health_reservation_closed_dates (date) values ('2026-10-21')");
  const migration = await readFile(new URL('../supabase_health_reservation_capacity.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration);

  const count = async date => Number((await db.query('select count(*) as n from public.health_reserv where date = $1', [date])).rows[0].n);
  const reserve = (id, date, company = 'A') => db.query('insert into public.health_reserv (id, date, company_id) values ($1, $2, $3)', [id, date, company]);
  const limit = (date, max) => db.query('insert into public.health_reservation_closed_dates (date, max_reservations) values ($1, $2) on conflict (date) do update set max_reservations = excluded.max_reservations', [date, max]);
  const full = promise => assert.rejects(promise, error => error.message === 'HEALTH_RESERVATION_DATE_FULL' && error.detail === '2');

  await t.test('SQL再実行で既存の受付停止日を維持し、編集は許可する', async () => {
    await assert.rejects(reserve('closed', '2026-10-21'), /HEALTH_RESERVATION_DATE_CLOSED/);
    await limit('2026-10-20', null);
    await db.exec("update public.health_reserv set patient_name = '変更', date = '2026-10-20' where id = 'existing'");
    await assert.rejects(reserve('closed-existing', '2026-10-20'), /HEALTH_RESERVATION_DATE_CLOSED/);
    await db.exec("delete from public.health_reservation_closed_dates where date = '2026-10-20'");
  });

  await t.test('全団体の合計が上限に達するまで登録でき、超過分はロールバックする', async () => {
    await limit('2026-10-20', 2);
    await reserve('second', '2026-10-20', 'B');
    await full(reserve('third', '2026-10-20', 'C'));
    assert.equal(await count('2026-10-20'), 2);
  });

  await t.test('満員日の既存予約は編集でき、別日からの移動は拒否される', async () => {
    await db.exec("update public.health_reserv set patient_name = '再修正', date = '2026-10-20' where id = 'existing'");
    await reserve('moving', '2026-10-22');
    await full(db.exec("update public.health_reserv set date = '2026-10-20' where id = 'moving'"));
    assert.equal(await count('2026-10-22'), 1);
    assert.equal(await count('2026-10-20'), 2);
  });

  await t.test('削除と日付変更で空いた枠へ再登録できる', async () => {
    await db.exec("delete from public.health_reserv where id = 'second'");
    await reserve('replacement', '2026-10-20');
    await db.exec("update public.health_reserv set date = '2026-10-22' where id = 'replacement'");
    await reserve('replacement2', '2026-10-20');
    assert.equal(await count('2026-10-20'), 2);
  });

  await t.test('人数を下回る上限でも既存予約を保持し、上限引き上げ・解除で再受付する', async () => {
    await limit('2026-10-20', 1);
    assert.equal(await count('2026-10-20'), 2);
    await assert.rejects(reserve('over-reduced', '2026-10-20'), /HEALTH_RESERVATION_DATE_FULL/);
    await db.exec("update public.health_reserv set date = '2026-10-20' where id = 'existing'");
    await limit('2026-10-20', 3);
    await reserve('raised', '2026-10-20');
    await db.exec("delete from public.health_reservation_closed_dates where date = '2026-10-20'");
    await reserve('unlimited', '2026-10-20');
    assert.equal(await count('2026-10-20'), 4);
  });

  await t.test('不正な上限と、複数件まとめた超過登録を拒否する', async () => {
    await assert.rejects(limit('2026-10-23', 0), /check constraint/);
    await assert.rejects(limit('2026-10-23', -1), /check constraint/);
    await limit('2026-10-23', 2);
    await full(db.exec("insert into public.health_reserv (id, date) values ('batch1', '2026-10-23'), ('batch2', '2026-10-23'), ('batch3', '2026-10-23')"));
    assert.equal(await count('2026-10-23'), 0);
    await reserve('no-date', null);
  });

  await t.test('人数RPCは認証必須で、個人情報を返さず全団体の合計を返す', async () => {
    await assert.rejects(db.query('select * from public.get_health_reservation_date_limits()'), /ログインが必要/);
    await limit('2026-10-20', 5);
    await db.exec("set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001'; set role authenticated");
    const { rows } = await db.query('select date::text, max_reservations, reservation_count from public.get_health_reservation_date_limits()');
    const setting = rows.find(row => row.date.startsWith('2026-10-20'));
    assert.deepEqual(Object.keys(setting).sort(), ['date', 'max_reservations', 'reservation_count']);
    assert.equal(Number(setting.reservation_count), 4);
    assert.equal(setting.max_reservations, 5);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from public.get_health_reservation_date_limits()'), /permission denied/);
    await db.exec('reset role');
  });

  await t.test('制限なし・受付停止・満員・空きありの表示を判別する', () => {
    assert.deepEqual(getReservationDateState(), { maxReservations: null, reservationCount: 0, isClosed: false, isFull: false });
    assert.equal(getReservationDateState({ maxReservations: null }).isClosed, true);
    assert.equal(getReservationDateState({ maxReservations: 2, reservationCount: 2 }).isFull, true);
    assert.equal(getReservationDateState({ maxReservations: 2, reservationCount: 1 }).isFull, false);
    assert.equal(getReservationDateState({ maxReservations: 1, reservationCount: 2 }).isFull, true);
    assert.match(getReservationCapacityMessage(15), /15人/);
  });
});
