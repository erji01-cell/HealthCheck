import React from 'react';
import { CalendarDays, Clock, UserRound, X } from 'lucide-react';
import { formatDobDisplay, getWeekdayFromIso } from '../lib/kenshinUtils.js';

const toBirthIso = (raw) => {
  if (!raw) return '';
  const s = String(raw);
  if (s.includes('-')) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return '';
};

const TEXT = {
  title: '\u672c\u65e5\u306e\u691c\u67fb\u4e00\u89a7',
  healthTitle: '\u672c\u65e5\u306e\u5065\u5eb7\u8a3a\u65ad',
  gfTitle: '\u80c3\u5185\u8996\u93e1\uff08GF\uff09',
  cfTitle: '\u5927\u8178\u5185\u8996\u93e1\uff08CF\uff09',
  healthShort: '\u5065\u8a3a',
  count: '\u4ef6',
  total: '\u8a08',
  close: '\u9589\u3058\u308b',
  loading: '\u672c\u65e5\u306e\u4e88\u7d04\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...',
  empty: '\u672c\u65e5\u306e\u4e88\u7d04\u306f\u3042\u308a\u307e\u305b\u3093',
  healthEmpty: '\u672c\u65e5\u306e\u5065\u5eb7\u8a3a\u65ad\u4e88\u7d04\u306f\u3042\u308a\u307e\u305b\u3093',
  gfEmpty: '\u672c\u65e5\u306eGF\u4e88\u7d04\u306f\u3042\u308a\u307e\u305b\u3093',
  cfEmpty: '\u672c\u65e5\u306eCF\u4e88\u7d04\u306f\u3042\u308a\u307e\u305b\u3093',
  noCompany: '\u56e3\u4f53\u540d\u306a\u3057',
  birthDate: '\u751f\u5e74\u6708\u65e5',
  companyName: '\u4f1a\u793e\u540d',
  doctorSuffix: '\u5148\u751f',
  unset: '\u672a\u8a2d\u5b9a',
  consult: '\u8a3a\u5bdf\u304b\u3089',
  bloodTest: '\u63a1\u8840\u3042\u308a',
};

const getDateHeaderLabel = (date) => {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  const weekday = getWeekdayFromIso(date);
  return `${year}\u5e74${parseInt(month, 10)}\u6708${parseInt(day, 10)}\u65e5\uff08${weekday}\uff09`;
};

const getGenderColor = (gender) => {
  const value = (gender || '').trim();
  if (value === '\u7537') return 'text-blue-700 bg-blue-50 border-blue-100';
  if (value === '\u5973') return 'text-rose-700 bg-rose-50 border-rose-100';
  return 'text-slate-600 bg-slate-50 border-slate-100';
};

const getNameColor = (gender) => {
  const value = (gender || '').trim();
  if (value === '\u7537') return 'text-blue-700';
  if (value === '\u5973') return 'text-rose-600';
  return 'text-slate-900';
};

function Section({ title, count, children }) {
  return (
    <section className="border-t border-slate-200">
      <div className="flex items-center gap-3 bg-slate-50 px-6 py-2.5 text-sm font-black text-slate-600">
        <span>{title}</span>
        <span className="text-xs text-slate-500">{count}{TEXT.count}</span>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function EmptyRow({ text }) {
  return (
    <div className="px-6 py-7 text-center text-sm font-bold text-slate-400">
      {text}
    </div>
  );
}

function EndoscopyRow({ reservation }) {
  const gender = reservation.patientGender || '';
  const birthIso = toBirthIso(reservation.patientDob);
  const ageText = reservation.patientAge != null && reservation.patientAge !== '' ? `${reservation.patientAge}\u6b73` : '';
  const examPillClass = reservation.examType === 'CF'
    ? 'bg-orange-100 text-orange-700'
    : 'bg-emerald-100 text-emerald-700';

  return (
    <div className="grid grid-cols-[92px_52px_1fr_150px] items-center gap-3 px-6 py-5">
      <div className="flex flex-col items-start gap-1">
        {reservation.needsConsult && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600">{TEXT.consult}</span>
        )}
        {reservation.needsBloodTest && (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-600">{TEXT.bloodTest}</span>
        )}
        <div className="mt-1 flex items-center gap-1 text-2xl font-black text-indigo-600">
          <Clock size={18} />
          <span>{reservation.time || '--:--'}</span>
        </div>
      </div>

      <div className="flex justify-center">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${examPillClass}`}>
          {reservation.examType || 'GF'}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="shrink-0 text-sm font-black text-slate-400">{reservation.patientId || '-'}</span>
          <span className={`truncate text-xl font-black ${getNameColor(gender)}`}>{reservation.patientName || '-'}</span>
          <span className="truncate text-xs font-black text-slate-400">{reservation.patientNameKana || ''}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
          {gender && <span className={`rounded-md border px-2 py-0.5 text-xs font-black ${getGenderColor(gender)}`}>{gender}</span>}
          {ageText && <span>{ageText}</span>}
          {birthIso && <span>{TEXT.birthDate} {formatDobDisplay(birthIso)}</span>}
        </div>
      </div>

      <div className="flex justify-end">
        {reservation.doctor && (
          <div className="flex items-center gap-1.5 text-sm font-black text-slate-600">
            <UserRound size={15} className="text-indigo-500" />
            <span>{reservation.doctor} {TEXT.doctorSuffix}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HealthRow({ reservation, onSelect }) {
  const gender = reservation.patient_gender || '';
  const birthIso = toBirthIso(reservation.birth_date);
  const ageText = reservation.age != null && reservation.age !== '' ? `${reservation.age}\u6b73` : '';

  return (
    <button
      type="button"
      onClick={() => onSelect(reservation)}
      className="grid w-full grid-cols-[78px_1fr] items-center gap-3 px-6 py-5 text-left transition-colors hover:bg-blue-50/40"
    >
      <div className="text-base font-black text-slate-400">{reservation.patient_id || '-'}</div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className={`truncate text-xl font-black ${getNameColor(gender)}`}>{reservation.patient_name || '-'}</span>
          <span className="truncate text-xs font-black text-slate-400">{reservation.patient_name_kana || ''}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
          {gender && <span className={`rounded-md border px-2 py-0.5 text-xs font-black ${getGenderColor(gender)}`}>{gender}</span>}
          {ageText && <span>{ageText}</span>}
          {birthIso && <span>{TEXT.birthDate} {formatDobDisplay(birthIso)}</span>}
          <span>{TEXT.companyName} {reservation.company_name || TEXT.noCompany}</span>
          {reservation.purpose && <span className="rounded-md bg-blue-50 px-2 py-0.5 font-black text-blue-700">{reservation.purpose}</span>}
        </div>
      </div>
    </button>
  );
}

export default function TodayReservationsModal({
  date,
  reservations,
  endoscopyReservations = [],
  loading,
  error,
  onClose,
  onRefresh,
  onSelect,
}) {
  const gfReservations = endoscopyReservations.filter(r => r.examType !== 'CF');
  const cfReservations = endoscopyReservations.filter(r => r.examType === 'CF');
  const totalCount = reservations.length + gfReservations.length + cfReservations.length;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-[768px] flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-100">
              <CalendarDays size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-black leading-tight text-slate-900">{TEXT.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-black">
                <span className="text-slate-400">{getDateHeaderLabel(date)}</span>
                <span className="text-slate-300">|</span>
                <span className="text-blue-600">{TEXT.healthShort} {reservations.length}{TEXT.count}</span>
                <span className="text-slate-400">/</span>
                <span className="text-emerald-600">GF {gfReservations.length}{TEXT.count}</span>
                <span className="text-slate-400">/</span>
                <span className="text-orange-500">CF {cfReservations.length}{TEXT.count}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-600">{TEXT.total} {totalCount}{TEXT.count}</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label={TEXT.close}>
            <X size={30} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm font-bold text-slate-400">{TEXT.loading}</div>
          ) : error ? (
            <div className="mx-6 my-8 rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm font-bold text-red-600">{error}</div>
          ) : totalCount === 0 ? (
            <div className="px-6 py-16 text-center text-sm font-bold text-slate-400">{TEXT.empty}</div>
          ) : (
            <>
              <Section title={TEXT.healthTitle} count={reservations.length}>
                {reservations.length === 0 ? (
                  <EmptyRow text={TEXT.healthEmpty} />
                ) : (
                  reservations.map(reservation => (
                    <HealthRow key={reservation.id} reservation={reservation} onSelect={onSelect} />
                  ))
                )}
              </Section>

              <Section title={TEXT.gfTitle} count={gfReservations.length}>
                {gfReservations.length === 0 ? (
                  <EmptyRow text={TEXT.gfEmpty} />
                ) : (
                  gfReservations.map(reservation => <EndoscopyRow key={reservation.id} reservation={reservation} />)
                )}
              </Section>

              <Section title={TEXT.cfTitle} count={cfReservations.length}>
                {cfReservations.length === 0 ? (
                  <EmptyRow text={TEXT.cfEmpty} />
                ) : (
                  cfReservations.map(reservation => <EndoscopyRow key={reservation.id} reservation={reservation} />)
                )}
              </Section>
            </>
          )}
        </div>

        <div className="flex shrink-0 justify-between border-t border-slate-100 bg-slate-50/40 px-6 py-3">
          <button type="button" onClick={onRefresh} disabled={loading} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-40">
            {TEXT.refresh}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-700 px-6 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-slate-800">
            {TEXT.close}
          </button>
        </div>
      </div>
    </div>
  );
}
