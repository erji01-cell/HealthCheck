import React from 'react';
import { calculateReservationFee, getCompanyBillingLabel, INSURANCE_REVIEW_PURPOSES, KURITAS_BLOOD_LABELS, HAPILUS_BLOOD_LABELS, BLOOD_NOTE_REFERENCE_PURPOSES } from '../lib/healthCheckConfig.js';
import { getWeekdayFromIso, formatDobDisplay } from '../lib/kenshinUtils.js';

// 健康診断の記録用紙プレビュー（rightTab === preview で表示・印刷対象）
export default function RecordSheetPreview({ formData, shahoFee }) {
  const purposeDisplay = INSURANCE_REVIEW_PURPOSES.includes(formData.purpose)
    ? `${formData.purpose}(審査)`
    : formData.purpose || '';
  const billingDisplay = getCompanyBillingLabel(formData.purpose)
    || (INSURANCE_REVIEW_PURPOSES.includes(formData.purpose) ? '保険会社請求' : '');

  return (
              <div className="bg-white shadow-2xl rounded-sm p-12 border border-slate-300 min-h-[841px] flex flex-col relative text-black leading-normal print-container" id="printable">
              <h1 className="text-[22px] font-bold text-center mb-[5mm] border-b-2 border-black pb-3 tracking-[0.4em]">健康診断の記録用紙</h1>

              <div className="border-[1.5px] border-black text-sm print-table">
                {/* 行: 健診日 + 健診目的 */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">健診日</div>
                  <div className="flex-1 p-2 border-r-[1.5px] border-black flex items-center font-bold text-lg">
                    {formData.date ? (() => { const [y,m,d] = formData.date.split('-'); return `${y}年${parseInt(m)}月${parseInt(d)}日`; })() : '　年　月　日'}
                    <span className="ml-4 font-normal text-sm">（{getWeekdayFromIso(formData.date) || '　曜日'}）</span>
                  </div>
                  <div className="w-[140px] bg-slate-100 p-2 flex items-center justify-center font-bold text-sm">
                    {purposeDisplay}
                  </div>
                </div>

                {/* 行: 氏名（読み仮名上・ID右） */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">氏名</div>
                  <div className="flex-1 px-4 py-2 flex flex-col justify-center border-r-[1.5px] border-black">
                    <span className="text-xs text-slate-500 leading-tight">{formData.yurigana}</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-xl font-bold">{formData.name}</span>
                      <span className="text-sm font-normal">様</span>
                    </div>
                  </div>
                  <div className="print-id w-[140px] p-2 flex items-center justify-center text-[21px] font-mono">
                    {formData.id ? `ID: ${formData.id}` : ''}
                  </div>
                </div>

                {/* 行: 生年月日 */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">生年月日</div>
                  <div className="flex-1 p-2 flex justify-between items-center pr-6">
                    <span className="text-lg">{formData.birthDate ? formatDobDisplay(formData.birthDate) : '　　　年　月　日'}</span>
                    <div className="flex items-center gap-6">
                      <span className="text-lg font-bold">{formData.age} <span className="text-xs font-normal">歳</span></span>
                      <span className="text-lg font-bold">{formData.gender || ''}</span>
                    </div>
                  </div>
                </div>

                {/* 行: 連絡先 + 団体名 */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">連絡先</div>
                  <div className="flex-1 p-2 font-mono border-r-[1.5px] border-black">{formData.contact || '　　-　　　-　　　'}</div>
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">団体名</div>
                  <div className="flex-1 p-2">{formData.companyName || '　'}</div>
                </div>

                {/* 行: 血圧・脈拍 */}
                <div className="flex border-b-[1.5px] border-black text-xs">
                  <div className="bp-title w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs text-center leading-tight shrink-0">血圧・脈拍<br/>色神</div>
                  <div className="flex-1 flex divide-x-[1.5px] divide-black">
                    <div className="flex-1 p-2 flex flex-col items-start justify-start">
                      <div className="text-[10px] text-black mb-0.5">血圧1回目</div>
                      <div className="font-mono text-sm font-bold text-black w-full text-center">{formData.bp1Sys || ''} / {formData.bp1Dia || ''}</div>
                    </div>
                    <div className={`flex-1 p-2 flex flex-col items-start justify-start ${formData.items.bloodPressure && formData.bpMeasureCount === '1' ? 'bg-slate-100' : ''}`}>
                      <div className="text-[10px] text-black mb-0.5">血圧2回目{formData.items.bloodPressure && formData.bpMeasureCount === '1' ? '（不要）' : ''}</div>
                      <div className={`font-mono text-sm font-bold w-full text-center ${formData.items.bloodPressure && formData.bpMeasureCount === '1' ? 'text-slate-500' : 'text-black'}`}>
                        {formData.items.bloodPressure && formData.bpMeasureCount === '1' ? '測定なし' : `${formData.bp2Sys || ''} / ${formData.bp2Dia || ''}`}
                      </div>
                    </div>
                    <div className={`w-[100px] p-2 flex flex-col items-start justify-start ${!formData.items.pulse ? 'relative bg-slate-100' : ''}`}>
                      {formData.items.pulse ? (
                        <>
                          <div className="text-[10px] text-black mb-0.5">脈拍</div>
                          <div className="font-mono text-sm font-bold text-black">{formData.pulse || ''}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-[10px] text-black mb-0.5">脈拍</div>
                          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-500">不要</div>
                        </>
                      )}
                    </div>
                    <div className={`w-[100px] p-2 flex flex-col items-start justify-start ${!formData.items.colorVision ? 'relative bg-slate-100' : ''}`}>
                      {formData.items.colorVision ? (
                        <>
                          <div className="text-[10px] text-black mb-0.5">色神</div>
                          <div className="text-sm font-bold text-black">{formData.colorVision || ''}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-[10px] text-black mb-0.5">色神</div>
                          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-500">不要</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 行: 身長・体重・BMI・腹囲・胸囲 */}
                <div className="flex border-b-[1.5px] border-black text-xs">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-[12px] text-center leading-tight">身長・体重<br/>BMI・腹囲</div>
                  <div className="flex-1 flex divide-x-[1.5px] divide-black">
                    {[
                      { label: '身長', value: formData.height, unit: 'cm', notRequired: !formData.items.heightWeight },
                      { label: '体重', value: formData.weight, unit: 'kg', notRequired: !formData.items.heightWeight },
                      { label: 'BMI', value: formData.bmi, unit: '', notRequired: !formData.items.heightWeight },
                      { label: '腹囲', value: formData.waist, unit: 'cm', notRequired: !formData.items.abdominalGirth },
                    ].map(({ label, value, unit, notRequired }) => (
                      <div key={label} className={`flex-1 p-2 flex flex-col items-start justify-start relative ${notRequired ? 'bg-slate-100' : ''}`}>
                        <div className="text-[10px] text-black mb-0.5">{label}</div>
                        {notRequired ? (
                          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-500">不要</div>
                        ) : (
                          <>
                            <div className="font-mono text-sm font-bold text-black">{value || ''}</div>
                            {unit && <span className="absolute bottom-1 right-1 text-[10px] text-black">{unit}</span>}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 行: 視力・聴力 */}
                <div className="flex border-b-[1.5px] border-black text-xs">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs text-center leading-tight shrink-0">視力・聴力</div>
                  <div className="flex-1 flex divide-x-[1.5px] divide-black">
                    {/* 視力 */}
                    <div className={`relative flex min-h-[64px] flex-1 flex-col divide-y-[1.5px] divide-black ${!formData.items.vision ? 'bg-slate-100' : ''}`}>
                      {formData.items.vision ? ([
                          { label: '裸眼', r: formData.visionR, l: formData.visionL },
                          { label: '矯正', r: formData.visionR2, l: formData.visionL2 },
                        ].map(({ label, r, l }) => (
                          <div key={label} className="vision-hearing-item flex items-center gap-1 px-2 py-[9px]">
                            <span className="text-[9px] text-black w-8 shrink-0">{label}</span>
                            <span className="text-[9px] text-black">右(</span>
                            <span className="vision-hearing-val text-xs min-w-[28px] text-center text-black">{r || ''}</span>
                            <span className="text-[9px] text-black">)</span>
                            <span className="text-[9px] text-black">左(</span>
                            <span className="vision-hearing-val text-xs min-w-[28px] text-center text-black">{l || ''}</span>
                            <span className="text-[9px] text-black">)</span>
                            {label === '矯正' && <span className="text-[9px] text-black ml-1">眼鏡 ・ CL</span>}
                          </div>
                        ))) : (
                          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-500">不要</div>
                        )}
                    </div>
                    {/* 聴力 */}
                    <div className={`relative flex min-h-[64px] flex-1 flex-col divide-y-[1.5px] divide-black ${!formData.items.hearing ? 'bg-slate-100' : ''}`}>
                      {formData.items.hearing ? ([
                          { label: '1000Hz', r: formData.hearingR, l: formData.hearingL },
                          { label: '4000Hz', r: formData.hearingR2, l: formData.hearingL2 },
                        ].map(({ label, r, l }) => (
                          <div key={label} className="vision-hearing-item flex items-center gap-1 px-2 py-[9px]">
                            <span className="hearing-label text-[9px] text-black w-8 shrink-0">{label}</span>
                            <span className="text-[9px] text-black">右(</span>
                            <span className="vision-hearing-val text-xs min-w-[28px] text-center text-black">{r || ''}</span>
                            <span className="text-[9px] text-black">)</span>
                            <span className="text-[9px] text-black">左(</span>
                            <span className="vision-hearing-val text-xs min-w-[28px] text-center text-black">{l || ''}</span>
                            <span className="text-[9px] text-black">)</span>
                          </div>
                        ))) : (
                          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-500">不要</div>
                        )}
                    </div>
                  </div>
                </div>

                {/* 行: 項目 */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">
                    <span>健診項目</span>
                  </div>
                  <div className="flex-1 p-2 space-y-1.5">
                    {[
                      { label: '一般健診', bg: 'bg-blue-50', border: 'border-blue-200', labelColor: 'text-blue-700', entries: { heightWeight: '身長/体重', abdominalGirth: '腹囲', bloodPressure: `血圧${formData.bpMeasureCount === '2' ? '2回' : '1回'}`, vision: '視力', hearing: '聴力', urine: '尿検査', xRay: 'X-P', ecg: '心電図', blood: ['特定健診(国保)', '長寿健診', '情報提供'].includes(formData.purpose) ? '採血 セット3' : formData.purpose === '特定健診(社保)' ? '採血 セット2' : BLOOD_NOTE_REFERENCE_PURPOSES.includes(formData.purpose) ? '採血 備考参照' : '採血 スクリ', pulse: '脈拍', colorVision: '色神' } },
                      { label: '特定企業', bg: 'bg-emerald-50', border: 'border-emerald-200', labelColor: 'text-emerald-700', entries: { bloodKuritasRegular: KURITAS_BLOOD_LABELS.regular, bloodKuritasSpecific: KURITAS_BLOOD_LABELS.specific, bloodHapilusB: HAPILUS_BLOOD_LABELS.b, bloodHapilusC: HAPILUS_BLOOD_LABELS.c, bloodHapilusHire: HAPILUS_BLOOD_LABELS.hire, bloodHapilusNight: HAPILUS_BLOOD_LABELS.night, bloodInsuranceReview: '採血 保険診査' } },
                      { label: '検便', bg: 'bg-amber-50', border: 'border-amber-200', labelColor: 'text-amber-700', entries: { stool: '便潜血', norovirus: 'ノロウイルス', bacteria3: '3菌種(赤痢・サルモネラ・O157)', bacteria5: '5菌種(赤痢・サルモネラ・O157・O111・O26)', paratyphoid: 'パラチフス・腸チフス' } },
                      { label: '有機溶剤', bg: 'bg-green-50', border: 'border-green-200', labelColor: 'text-green-700', entries: { methanol: 'メタノール', hexane: 'ノルマルヘキサン', methylHippuric: 'メチル馬尿酸' } },
                      { label: 'その他採血', bg: 'bg-purple-50', border: 'border-purple-200', labelColor: 'text-purple-700', entries: { psa: 'PSA', hbsAg: 'HBs抗原', hbsAb: 'HBs抗体', hcvAb: 'HCV抗体', syphilis: '梅毒STS', mrsa: 'MRSA 黄色ブドウ球菌' } },
                      { label: 'その他健診', bg: 'bg-orange-50', border: 'border-orange-200', labelColor: 'text-orange-700', entries: { hba1c: 'HbA1c', endoscopy: '胃内視鏡', echo: '腹部エコー', manganese: 'マンガン', cotinine: 'コチニン' } },
                    ].map(({ label, bg, border, labelColor, entries }) => (
                      <div key={label} className={`${bg} border ${border} rounded px-2 py-1`}>
                        <div className={`text-[9px] font-bold ${labelColor} mb-1`}>{label}</div>
                        <div className="grid grid-cols-4 gap-x-2 gap-y-0.5">
                          {Object.entries(entries).map(([key, lbl]) => (
                            <div key={key} className="flex items-center gap-1">
                              <span className={`w-3 h-3 border border-black flex-shrink-0 ${formData.items[key] ? 'bg-black' : ''}`}></span>
                              <span className={`text-[10px] ${formData.items[key] ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                                {lbl}{key === 'manganese' && <span className="print-only"> 右(  　　)左( 　　)</span>}{key === 'blood' && lbl === '採血 スクリ' && <span className="print-only">ーニング</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 行: 期限 */}
                <div className="flex border-b-[1.5px] border-black text-xs">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">提出期限</div>
                  <div className="flex-1 p-2 flex items-center gap-10">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 border border-black ${formData.deadlineType === '無' ? 'bg-black' : ''}`}></span>
                      <span>無</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className={`w-3.5 h-3.5 border border-black ${formData.deadlineType === '有' ? 'bg-black' : ''}`}></span>
                      <span>有</span>
                      <span className="font-mono h-5 text-sm" style={{marginLeft: '10mm', marginTop: '1mm', fontSize: '14px'}}>
                        {formData.deadlineType === '有' && formData.deadlineDate ? formData.deadlineDate.replace(/-/g, '/') : '　　/　/　'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 行: 専用診断用紙 */}
                <div className="flex border-b-[1.5px] border-black text-xs">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">専用用紙</div>
                  <div className="flex-1 p-2 flex items-center gap-10">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 border border-black ${!formData.hasDedicatedForm ? 'bg-black' : ''}`}></span>
                      <span>無</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 border border-black ${formData.hasDedicatedForm ? 'bg-black' : ''}`}></span>
                      <span>有（持参あり）</span>
                    </div>
                  </div>
                </div>

                {/* 行: 支払い */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">支払い</div>
                  <div className="flex-1 p-2 flex justify-between items-center pr-10">
                    {billingDisplay ? (
                      <span className="text-base font-bold">{billingDisplay}</span>
                    ) : (
                      <>
                        <span className="text-base font-bold underline decoration-[1.5px] underline-offset-4">
                          ¥ {(() => {
                            const fee = calculateReservationFee({ purpose: formData.purpose, items: formData.items, shahoFee });
                            return fee !== null ? fee.toLocaleString() : '0';
                          })()} -
                        </span>
                        <div className="flex gap-4">
                          {['当日支払', '後日支払', '会社請求'].map(type => (
                            <span key={type} className={`px-2 py-0.5 border ${formData.paymentType === type ? "border-black font-bold text-xs" : "border-transparent text-slate-200 text-xs"}`}>
                              {type}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 行: 既往歴 */}
                <div className="flex border-b-[1.5px] border-black min-h-[calc(40px_-_2mm)]">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">既往歴</div>
                  <div className="flex-1 p-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">
                    {formData.medicalHistory}
                  </div>
                </div>

                {/* 行: 所見 */}
                <div className="flex border-b-[1.5px] border-black min-h-[calc(60px_-_2mm)]">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">所見</div>
                  <div className="flex-1 p-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">
                    {formData.findings}
                  </div>
                </div>

                {/* 行: 備考事項 */}
                <div className="flex min-h-[30px]">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">備考</div>
                  <div className="flex-1 p-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-800">
                    {formData.others}
                  </div>
                </div>
              </div>

            </div>
  );
}
