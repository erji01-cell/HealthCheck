-- 診断書（health_data）の重複防止
--
-- 予約1件につき診断書1件、患者ID＋健診日の組み合わせで診断書1件に制限する。
-- アプリ側（handleKenshinSave）でも既存レコードを探して update するが、
-- 複数端末からの同時保存に備えて DB 側にも一意制約を置く。
--
-- 部分インデックス（where 付き）のため ON CONFLICT の推論対象にはならない。
-- アプリ側は upsert ではなく明示的な update / insert を行うこと。

-- 【実行前の確認】以下が2件とも0行であることを確認してから下のインデックスを作成する。
-- 重複が残っているとインデックス作成が失敗する。
--
-- select reserv_id, count(*)
--   from public.health_data
--   where reserv_id is not null
--   group by reserv_id having count(*) > 1;
--
-- select k_id, k_date, count(*)
--   from public.health_data
--   where k_id is not null and k_id <> '' and k_date is not null
--   group by k_id, k_date having count(*) > 1;

-- 予約に紐づく診断書は1件まで
create unique index if not exists health_data_reserv_id_key
  on public.health_data (reserv_id)
  where reserv_id is not null;

-- 同一患者・同一健診日の診断書は1件まで（患者IDなしの行は対象外）
create unique index if not exists health_data_k_id_k_date_key
  on public.health_data (k_id, k_date)
  where k_id is not null and k_id <> '' and k_date is not null;

-- 作成済み判定（健診日の範囲検索）用
create index if not exists health_data_k_date_idx
  on public.health_data (k_date);
