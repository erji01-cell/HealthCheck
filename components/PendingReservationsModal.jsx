import React from 'react';
import { AlertTriangle, Loader2, PauseCircle, RotateCcw, Trash2, X } from 'lucide-react';
import { getWeekdayFromIso } from '../lib/kenshinUtils.js';
import { PENDING_WARNING_DAYS, getPendingDays } from '../lib/pendingReservations.js';

const formatDateWithWeekday = (iso) => {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${year}/${month}/${day}（${getWeekdayFromIso(iso).slice(0, 1)}）`;
};

const formatSinceDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

const getNameColor = (gender) => {
  const value = (gender || '').trim();
  if (value === '男') return 'text-blue-700';
  if (value === '女') return 'text-rose-600';
  return 'text-slate-900';
};

function PendingRow({ reservation, onSelect, onRestore, onDelete, restoringId, deletingId }) {
  const days = getPendingDays(reservation);
  const overdue = days !== null && days >= PENDING_WARNING_DAYS;
  const since = formatSinceDate(reservation.pending_since || reservation.updated_at);
  const busy = !!restoringId || !!deletingId;

  return (
    <div className={`grid items-center gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_184px] sm:px-6 ${overdue ? 'bg-red-50/60' : ''}`}>
      <button
        type="button"
        onClick={() => onSelect(reservation)}
        disabled={busy}
        className="grid min-w-0 gap-2 rounded-md text-left transition-colors hover:bg-slate-50 disabled:opacity-50 sm:grid-cols-[130px_minmax(0,1fr)_100px] sm:items-center sm:gap-3"
      >
        <div>
          <div className="text-[10px] font-black text-slate-400">元の予約日</div>
          <div className="whitespace-nowrap text-sm font-black text-slate-600">
            {reservation.pending_original_date ? formatDateWithWeekday(reservation.pending_original_date) : '記録なし'}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="shrink-0 text-sm font-black text-slate-400">{reservation.patient_id || '-'}</span>
            <span className={`truncate text-lg font-black ${getNameColor(reservation.patient_gender)}`}>{reservation.patient_name || '-'}</span>
            <span className="truncate text-xs font-black text-slate-400">{reservation.patient_name_kana || ''}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
            <span>{reservation.company_name || '団体名なし'}</span>
            {reservation.purpose && <span className="rounded-md bg-blue-50 px-2 py-0.5 font-black text-blue-700">{reservation.purpose}</span>}
          </div>
        </div>

        <div className="sm:text-right">
          {overdue ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-xs font-black text-red-700">
              <AlertTriangle size={13} /> {days}日経過
            </span>
          ) : (
            <span className="text-sm font-black text-amber-700">{days !== null ? `${days}日経過` : ''}</span>
          )}
          {since && <div className="mt-1 text-[11px] font-bold text-slate-400">保留開始 {since}</div>}
        </div>
      </button>
      <div className="flex items-center justify-end gap-2">
        {reservation.pending_original_date && (
          <button
            type="button"
            onClick={() => onRestore(reservation)}
            disabled={busy}
            aria-label={`${reservation.patient_name || 'この予約'}を元の予約日に戻す`}
            title={`${formatDateWithWeekday(reservation.pending_original_date)}に戻す`}
            className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {restoringId === reservation.id ? <Loader2 size={14} className="shrink-0 animate-spin" /> : <RotateCcw size={14} className="shrink-0" />}
            {restoringId === reservation.id ? '戻しています...' : '元の予約日に戻す'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(reservation)}
          disabled={busy}
          aria-label={`${reservation.patient_name || 'この予約'}の保留予約を削除`}
          title="保留予約を削除"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deletingId === reservation.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function PendingReservationsModal({ reservations, loading, error, actionError, restoringId, deletingId, onClose, onRefresh, onSelect, onRestore, onDelete }) {
  const busy = !!restoringId || !!deletingId;
  const overdueCount = reservations.filter(r => {
    const days = getPendingDays(r);
    return days !== null && days >= PENDING_WARNING_DAYS;
  }).length;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md" onClick={busy ? undefined : onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="pending-reservations-title" className="flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-200 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-100">
              <PauseCircle size={26} />
            </div>
            <div>
              <h2 id="pending-reservations-title" className="text-lg font-black leading-tight text-slate-900 sm:text-2xl">保留中の予約<span className="block whitespace-nowrap sm:inline">（日付未定）</span></h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-black">
                <span className="text-amber-700">{reservations.length}件</span>
                {overdueCount > 0 && (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-black text-red-600">
                    {PENDING_WARNING_DAYS}日以上経過 {overdueCount}件
                  </span>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40" aria-label="閉じる">
            <X size={30} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {actionError && <div role="alert" className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 sm:mx-6">{actionError}</div>}
          {loading ? (
            <div className="px-6 py-16 text-center text-sm font-bold text-slate-400">保留中の予約を読み込み中...</div>
          ) : error ? (
            <div className="mx-6 my-8 rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm font-bold text-red-600">{error}</div>
          ) : reservations.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm font-bold text-slate-400">保留中の予約はありません</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reservations.map(reservation => (
                <PendingRow key={reservation.id} reservation={reservation} onSelect={onSelect} onRestore={onRestore} onDelete={onDelete} restoringId={restoringId} deletingId={deletingId} />
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:px-6">
          <button type="button" onClick={onRefresh} disabled={loading || busy} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-40">
            更新
          </button>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-40">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
