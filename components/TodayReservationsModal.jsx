import React from 'react';
import { RefreshCw, Clock, Phone, Pill } from 'lucide-react';
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
  title: '\u672c\u65e5\u306e\u4e88\u7d04\u4e00\u89a7',
  healthTitle: '\u5065\u5eb7\u8a3a\u65ad',
  gfTitle: 'GF\uff08\u80c3\u5185\u8996\u93e1\uff09',
  cfTitle: 'CF\uff08\u5927\u8178\u5185\u8996\u93e1\uff09',
  count: '\u4ef6',
  refresh: '\u66f4\u65b0',
  close: '\u9589\u3058\u308b',
  closeMark: '\u00d7',
  loading: '\u672c\u65e5\u306e\u4e88\u7d04\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...',
  empty: '\u672c\u65e5\u306e\u4e88\u7d04\u306f\u3042\u308a\u307e\u305b\u3093',
  healthEmpty: '\u672c\u65e5\u306e\u5065\u5eb7\u8a3a\u65ad\u4e88\u7d04\u306f\u3042\u308a\u307e\u305b\u3093',
  gfEmpty: '\u672c\u65e5\u306eGF\u4e88\u7d04\u306f\u3042\u308a\u307e\u305b\u3093',
  cfEmpty: '\u672c\u65e5\u306eCF\u4e88\u7d04\u306f\u3042\u308a\u307e\u305b\u3093',
  noCompany: '\u56e3\u4f53\u540d\u306a\u3057',
  remarks: '\u5099\u8003',
  purpose: '\u5065\u8a3a\u76ee\u7684',
  unset: '\u672a\u8a2d\u5b9a',
  healthBadge: '\u5065\u8a3a',
  doctor: '\u62c5\u5f53\u533b',
  consult: '\u8a3a\u5bdf\u304b\u3089',
  bloodTest: '\u63a1\u8840\u3042\u308a',
  idName: 'ID / \u60a3\u8005\u540d',
  attributes: '\u5c5e\u6027',
  companyPurpose: '\u56e3\u4f53 / \u76ee\u7684',
  paymentRemarks: '\u652f\u6255\u3044\u30fb\u5099\u8003',
  contact: '\u9023\u7d61\u5148',
  notes: '\u5099\u8003\u30fb\u670d\u7528\u85ac',
  noData: '-',
};

const getGenderNameColor = (gender) => {
  const normalized = (gender || '').trim();
  if (normalized === '\u7537') return 'text-blue-800';
  if (normalized === '\u5973') return 'text-red-800';
  return 'text-slate-900';
};

function EmptySection({ text }) {
  return (
    <div className="p-8 text-center text-sm font-bold text-slate-400 bg-slate-50">
      {text}
    </div>
  );
}

function SectionCard({ title, count, tone, children }) {
  const badgeClass = tone === 'blue'
    ? 'border-blue-400 bg-blue-50 text-blue-700'
    : tone === 'cyan'
      ? 'border-blue-400 bg-blue-50 text-blue-700'
      : 'border-amber-400 bg-amber-50 text-amber-700';

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-4">
          <div className="text-2xl font-black text-slate-900">{title}</div>
          <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-black">{count}{TEXT.count}</div>
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest ${badgeClass}`}>
            {title}
          </div>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {children}
      </div>
    </div>
  );
}

function HealthRow({ reservation, itemLabels, onSelect }) {
  const nameColor = getGenderNameColor(reservation.patient_gender);

  return (
    <button
      type="button"
      onClick={() => onSelect(reservation)}
      className="flex w-full group min-h-[110px] text-left transition-all bg-white hover:bg-slate-50/30"
    >
      <div className="w-40 flex-none border-r border-slate-100 p-2 flex flex-row items-stretch bg-slate-50/40 relative">
        <div className="w-8 flex-none opacity-30" />
        <div className="flex-grow flex flex-col items-center justify-center py-2 px-1">
          <div className="text-center w-full px-1 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-full border border-blue-200 truncate mb-2">
            {TEXT.healthBadge}
          </div>
          <div className="text-xl font-black text-indigo-700 leading-none">
            {reservation.purpose || TEXT.unset}
          </div>
        </div>
      </div>

      <div className="flex-grow p-4 flex items-center min-w-0">
        <div className="flex gap-4 w-full items-center">
          <div className="w-[22%] min-w-0">
            <div className="text-[10px] font-black text-slate-400 mb-1">{TEXT.idName}</div>
            <div className="text-xs font-bold text-slate-400">{reservation.patient_id || TEXT.noData}</div>
            <div className="text-[10px] font-bold text-slate-500 truncate mt-1">{reservation.patient_name_kana || TEXT.noData}</div>
            <div className={`text-lg font-black truncate ${nameColor}`}>{reservation.patient_name || TEXT.noData}</div>
          </div>
          <div className="w-[16%]">
            <div className="text-[10px] font-black text-slate-400 mb-1">{TEXT.attributes}</div>
            <div className="flex flex-wrap gap-1.5 font-black text-[11px]">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">{reservation.patient_gender || TEXT.noData}</span>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">{reservation.age || TEXT.noData}\u6b73</span>
            </div>
          </div>
          <div className="w-[24%] min-w-0">
            <div className="text-[10px] font-black text-slate-400 mb-1">{TEXT.companyPurpose}</div>
            <div className="text-sm font-black text-slate-700 truncate">{reservation.company_name || TEXT.noCompany}</div>
            <div className="text-xs font-bold text-slate-500 truncate">{reservation.purpose || TEXT.unset}</div>
          </div>
          <div className="w-[38%]">
            <div className="w-[95%] bg-amber-50 p-2 rounded-xl border border-amber-100 min-h-[50px]">
              <div className="text-[9px] font-black text-amber-600 flex items-center gap-1 mb-1">
                <Pill size={12} /> {TEXT.paymentRemarks}
              </div>
              <div className="text-xs font-black text-blue-700 mb-1">{getReservationBillingText(reservation)}</div>
              {itemLabels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {itemLabels.map(item => (
                    <span key={item} className="rounded-md bg-white border border-amber-100 px-1.5 py-0.5 text-[9px] font-black text-slate-600">{item}</span>
                  ))}
                </div>
              )}
              {reservation.others && (
                <div className="mt-1 text-[10px] font-bold text-amber-900 line-clamp-2 leading-relaxed break-words">
                  {TEXT.remarks}: {reservation.others}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function EndoscopyRow({ reservation }) {
  const nameColor = getGenderNameColor(reservation.patientGender);
  const examLabel = reservation.examType === 'CF' ? '\u5927\u8178\u5185\u8996\u93e1' : '\u80c3\u5185\u8996\u93e1';

  return (
    <div className="flex group min-h-[110px] transition-all bg-white hover:bg-slate-50/30">
      <div className="w-40 flex-none border-r border-slate-100 p-2 flex flex-row items-stretch bg-slate-50/40 relative">
        <div className="w-8 flex-none opacity-30" />
        <div className="flex-grow flex flex-col items-center justify-center py-2 px-1">
          <div className="flex flex-col gap-1 w-full px-1 mb-2">
            {reservation.needsConsult && <div className="text-center w-full px-1 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full border border-emerald-200 truncate">{TEXT.consult}</div>}
            {reservation.needsBloodTest && <div className="text-center w-full px-1 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black rounded-full border border-rose-200 truncate">{TEXT.bloodTest}</div>}
          </div>
          <div className="text-2xl font-black text-indigo-700 flex items-center gap-1.5 leading-none">
            <Clock size={18} /> {reservation.time || TEXT.noData}
          </div>
        </div>
      </div>

      <div className="flex-grow p-4 flex items-center min-w-0">
        <div className="flex gap-4 w-full items-center">
          <div className="w-[22%] min-w-0">
            <div className="text-[10px] font-black text-slate-400 mb-1">{TEXT.idName}</div>
            <div className="text-xs font-bold text-slate-400">{reservation.patientId || TEXT.noData}</div>
            <div className="text-[10px] font-bold text-slate-500 truncate mt-1">{reservation.patientNameKana || TEXT.noData}</div>
            <div className={`text-lg font-black truncate ${nameColor}`}>{reservation.patientName || TEXT.noData}</div>
          </div>
          <div className="w-[16%]">
            <div className="text-[10px] font-black text-slate-400 mb-1">{TEXT.attributes}</div>
            <div className="flex flex-wrap gap-1.5 font-black text-[11px]">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">{reservation.patientGender || TEXT.noData}</span>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">{reservation.patientAge || TEXT.noData}\u6b73</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">{reservation.patientWeight || TEXT.noData}kg</span>
            </div>
          </div>
          <div className="w-[20%]">
            <div className="text-[10px] font-black text-slate-400 mb-1">{TEXT.contact}</div>
            <div className="text-sm font-bold text-slate-600 flex items-center gap-2 min-w-0">
              <Phone size={12} className="text-indigo-400 flex-shrink-0" />
              <span className="truncate">{reservation.phoneNumber || TEXT.noData}</span>
              {reservation.phone1Rel && <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">({reservation.phone1Rel})</span>}
            </div>
            {reservation.doctor && <div className="mt-1 text-[11px] font-black text-slate-500">{TEXT.doctor}: {reservation.doctor}</div>}
          </div>
          <div className="w-[42%]">
            <div className="w-[95%] bg-amber-50 p-2 rounded-xl border border-amber-100 min-h-[50px]">
              <div className="text-[9px] font-black text-amber-600 flex items-center gap-1 mb-1">
                <Pill size={12} /> {TEXT.notes}
              </div>
              <div className="flex flex-wrap gap-1 mb-1">
                <span className="text-[8px] bg-indigo-500 text-white px-1 rounded shadow-sm">{examLabel}</span>
                {reservation.hasAllergies && <span className="text-[8px] bg-rose-500 text-white px-1 rounded shadow-sm">\u30a2\u30ec\u30eb\u30ae\u30fc\u6709</span>}
                {reservation.hasEpilepsy && <span className="text-[8px] bg-rose-500 text-white px-1 rounded shadow-sm">\u3066\u3093\u304b\u3093\u6709</span>}
                {reservation.hasHPyloriEradication && <span className="text-[8px] bg-indigo-500 text-white px-1 rounded shadow-sm">\u30d4\u30ed\u30ea\u9664\u83cc</span>}
              </div>
              <div className="text-xs font-bold text-amber-900 line-clamp-2 leading-relaxed break-words">
                {reservation.medications || TEXT.noData}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{TEXT.title}</h2>
            <div className="mt-2 flex items-center flex-wrap gap-3">
              <span className="text-sm font-black text-slate-500">{dateLabel}</span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-black">{totalCount}{TEXT.count}</span>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 text-[10px] font-black">{TEXT.healthTitle} {reservations.length}{TEXT.count}</span>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-[10px] font-black">GF {gfReservations.length}{TEXT.count}</span>
              <span className="px-3 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-200 text-[10px] font-black">CF {cfReservations.length}{TEXT.count}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onRefresh} disabled={loading} className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 shadow-sm disabled:opacity-40">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {TEXT.refresh}
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-900 p-2 transition-all" aria-label={TEXT.close}>
              <span className="text-3xl leading-none font-black">{TEXT.closeMark}</span>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-grow space-y-6 bg-slate-50/60">
          {loading ? (
            <div className="bg-white rounded-3xl p-20 text-center border border-slate-200 text-slate-400 font-bold text-lg">{TEXT.loading}</div>
          ) : error ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-red-200 text-red-600 font-bold">{error}</div>
          ) : totalCount === 0 ? (
            <div className="bg-white rounded-3xl p-20 text-center border border-slate-200 text-slate-400 font-bold text-lg">{TEXT.empty}</div>
          ) : (
            <>
              <SectionCard title={TEXT.healthTitle} count={reservations.length} tone="blue">
                {reservations.length === 0 ? (
                  <EmptySection text={TEXT.healthEmpty} />
                ) : (
                  reservations.map(reservation => (
                    <HealthRow
                      key={reservation.id}
                      reservation={reservation}
                      itemLabels={getItemLabels(reservation)}
                      onSelect={onSelect}
                    />
                  ))
                )}
              </SectionCard>

              <SectionCard title={TEXT.gfTitle} count={gfReservations.length} tone="amber">
                {gfReservations.length === 0 ? (
                  <EmptySection text={TEXT.gfEmpty} />
                ) : (
                  gfReservations.map(reservation => <EndoscopyRow key={reservation.id} reservation={reservation} />)
                )}
              </SectionCard>

              <SectionCard title={TEXT.cfTitle} count={cfReservations.length} tone="cyan">
                {cfReservations.length === 0 ? (
                  <EmptySection text={TEXT.cfEmpty} />
                ) : (
                  cfReservations.map(reservation => <EndoscopyRow key={reservation.id} reservation={reservation} />)
                )}
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
