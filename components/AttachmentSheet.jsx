import React from 'react';
import { getWeekdayFromIso } from '../lib/kenshinUtils.js';

export default function AttachmentSheet({ formData }) {
  const formattedDate = formData.date
    ? (() => {
        const [year, month, day] = formData.date.split('-');
        return `${year}年${parseInt(month, 10)}月${parseInt(day, 10)}日`;
      })()
    : '　　　年　　　月　　　日';

  const infoItems = [
    { label: 'ID', value: formData.id || '' },
    { label: '氏名', value: formData.name ? `${formData.name} 様` : '' },
    { label: '健診日', value: `${formattedDate}${formData.date ? `（${getWeekdayFromIso(formData.date)}）` : ''}` },
    { label: '団体名', value: formData.companyName || '' },
    { label: '健診目的', value: formData.purpose || '' },
  ];

  return (
    <div
      id="attachment-sheet"
      className="bg-white shadow-2xl rounded-sm p-12 border border-slate-300 min-h-[841px] flex flex-col relative text-black leading-normal print-container mt-8"
    >
      <h1 className="text-[22px] font-bold text-center mb-8 border-b-2 border-black pb-3 tracking-[0.12em]">
        問診票・検尿結果 貼付台紙
      </h1>

      <div className="grid grid-cols-5 border-[1.5px] border-black text-sm mb-6">
        {infoItems.map(({ label, value }) => (
          <div key={label} className="border-r-[1.5px] border-black last:border-r-0">
            <div className="bg-slate-100 border-b-[1.5px] border-black text-center text-xs font-bold py-1">
              {label}
            </div>
            <div className="min-h-[34px] px-2 py-2 text-center font-bold flex items-center justify-center">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* 貼付エリア（問診票・検尿結果を貼付）＋ 右下に確認欄 */}
      <div className="flex-1 border-[1.5px] border-black relative bg-white min-h-0">
        <div className="absolute top-3 left-0 right-0 text-center text-slate-300 text-base font-bold">
          問診票・検尿結果をこの枠内に貼付
        </div>

        <div className="absolute bottom-0 right-0 w-[62mm] border-l-[1.5px] border-t-[1.5px] border-black bg-white">
          <div className="bg-slate-100 border-b-[1.5px] border-black px-2 py-1.5 text-center font-bold text-sm">
            確認欄
          </div>
          <div className="p-3 text-sm leading-8">
            <div>問診票　□</div>
            <div>検尿結果　□</div>
            <div className="mt-1">確認者：</div>
          </div>
        </div>
      </div>
    </div>
  );
}
