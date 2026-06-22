import React from 'react';
import { RefreshCw } from 'lucide-react';
import { getCompanyBillingLabel } from '../lib/healthCheckConfig.js';

const TEXT = {
  title: '\u672c\u65e5\u306e\u5065\u5eb7\u8a3a\u65ad\u4e00\u89a7',
  count: '\u4ef6',
  refresh: '\u66f4\u65b0',
  close: '\u9589\u3058\u308b',
  closeMark: '\u00d7',
  loading: '\u672c\u65e5\u306e\u4e88\u7d04\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...',
  empty: '\u672c\u65e5\u306e\u4e88\u7d04\u306f\u3042\u308a\u307e\u305b\u3093',
  noCompany: '\u56e3\u4f53\u540d\u306a\u3057',
  remarks: '\u5099\u8003',
};

const formatFee = (fee) => {
  if (fee == null || fee === '') return '';
  const value = Number(fee);
  return Number.isFinite(value) ? `\u00a5${value.toLocaleString()}` : '';
};

export default function TodayReservationsModal({
  date,
  reservations,
  loading,
  error,
  getItemLabels,
  onClose,
  onRefresh,
  onSelect,
}) {
  const dateLabel = date ? date.replace(/-/g, '/') : '';

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-800">{TEXT.title}</h2>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-sm font-bold text-slate-600">{dateLabel}</span>
              <span className="text-base font-black text-blue-600">{reservations.length}{TEXT.count}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onRefresh} disabled={loading} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {TEXT.refresh}
            </button>
            <button type="button" onClick={onClose} className="px-2 py-1 text-xl font-bold text-slate-400 hover:text-slate-600" aria-label={TEXT.close}>{TEXT.closeMark}</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/60 px-5 py-4">
          {loading ? (
            <div className="py-12 text-center text-sm font-bold text-slate-400">{TEXT.loading}</div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm font-bold text-red-600">{error}</div>
          ) : reservations.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm font-bold text-slate-400">{TEXT.empty}</div>
          ) : (
            <div className="space-y-2">
              {reservations.map(reservation => {
                const billingLabel = getCompanyBillingLabel(reservation.purpose);
                const itemLabels = getItemLabels(reservation);
                const gender = (reservation.patient_gender || '').trim();
                const nameColor = gender === '\u7537' ? 'text-blue-700' : gender === '\u5973' ? 'text-red-700' : 'text-slate-800';
                return (
                  <button key={reservation.id} type="button" onClick={() => onSelect(reservation)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400">{reservation.patient_name_kana}</div>
                        <div className={`font-black ${nameColor}`}>{reservation.patient_name}</div>
                        <div className="mt-0.5 text-xs font-bold text-slate-500">{reservation.company_name || TEXT.noCompany}</div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-slate-500">
                        <div>{reservation.purpose}</div>
                        <div className="mt-0.5 font-black text-blue-600">
                          {billingLabel || [formatFee(reservation.fee), reservation.payment_type].filter(Boolean).join(' ')}
                        </div>
                      </div>
                    </div>
                    {itemLabels.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {itemLabels.map(item => (
                          <span key={item} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{item}</span>
                        ))}
                      </div>
                    )}
                    {reservation.others && (
                      <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-700 whitespace-pre-wrap">
                        {TEXT.remarks}: {reservation.others}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
