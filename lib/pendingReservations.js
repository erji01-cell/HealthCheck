// 予約日が空の予約を「日付未定の保留」として扱う
export const PENDING_WARNING_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export const getPendingDays = (reservation, now = Date.now()) => {
  const since = new Date(reservation?.pending_since || reservation?.updated_at || '').getTime();
  if (!Number.isFinite(since)) return null;
  return Math.max(0, Math.floor((now - since) / DAY_MS));
};

export const isPendingOverdue = (reservation, now = Date.now()) => {
  const days = getPendingDays(reservation, now);
  return days !== null && days >= PENDING_WARNING_DAYS;
};
