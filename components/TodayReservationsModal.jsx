import React from 'react';
import { RefreshCw } from 'lucide-react';
import { getReservationBillingText } from '../lib/healthCheckConfig.js';
import { formatDobDisplay } from '../lib/kenshinUtils.js';

const toBirthIso = (raw) => {
  if (!raw) return '';
  const s = String(raw);
  if (s.includes('-')) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return '';
};

const TEXT = {
  title: '本日の予約一覧',
  healthTitle: '健康診断',
  gfTitle: 'GF（胃内視鏡）',
  cfTitle: 'CF（大腸内視鏡）',
  count: '件',
  refresh: '更新',
  close: '閉じる',
  closeMark: '×',
  loading: '本日の予約を読み込み中...',
  empty: '本日の予約はありません',
  healthEmpty: '本日の健康診断予約はありません',
  gfEmpty: '本日のGF予約はありません',
  cfEmpty: '本日のCF予約はありません',
  noCompany: '団体名なし',
  remarks: '備考',
  purpose: '健診目的',
  unset: '未設定',
  doctor: '担当医',
  consult: '診察',
  bloodTest: '採血',
};

export default function TodayReservationsModal({
  date,
  reservations,
  endoscopyReservations = [],
  loading,
  error,
  getItemLabels,
  onClose,
  onRefresh,
  onSelect,
}) {
  const dateLabel = date ? date.replace(/-/g, '/') : '';
  const gfReservations = endoscopyReservations.filter(r => r.examType !== 'CF');
  const cfReservations = endoscopyReservations.filter(r => r.examType === 'CF');
  const totalCount = reservations.length + gfReservations.length + cfReservations.length;

  const renderEndoscopySection = (title, sectionReservations, emptyText, accentClass) => (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-700">{title}</h3>
        <span className={`text-xs font-black ${accentClass}`}>{sectionReservations.length}{TEXT.count}</span>
      </div>
      {sectionReservations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-xs font-bold text-slate-400">{emptyText}</div>
      ) : (
        <div className="space-y-2">
          {sectionReservations.map(reservation => {
            const gender = (reservation.patientGender || '').trim();
            const nameColor = gender === '男' ? 'text-blue-800' : gender === '女' ? 'text-red-800' : 'text-slate-800';
            const examLabel = reservation.examType === 'CF' ? '大腸内視鏡' : '胃内視鏡';
            return (
              <div key={reservation.id} className="w-full rounded-xl border border-amber-200 bg-white p-4 text-left shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[13px] text-slate-400">{reservation.patientNameKana}</div>
                    <div className={`text-[21px] font-black leading-tight ${nameColor}`}>{reservation.patientName}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-bold text-slate-500">
                      {reservation.patientId && <span>ID: {reservation.patientId}</span>}
                      {toBirthIso(reservation.patientDob) && <span>{formatDobDisplay(toBirthIso(reservation.patientDob))}</span>}
                      {reservation.patientAge != null && reservation.patientAge !== '' && <span>{reservation.patientAge}歳</span>}
                      {reservation.time && <span>{reservation.time}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-500">
                    <div className="font-black text-amber-700">{examLabel}</div>
                    {reservation.doctor && <div className="mt-0.5 font-bold text-slate-600">{TEXT.doctor}: {reservation.doctor}</div>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {reservation.needsConsult && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{TEXT.consult}</span>}
                  {reservation.needsBloodTest && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">{TEXT.bloodTest}</span>}
                </div>
                {reservation.medications && (
                  <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-600 whitespace-pre-wrap">
                    {reservation.medications}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-800">{TEXT.title}</h2>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-sm font-bold text-slate-600">{dateLabel}</span>
              <span className="text-base font-black text-blue-600">{totalCount}{TEXT.count}</span>
              <span className="text-xs font-bold text-slate-400">
                {TEXT.healthTitle} {reservations.length}{TEXT.count} / GF {gfReservations.length}{TEXT.count} / CF {cfReservations.length}{TEXT.count}
              </span>
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
          ) : totalCount === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm font-bold text-slate-400">{TEXT.empty}</div>
          ) : (
            <div className="space-y-5">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-700">{TEXT.healthTitle}</h3>
                  <span className="text-xs font-black text-blue-600">{reservations.length}{TEXT.count}</span>
                </div>
                {reservations.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-xs font-bold text-slate-400">{TEXT.healthEmpty}</div>
                ) : (
                  <div className="space-y-2">
                    {reservations.map(reservation => {
                      const itemLabels = getItemLabels(reservation);
                      const gender = (reservation.patient_gender || '').trim();
                      const nameColor = gender === '男' ? 'text-blue-800' : gender === '女' ? 'text-red-800' : 'text-slate-800';
                      return (
                        <button key={reservation.id} type="button" onClick={() => onSelect(reservation)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-[13px] text-slate-400">{reservation.patient_name_kana}</div>
                              <div className={`text-[21px] font-black leading-tight ${nameColor}`}>{reservation.patient_name}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-bold text-slate-500">
                                {reservation.patient_id && <span>ID: {reservation.patient_id}</span>}
                                {toBirthIso(reservation.birth_date) && <span>{formatDobDisplay(toBirthIso(reservation.birth_date))}</span>}
                                {reservation.age != null && reservation.age !== '' && <span>{reservation.age}歳</span>}
                              </div>
                              <div className="mt-0.5 text-xs font-bold text-slate-500">{reservation.company_name || TEXT.noCompany}</div>
                            </div>
                            <div className="shrink-0 text-right text-xs text-slate-500">
                              <div className="font-bold text-slate-600">{TEXT.purpose}: {reservation.purpose || TEXT.unset}</div>
                              <div className="mt-0.5 font-black text-blue-600">
                                {getReservationBillingText(reservation)}
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
              </section>

              {renderEndoscopySection(TEXT.gfTitle, gfReservations, TEXT.gfEmpty, 'text-amber-600')}
              {renderEndoscopySection(TEXT.cfTitle, cfReservations, TEXT.cfEmpty, 'text-cyan-600')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
