// Backup & restore utilities for HealthCheck.
// - Backup: fetch all tables as raw DB rows → bundled JSON
// - Upload: Supabase Storage bucket "backups/healthcheck/"
// - Restore: upsert in FK-safe order（完全置換モードあり）
// - Auto-backup: 起動時＋変更の3分後（変更なしスキップ・1日1ファイル）

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

const BUCKET = 'backups';
const FOLDER = 'healthcheck';
const FILE_PREFIX = 'healthcheck';
const PAGE_SIZE = 1000;
const KEEP_COUNT = 30;
const AUTO_BACKUP_INTERVAL_HOURS = 24;
const LAST_BACKUP_KEY = 'health_check_last_backup_at';
const AUTO_BACKUP_ENABLED_KEY = 'health_check_auto_backup_enabled';

// FK-safe restore order (parent first if FK exists)
export const BACKUP_TABLES = [
  'patients',
  'health_reserv',
  'health_data',
];

function authHeaders(session) {
  const token = session?.access_token || SUPABASE_KEY;
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
  };
}

async function fetchAllRows(table, session) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&order=id.asc&limit=${PAGE_SIZE}&offset=${offset}`,
      { headers: authHeaders(session) }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${table} の取得に失敗しました (${res.status}): ${text}`);
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function buildBackupPayload(session) {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    tables: {},
  };
  for (const table of BACKUP_TABLES) {
    payload.tables[table] = await fetchAllRows(table, session);
  }
  return payload;
}

function makeFileName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${FOLDER}/${FILE_PREFIX}_backup_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}.json`;
}

// ファイル名から日付部分（YYYY-MM-DD）を取り出す
function getBackupItemDay(item) {
  const match = (item?.name || '').match(/backup_(\d{4}-\d{2}-\d{2})_/);
  return match ? match[1] : '';
}

export function getBackupItemTime(item) {
  const storageDate = item?.created_at || item?.updated_at || item?.last_accessed_at;
  const storageTime = storageDate ? Date.parse(storageDate) : 0;
  if (Number.isFinite(storageTime) && storageTime > 0) return storageTime;

  const match = (item?.name || '').match(/backup_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.json$/);
  if (!match) return 0;

  const [, year, month, day, hour, minute, second] = match.map(Number);
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

export function downloadJsonLocally(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function uploadToStorage(session, fileName, payload) {
  const body = JSON.stringify(payload);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: 'POST',
    headers: {
      ...authHeaders(session),
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 404 || /bucket/i.test(text)) {
      throw new Error(
        `Storage バケット "${BUCKET}" が見つかりません。Supabase ダッシュボードで作成してください。\n詳細: ${text}`
      );
    }
    throw new Error(`Storage アップロードに失敗しました (${res.status}): ${text}`);
  }
}

export async function listStorageBackups(session) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: {
      ...authHeaders(session),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prefix: `${FOLDER}/`,
      limit: 200,
      sortBy: { column: 'name', order: 'desc' },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 404) return [];
    throw new Error(`一覧取得に失敗しました (${res.status}): ${text}`);
  }
  const items = await res.json();
  return (items || [])
    .filter((it) => it.name && it.name.endsWith('.json'))
    .map((it) => ({
      ...it,
      name: it.name.startsWith(`${FOLDER}/`) ? it.name : `${FOLDER}/${it.name}`,
    }))
    .sort((a, b) => getBackupItemTime(b) - getBackupItemTime(a) || b.name.localeCompare(a.name));
}

export async function downloadStorageBackup(session, fileName) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    headers: authHeaders(session),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ダウンロードに失敗しました (${res.status}): ${text}`);
  }
  return res.json();
}

async function deleteStorageBackup(session, fileName) {
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`, {
    method: 'DELETE',
    headers: authHeaders(session),
  });
}

export async function pruneOldBackups(session, keep = KEEP_COUNT) {
  const items = await listStorageBackups(session);
  const toDelete = items.slice(keep);
  let deleted = 0;
  for (const item of toDelete) {
    try {
      await deleteStorageBackup(session, item.name);
      deleted++;
    } catch {
      /* swallow individual failures */
    }
  }
  return { deleted, kept: Math.min(items.length, keep) };
}

// Guard against concurrent backup runs (e.g. React StrictMode double-effect in dev).
let _backupInFlight = null;

// 変更なしスキップを許可する最大経過日数（これを超えたら変更がなくてもバックアップする）
const UNCHANGED_SKIP_MAX_AGE_DAYS = 7;

export async function performBackup(session, { downloadLocal = true, prune = true, skipIfUnchanged = false } = {}) {
  if (_backupInFlight) return _backupInFlight;
  const prevLastBackup = getLastBackupTime();
  setLastBackupTime(Date.now());
  _backupInFlight = (async () => {
    const payload = await buildBackupPayload(session);

    // データに変更がない場合はスキップ（直近バックアップが7日以内のときのみ。
    // 7日を超えたら変更がなくても新規バックアップして鮮度を保つ）
    if (skipIfUnchanged) {
      try {
        const backups = await listStorageBackups(session);
        if (backups.length > 0) {
          const latest = backups[0];
          const latestTime = getBackupItemTime(latest);
          const isFresh = latestTime > 0 &&
            Date.now() - latestTime < UNCHANGED_SKIP_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
          if (isFresh) {
            const latestPayload = await downloadStorageBackup(session, latest.name);
            if (JSON.stringify(latestPayload?.tables) === JSON.stringify(payload.tables)) {
              setLastBackupTime(latestTime);
              return { skipped: true, fileName: latest.name, payload, pruneResult: null };
            }
          }
        }
      } catch {
        /* 比較に失敗した場合は通常どおりバックアップする */
      }
    }

    const fileName = makeFileName();
    const localFileName = fileName.split('/').pop();
    await uploadToStorage(session, fileName, payload);

    // 同じ日の古いバックアップを削除して「1日1ファイル」に保つ
    try {
      const day = getBackupItemDay({ name: fileName });
      if (day) {
        const items = await listStorageBackups(session);
        for (const item of items) {
          if (item.name !== fileName && getBackupItemDay(item) === day) {
            await deleteStorageBackup(session, item.name);
          }
        }
      }
    } catch {
      /* 同日分の整理失敗は致命的でないため無視（pruneで回収される） */
    }
    if (downloadLocal) {
      downloadJsonLocally(payload, localFileName);
    }
    let pruneResult = null;
    if (prune) {
      pruneResult = await pruneOldBackups(session, KEEP_COUNT);
    }
    return { fileName, payload, pruneResult };
  })()
    .catch((err) => {
      setLastBackupTime(prevLastBackup);
      throw err;
    })
    .finally(() => { _backupInFlight = null; });
  return _backupInFlight;
}

async function upsertRows(table, rows, session) {
  if (!rows || rows.length === 0) return;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: {
        ...authHeaders(session),
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${table} の復元に失敗しました (${res.status}): ${text}`);
    }
  }
}

async function deleteAllRows(table, session) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`, {
    method: 'DELETE',
    headers: authHeaders(session),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${table} の全件削除に失敗しました (${res.status}): ${text}`);
  }
}

export async function restoreFromPayload(payload, session, { replace = false } = {}) {
  if (!payload || !payload.tables) {
    throw new Error('無効なバックアップファイルです。');
  }
  if (replace) {
    // 完全置換：FKの逆順で全テーブルを空にしてから復元する
    for (const table of [...BACKUP_TABLES].reverse()) {
      await deleteAllRows(table, session);
    }
  }
  const results = {};
  for (const table of BACKUP_TABLES) {
    const rows = payload.tables[table] || [];
    await upsertRows(table, rows, session);
    results[table] = rows.length;
  }
  return results;
}

// ---- local state helpers ----

export function getLastBackupTime() {
  const v = localStorage.getItem(LAST_BACKUP_KEY);
  return v ? Number(v) : 0;
}

export function setLastBackupTime(ts) {
  localStorage.setItem(LAST_BACKUP_KEY, String(ts));
}

export function isAutoBackupEnabled() {
  const v = localStorage.getItem(AUTO_BACKUP_ENABLED_KEY);
  return v === null ? true : v === 'true';
}

export function setAutoBackupEnabled(enabled) {
  localStorage.setItem(AUTO_BACKUP_ENABLED_KEY, String(enabled));
}

export async function shouldRunAutoBackup(session) {
  if (!isAutoBackupEnabled()) return false;
  const backups = await listStorageBackups(session);
  const last = backups.reduce((latest, item) => Math.max(latest, getBackupItemTime(item)), 0);
  if (!last) {
    setLastBackupTime(0);
    return true;
  }
  setLastBackupTime(last);
  const hoursSince = (Date.now() - last) / 1000 / 60 / 60;
  return hoursSince >= AUTO_BACKUP_INTERVAL_HOURS;
}
