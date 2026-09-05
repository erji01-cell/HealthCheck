import React from 'react';
import { formatDobDisplay, getWeekdayFromIso } from '../lib/kenshinUtils.js';

const FINDING_ITEMS = [
  '尿検査',
  'レントゲン',
  '心電図',
  '採血',
  '検便',
  '有機溶剤',
  '胃カメラ',
  '腹部エコー',
  'マンガン',
  'その他検査',
];

const formatVisitDate = (value) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${year}年${Number(month)}月${Number(day)}日`;
};

function JudgmentOptions() {
  return (
    <div className="flex items-center justify-center gap-7 whitespace-nowrap text-[15px] font-bold">
      <span>異常なし</span>
      <span>異常あり</span>
    </div>
  );
}

export default function DoctorFindingsSheet({ formData }) {
  return (
    <div
      id="doctor-findings-sheet"
      className="doctor-findings-sheet mt-4 min-h-[841px] rounded-sm border border-slate-300 bg-white px-12 pb-8 pt-6 text-black shadow-2xl"
    >
      <h1 className="border-b-2 border-black pb-2 text-center text-[22px] font-bold tracking-[0.28em]">
        医師所見記入用紙
      </h1>

      <div className="mt-3 border-[1.5px] border-black text-sm">
        <div className="flex border-b-[1.5px] border-black">
          <div className="flex w-[92px] items-center justify-center border-r-[1.5px] border-black bg-slate-100 px-2 py-1.5 text-xs font-bold">健診日</div>
          <div className="flex flex-1 items-center border-r-[1.5px] border-black px-3 py-1.5 font-bold">
            {formatVisitDate(formData.date)}
            {formData.date && <span className="ml-3 font-normal">（{getWeekdayFromIso(formData.date)}）</span>}
          </div>
          <div className="flex w-[92px] items-center justify-center border-r-[1.5px] border-black bg-slate-100 px-2 py-1.5 text-xs font-bold">健診目的</div>
          <div className="flex w-[170px] items-center justify-center px-3 py-1.5 font-bold">{formData.purpose || ''}</div>
        </div>

        <div className="flex border-b-[1.5px] border-black">
          <div className="flex w-[92px] items-center justify-center border-r-[1.5px] border-black bg-slate-100 px-2 py-1.5 text-xs font-bold">氏名</div>
          <div className="flex flex-1 items-center border-r-[1.5px] border-black px-3 py-1.5 text-base font-bold">
            {formData.name || ''}<span className="ml-2 text-sm font-normal">様</span>
          </div>
          <div className="flex w-[92px] items-center justify-center border-r-[1.5px] border-black bg-slate-100 px-2 py-1.5 text-xs font-bold">ID</div>
          <div className="flex w-[170px] items-center justify-center px-3 py-1.5 font-mono text-base font-bold">{formData.id || ''}</div>
        </div>

        <div className="flex">
          <div className="flex w-[92px] items-center justify-center border-r-[1.5px] border-black bg-slate-100 px-2 py-1.5 text-xs font-bold">生年月日</div>
          <div className="flex flex-1 items-center px-3 py-1.5">
            <span>{formData.birthDate ? formatDobDisplay(formData.birthDate) : ''}</span>
            <span className="ml-auto mr-6 font-bold">{formData.age !== '' && formData.age != null ? `${formData.age} 歳` : ''}</span>
            <span className="font-bold">{formData.gender || ''}</span>
          </div>
        </div>
      </div>

      <p className="mb-2 mt-3 text-right text-[11px] font-bold">該当する判定を○で囲んでください。</p>

      <div className="doctor-findings-table border-[1.5px] border-black">
        <div className="grid grid-cols-[120px_205px_1fr] border-b-[1.5px] border-black bg-slate-100 text-center text-xs font-bold">
          <div className="border-r-[1.5px] border-black px-2 py-2">検査項目</div>
          <div className="border-r-[1.5px] border-black px-2 py-2">判定</div>
          <div className="px-2 py-2">所見記入欄</div>
        </div>

        {FINDING_ITEMS.map(item => (
          <div key={item} className="grid min-h-[49px] grid-cols-[120px_205px_1fr] border-b-[1.5px] border-black">
            <div className="flex items-center justify-center border-r-[1.5px] border-black bg-slate-100 px-2 text-sm font-bold">{item}</div>
            <div className="flex items-center justify-center border-r-[1.5px] border-black px-2"><JudgmentOptions /></div>
            <div className="px-3 py-2" />
          </div>
        ))}

        <div className="grid min-h-[130px] grid-cols-[120px_1fr]">
          <div className="flex items-center justify-center border-r-[1.5px] border-black bg-slate-100 px-2 text-sm font-bold">総合所見</div>
          <div className="px-3 py-2" />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-8 text-sm">
        <div className="flex items-end gap-2">
          <span className="font-bold">記入日</span>
          <span className="inline-block w-[150px] border-b border-black pb-1 text-center">　　　年　　月　　日</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="font-bold">医師名</span>
          <span className="inline-block w-[180px] border-b border-black pb-1">　</span>
        </div>
      </div>
    </div>
  );
}
