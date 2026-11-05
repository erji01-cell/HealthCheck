import React from 'react';
import { AlertTriangle, PauseCircle, X } from 'lucide-react';
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

function PendingRow({ reservation, onSelect }) {
  const days = getPendingDays(reservation);
  const overdue = days !== null && days >= PENDING_WARNING_DAYS;
  const since = formatSinceDate(reservation.pending_since || reservation.updated_at);

  return (
    <button
      type="button"
      onClick={() => onSelect(reservation)}
      className={`grid w-full grid-cols-[150px_1fr_150px] items-center gap-4 px-6 py-4 text-left transition-colors ${overdue ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-slate-50'}`}
    >
      <div>
        <div className="text-[10px] font-black text-slate-400">元の予約日</div>
        <div className="whitespace-nowrap text-sm font-black text-slate-600">
          {reservation.pending_original_date ? formatDateWithWeekday(reservation.pending_original_date) : '記録なし'}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="shrink-0 text-sm font-black text-slate-400">{reservation.patient_id || '-'}</span>
          <span className={`truncate text-lg font-black ${getNameColor(reservation.patient_gender)}`}>{reservation.patient_name || '-'}</span>
          <span className="truncate text-xs font-black text-slate-400">{reservation.patient_name_kana || ''}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
          <span>{reservation.company_name || '団体名なし'}</span>
          {reservation.purpose && <span className="rounded-md bg-blue-50 px-2 py-0.5 font-black text-blue-700">{reservation.purpose}</span>}
        </div>
      </div>

      <div className="text-right">
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
  );
}

export default function PendingReservationsModal({ reservations, loading, error, onClose, onRefresh, onSelect }) {
  const overdueCount = reservations.filter(r => {
    const days = getPendingDays(r);
    return days !== null && days >= PENDING_WARNING_DAYS;
  }).length;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-[768px] flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-100">
              <PauseCircle size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-black leading-tight text-slate-900">保留中の予約（日付未定）</h2>
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
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="閉じる">
            <X size={30} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm font-bold text-slate-400">保留中の予約を読み込み中...</div>
          ) : error ? (
            <div className="mx-6 my-8 rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm font-bold text-red-600">{error}</div>
          ) : reservations.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm font-bold text-slate-400">保留中の予約はありません</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reservations.map(reservation => (
                <PendingRow key={reservation.id} reservation={reservation} onSelect={onSelect} />
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/40 px-6 py-3">
          <button type="button" onClick={onRefresh} disabled={loading} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-40">
            更新
          </button>
          <span className="text-xs font-bold text-slate-400">予約を選んで予約日を入れ、上書き保存すると保留が解除されます</span>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
