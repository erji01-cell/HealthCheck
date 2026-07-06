import React from 'react';
import { getReservationBillingText } from '../lib/healthCheckConfig.js';

export default function ReservationDetailCard({
  reservation,
  checkedItems,
  birthDateText,
  onEdit,
  onDelete,
}) {
  const r = reservation;

  return (
    <div className="border border-slate-200 rounded-xl p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-xs text-slate-400">{r.patient_name_kana}</div>
          <div className="font-black text-lg">{r.patient_name}</div>
          <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
            {r.patient_id && <span className="font-black text-emerald-600">ID: {r.patient_id}</span>}
            {r.patient_gender && <span>{r.patient_gender}</span>}
            {birthDateText && <span>{birthDateText}</span>}
            {r.age != null && r.age !== '' && <span className="text-blue-600 font-bold">{r.age}歳</span>}
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>{r.purpose}</div>
          {r.company_name && <div className="mt-0.5 font-bold text-slate-600">{r.company_name}</div>}
          <div className="font-bold text-blue-600">{getReservationBillingText(r)}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {checkedItems.map(item => (
          <span key={item} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{item}</span>
        ))}
      </div>
      {r.has_dedicated_form && <div className="mt-2 text-[10px] text-orange-600 font-bold">専用診断用紙あり</div>}
      {r.deadline_type === '有' && r.deadline_date && <div className="mt-1 text-[10px] text-red-600">提出期限: {r.deadline_date}</div>}
      {r.others && (
        <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-2 py-1.5 text-[11px] font-bold text-amber-700 whitespace-pre-wrap">
          備考: {r.others}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onEdit(r)}
          className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-all"
        >
          修正・プレビュー
        </button>
        <button
          onClick={() => onDelete(r)}
          className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-red-600 transition-all"
        >
          削除
        </button>
      </div>
    </div>
  );
}
