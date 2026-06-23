import React from 'react';
import { getWeekdayFromIso } from '../lib/kenshinUtils.js';

export default function AttachmentSheet({ formData }) {
  const formattedDate = formData.date
    ? (() => {
        const [year, month, day] = formData.date.split('-');
        return `${year}年${parseInt(month, 10)}月${parseInt(day, 10)}日`;
      })()
    : '';

  const infoItems = [
    { label: 'ID', value: formData.id || '' },
    { label: '氏名', value: formData.name ? `${formData.name} 様` : '' },
    { label: '健診日', value: `${formattedDate}${formData.date ? `（${getWeekdayFromIso(formData.date)}）` : ''}` },
  ];

  return (
    <div
      id="attachment-sheet"
      className="bg-white shadow-2xl rounded-sm px-12 pt-6 pb-8 border border-slate-300 min-h-[841px] flex flex-col relative text-black leading-normal print-container mt-4"
    >
      <div className="grid grid-cols-[110px_1fr_190px] border-[1.5px] border-black text-sm mb-3">
        {infoItems.map(({ label, value }) => (
          <div key={label} className="border-r-[1.5px] border-black last:border-r-0">
            <div className="bg-slate-100 border-b-[1.5px] border-black text-center text-xs font-bold py-1">
              {label}
            </div>
            <div className="min-h-[30px] px-2 py-1.5 text-center font-bold flex items-center justify-center">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {/* 上半分: 心電図貼付欄（縦12.0cm） */}
        <div className="border-[1.5px] border-black bg-slate-50 flex flex-col" style={{ height: '120mm' }}>
          <div className="bg-slate-100 border-b-[1.5px] border-black px-4 py-1.5 text-center font-bold">
            心電図貼付欄
          </div>
          <div className="flex-1 flex items-center justify-center text-slate-300 text-base font-bold">
            ここに心電図を貼付
          </div>
        </div>

        {/* 下半分: 左=診療申込書（縦13.5cm）／右=検尿 */}
        <div className="flex gap-3" style={{ height: '135mm' }}>
          <div className="border-[1.5px] border-black bg-slate-50 flex flex-col" style={{ width: '95mm' }}>
            <div className="bg-slate-100 border-b-[1.5px] border-black px-2 py-1.5 text-center font-bold text-sm">
              診療申込書貼付欄
            </div>
            <div className="flex-1 flex items-center justify-center text-slate-300 text-sm font-bold">
              ここに診療申込書を貼付
            </div>
          </div>

          <div className="flex-1 border-[1.5px] border-black bg-slate-50 flex flex-col">
            <div className="bg-slate-100 border-b-[1.5px] border-black px-2 py-1.5 text-center font-bold text-sm">
              検尿貼付欄
            </div>
            <div className="flex-1 flex items-center justify-center text-center text-slate-300 text-sm font-bold leading-relaxed px-2">
              ここに<br />検尿結果を貼付
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
