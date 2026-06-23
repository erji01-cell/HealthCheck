import React from 'react';
import { getBloodArrow, toWareki, toWareikiWithWestern, getBirthEra } from '../lib/kenshinUtils.js';

// 健康診断書プレビュー（rightTab === kenshin で表示・印刷対象）
export default function KenshinCertificate({ kenshinData, setHighlightedField }) {
  // 値が未入力のセルを薄いグレーで網掛け（入力済み/未入力を明確化）
  const EMPTY_BG = '#eef1f5';
  const emptyBg = (v) => ((v === undefined || v === null || String(v).trim() === '') ? { backgroundColor: EMPTY_BG } : null);
  return (
    <>
              <div className="bg-white shadow-2xl rounded-sm border border-slate-300 min-h-[841px] flex flex-col text-black leading-normal print-container" id="kenshin-printable" style={{padding: '8mm 12mm', fontSize: '12px', width: '180mm'}}>

                {/* タイトル */}
                <h1 className="font-bold text-center mb-4" style={{fontSize: '22px', letterSpacing: '0.25em'}}>健　康　診　断　書</h1>

                {/* 患者情報 */}
                <div className="mb-3" style={{border: '1.5px solid black'}}>
                  {/* ふりがな・氏名・性別 */}
                  <div className="flex" style={{borderBottom: '1.5px solid black'}}>
                    <div className="flex flex-col bg-slate-50" style={{width: '78px', borderRight: '1.5px solid black'}}>
                      <div className="text-center py-0.5" style={{fontSize: '10px', borderBottom: '1px solid black'}}>ふりがな</div>
                      <div className="flex-1 flex items-center justify-center font-bold" style={{fontSize: '11px'}}>氏名</div>
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="px-2 py-0.5" style={{fontSize: '11px', borderBottom: '1px solid black', minHeight: '20px'}}>{kenshinData.kYurigana}</div>
                      <div className="px-2 py-1 flex items-center gap-2">
                        <span className="font-bold" style={{fontSize: '17px'}}>{kenshinData.kName}</span>
                        <span style={{fontSize: '14px'}} className="ml-1">様</span>
                        {kenshinData.kGender && <span className="ml-2 font-bold" style={{fontSize: '14px'}}>（{kenshinData.kGender}）</span>}
                      </div>
                    </div>
                  </div>
                  {/* 住所 */}
                  <div className="flex" style={{borderBottom: '1.5px solid black', minHeight: '28px'}}>
                    <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '78px', borderRight: '1.5px solid black', fontSize: '11px'}}>住所</div>
                    <div className="flex-1 px-3 py-1" style={{fontSize: '11px'}}>{kenshinData.address}</div>
                  </div>
                  {/* 生年月日 */}
                  <div className="flex" style={{borderBottom: '1.5px solid black', minHeight: '36px'}}>
                    <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '78px', borderRight: '1.5px solid black', fontSize: '11px'}}>生年月日</div>
                    <div className="flex-1 flex items-center px-3 py-1">
                      {(() => {
                        if (!kenshinData.kBirthDate) return <span style={{fontSize: '14px'}}>　　　　年（　　　　）　　月　　日</span>;
                        const [y, m, d] = kenshinData.kBirthDate.split('-').map(Number);
                        const era = getBirthEra(kenshinData.kBirthDate);
                        const eraNameMap = { T: '大正', S: '昭和', H: '平成', R: '令和', M: '明治' };
                        const eraBaseMap = { T: 1911, S: 1925, H: 1988, R: 2018, M: 1867 };
                        const eraName = eraNameMap[era] || '';
                        const eraYear = y - (eraBaseMap[era] || 0);
                        return <span style={{fontSize: '14px'}}>{eraName}{eraYear}年（{y}年）{m}月{d}日　{kenshinData.kAge ? `（${kenshinData.kAge}歳）` : ''}</span>;
                      })()}
                    </div>
                  </div>
                  {/* 団体名 / 健診受診日 */}
                  <div className="flex" style={{minHeight: '28px'}}>
                    <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '78px', borderRight: '1.5px solid black', fontSize: '11px'}}>団体名</div>
                    <div className="flex-1 flex items-center px-3" style={{fontSize: '13px', borderRight: '1px solid black'}}>{kenshinData.kCompanyName}</div>
                    <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '72px', borderRight: '1px solid black', fontSize: '11px'}}>健診受診日</div>
                    <div className="flex-1 flex items-center px-3" style={{fontSize: '12px'}}>{toWareikiWithWestern(kenshinData.kDate)}</div>
                  </div>
                </div>

                {/* 既往歴・服薬歴・喫煙歴・自覚症状（独立セクション） */}
                <div className="mb-2" style={{border: '1.5px solid black'}}>
                  {[
                    { label: '既往歴',   content: kenshinData.medicalHistory || 'なし' },
                    { label: '服薬歴',   content: [kenshinData.medBP && `血圧: ${kenshinData.medBP}`, kenshinData.medBG && `血糖: ${kenshinData.medBG}`, kenshinData.medLipid && `脂質: ${kenshinData.medLipid}`].filter(Boolean).join('　') || 'なし' },
                  ].map(({ label, content }, i, arr) => (
                    <div key={label} className="flex" style={{borderBottom: i < arr.length - 1 ? '1px solid black' : 'none', minHeight: '20px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px', padding: '2px 4px'}}>{label}</div>
                      <div className="flex-1 flex items-center px-2" style={{fontSize: '11px'}}>{content}</div>
                    </div>
                  ))}
                  {/* 喫煙歴・飲酒 同行表示 */}
                  <div className="flex" style={{borderTop: '1px solid black', minHeight: '20px'}}>
                    <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px', padding: '2px 4px'}}>喫煙歴</div>
                    <div className="flex items-center px-2" style={{fontSize: '11px', flex: 1, borderRight: '1px solid black'}}>{kenshinData.smokingHistory || 'なし'}</div>
                    <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '44px', borderRight: '1px solid black', fontSize: '11px', padding: '2px 4px'}}>飲酒</div>
                    <div className="flex items-center px-2" style={{fontSize: '11px', flex: 1}}>{kenshinData.drinkingHistory || 'なし'}</div>
                  </div>
                  {/* 自覚症状 */}
                  <div className="flex" style={{borderTop: '1px solid black', minHeight: '20px'}}>
                    <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px', padding: '2px 4px'}}>自覚症状</div>
                    <div className="flex-1 flex items-center px-2" style={{fontSize: '11px'}}>{kenshinData.subjective || 'なし'}</div>
                  </div>
                </div>

                {/* メインテーブル */}
                <div className="flex flex-1" style={{border: '1.5px solid black'}}>

                  {/* 左列 */}
                  <div className="flex flex-col" style={{flex: 1, borderRight: '1.5px solid black'}}>

                    {/* 身長/体重・BMI・腹囲・血圧・脈拍 */}
                    {[
                      { label: '身長/体重', val: kenshinData.height && kenshinData.weight ? `${kenshinData.height} cm / ${kenshinData.weight} kg` : '' },
                      { label: 'BMI',       val: kenshinData.bmi },
                      { label: '腹囲',      val: kenshinData.waist ? `${kenshinData.waist} cm` : '' },
                      { label: '血圧(mmHg)',val: kenshinData.bpSys || kenshinData.bpDia ? `${kenshinData.bpSys || ''} / ${kenshinData.bpDia || ''}` : '' },
                      { label: '脈拍',      val: kenshinData.pulse },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex" style={{borderBottom: '1px solid black', flex: 1, minHeight: '22px'}}>
                        <div className="bg-slate-50 flex items-center justify-center text-center font-bold" style={{width: '78px', borderRight: '1px solid black', fontSize: '11px', padding: '2px 4px'}}>{label}</div>
                        <div className="flex-1 flex items-center justify-center font-mono font-bold" style={{fontSize: '12px', ...emptyBg(val)}}>{val}</div>
                      </div>
                    ))}

                    {/* 眼（視力・色神） */}
                    <div className="flex" style={{borderBottom: '1px solid black', flex: 3}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '20px', borderRight: '1px solid black', writingMode: 'vertical-rl', textOrientation: 'upright', fontSize: '12px', letterSpacing: '6px', padding: '4px 2px'}}>眼</div>
                      <div className="flex flex-col flex-1">
                        <div className="flex" style={{borderBottom: '1px solid black', flex: 2}}>
                          <div className="bg-slate-50 flex flex-col items-center justify-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '10px'}}>
                            <span>視</span><span>力</span>
                          </div>
                          <div className="flex flex-col flex-1" style={{borderRight: '0'}}>
                            {[
                              { side: '右', bare: kenshinData.visionR, corr: kenshinData.visionR2 },
                              { side: '左', bare: kenshinData.visionL, corr: kenshinData.visionL2 },
                            ].map(({ side, bare, corr }, i) => (
                              <div key={side} className="flex items-center gap-1 pr-2" style={{flex: 1, minHeight: '18px', borderBottom: i === 0 ? '1px solid black' : 'none', fontSize: '11px', paddingLeft: '17mm', ...emptyBg(bare || corr)}}>
                                <span className="text-black font-bold" style={{width: '12px'}}>{side}</span>
                                <span className="text-black font-bold">裸眼: {bare}</span>
                                {corr && <span className="ml-3 text-black font-bold">矯正: {corr}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex" style={{flex: 1, minHeight: '18px', fontSize: '11px'}}>
                          <div className="bg-slate-50 flex items-center justify-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '10px'}}>色神</div>
                          <div className="flex-1 flex items-center px-2" style={{...emptyBg(kenshinData.colorVision)}}>{kenshinData.colorVision}</div>
                        </div>
                      </div>
                    </div>

                    {/* 聴力 */}
                    <div className="flex" style={{borderBottom: '1px solid black', flex: 2}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '78px', borderRight: '1px solid black', fontSize: '11px'}}>聴力</div>
                      <div className="flex flex-col flex-1">
                        {[
                          { hz: '1000Hz', r: kenshinData.hearingR,     l: kenshinData.hearingL },
                          { hz: '4000Hz', r: kenshinData.hearing4000R, l: kenshinData.hearing4000L },
                        ].map(({ hz, r, l }, i) => (
                          <div key={hz} className="flex items-center gap-2 px-2" style={{flex: 1, minHeight: '18px', borderBottom: i === 0 ? '1px solid black' : 'none', fontSize: '11px', ...emptyBg(r || l)}}>
                            <span className="text-slate-500" style={{width: '38px', flexShrink: 0}}>{hz}</span>
                            <span className="text-black font-bold">右: {r}</span>
                            <span className="ml-2 text-black font-bold">左: {l}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 血液検査 */}
                    <div className="flex" style={{flex: 11}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '20px', borderRight: '1px solid black', writingMode: 'vertical-rl', textOrientation: 'upright', fontSize: '11px', letterSpacing: '2px', padding: '4px 2px'}}>血液検査</div>
                      <div className="flex flex-col flex-1">

                        {[
                          { group: '貧血検査', rows: [{ label: '白血球(10²/mm³)', val: kenshinData.wbc, field: 'wbc' }, { label: '赤血球(万/mm³)', val: kenshinData.rbc, field: 'rbc' }, { label: '血色素(g/dL)', val: kenshinData.hemoglobin, field: 'hemoglobin' }, { label: 'ヘマトクリット(%)', val: kenshinData.ht, field: 'ht' }] },
                          { group: '肝機能', rows: [{ label: 'GOT(IU/L)', val: kenshinData.got, field: 'got' }, { label: 'GPT(IU/L)', val: kenshinData.gpt, field: 'gpt' }, { label: 'γ-GTP(IU/L)', val: kenshinData.gammaGtp, field: 'gammaGtp' }] },
                          { group: '血中脂質', rows: [{ label: 'HDLコレステロール(mg/dL)', val: kenshinData.hdl, field: 'hdl' }, { label: 'LDLコレステロール(mg/dL)', val: kenshinData.ldl, field: 'ldl' }, { label: '中性脂肪(mg/dL)', val: kenshinData.triglyceride, field: 'triglyceride' }] },
                          { group: '血糖', rows: [{ label: '血糖検査(mg/dL)', val: kenshinData.bloodGlucose, field: 'bloodGlucose' }, { label: 'HbA1c(%)', val: kenshinData.hba1c, field: 'hba1c' }] },
                        ].map(({ group, rows }, idx, arr) => (
                          <div key={group} className="flex" style={{borderBottom: idx < arr.length - 1 ? '1px solid black' : 'none', flex: rows.length}}>
                            <div className="bg-slate-50 flex items-center justify-center text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '10px', padding: '2px'}}>{group}</div>
                            <div className="flex flex-col flex-1">
                              {rows.map(({ label, val, field }, i) => (
                                <div key={label} className="flex items-center gap-1 px-1" onClick={() => { setHighlightedField(field); const el = document.getElementById(`kenshin-field-${field}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} style={{flex: 1, minHeight: '18px', borderBottom: i < rows.length - 1 ? '1px solid black' : 'none', fontSize: '10px', cursor: 'pointer', ...emptyBg(val)}}>
                                  <span className="text-slate-600" style={{width: '130px', flexShrink: 0}}>{label}</span>
                                  <span className="font-mono font-bold" style={{fontSize: '12px'}}>{val}</span>
                                  {(() => { const a = getBloodArrow(field, val, kenshinData.kGender); return a ? <span className={`font-black ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`} style={{fontSize: '15px'}}>{a}</span> : null; })()}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                      </div>
                    </div>
                  </div>

                  {/* 右列 */}
                  <div className="flex flex-col" style={{flex: 1}}>

                    {/* 血液検査（腎機能） */}
                    <div className="flex" style={{borderBottom: '1px solid black', flex: 3}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '20px', borderRight: '1px solid black', writingMode: 'vertical-rl', textOrientation: 'upright', fontSize: '11px', letterSpacing: '2px', padding: '4px 2px'}}>血液検査</div>
                      <div className="flex flex-col flex-1">
                        <div className="flex" style={{flex: 3}}>
                          <div className="bg-slate-50 flex items-center justify-center text-center" style={{width: '38px', borderRight: '1px solid black', fontSize: '10px', padding: '2px'}}>腎機能</div>
                          <div className="flex flex-col flex-1">
                            {[
                              { label: '尿酸(mg/dL)',           val: kenshinData.uricAcid, field: 'uricAcid' },
                              { label: '血清クレアチニン(mg/dL)', val: kenshinData.cre,      field: 'cre' },
                              { label: 'eGFR',                  val: kenshinData.egfr,     field: 'egfr' },
                            ].map(({ label, val, field }, i, arr) => (
                              <div key={label} className="flex items-center gap-1 px-1" onClick={() => { setHighlightedField(field); const el = document.getElementById(`kenshin-field-${field}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} style={{flex: 1, minHeight: '18px', borderBottom: i < arr.length - 1 ? '1px solid black' : 'none', fontSize: '10px', cursor: 'pointer', ...emptyBg(val)}}>
                                <span className="text-slate-600" style={{width: '130px', flexShrink: 0}}>{label}</span>
                                <span className="font-mono font-bold" style={{fontSize: '12px'}}>{val}</span>
                                {(() => { const a = getBloodArrow(field, val, kenshinData.kGender); return a ? <span className={`font-black ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`} style={{fontSize: '15px'}}>{a}</span> : null; })()}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 胸部X-P */}
                    <div className="flex" style={{borderBottom: '1px solid black', flex: 2, minHeight: '20px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px'}}>胸部X-P</div>
                      <div className="flex-1 flex flex-col justify-start p-1" style={{fontSize: '11px', ...emptyBg(kenshinData.xRayResult || kenshinData.xRayDate || kenshinData.xRayCategory)}}>
                        {[kenshinData.xRayDate ? `${toWareki(kenshinData.xRayDate)}撮影` : '', kenshinData.xRayCategory].filter(Boolean).join('　') && (
                          <div className="text-black" style={{fontSize: '10px'}}>
                            {[kenshinData.xRayDate ? `${toWareki(kenshinData.xRayDate)}撮影` : '', kenshinData.xRayCategory].filter(Boolean).join('　')}
                          </div>
                        )}
                        <div>{kenshinData.xRayResult}</div>
                      </div>
                    </div>

                    {/* 心電図 */}
                    <div className="flex" style={{borderBottom: '1px solid black', flex: 1, minHeight: '20px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px'}}>心電図</div>
                      <div className="flex-1 flex items-center px-2" style={{fontSize: '11px', ...emptyBg(kenshinData.ecgResult)}}>{kenshinData.ecgResult}</div>
                    </div>

                    {/* 胃内視鏡 */}
                    <div className="flex" style={{borderBottom: '1px solid black', flex: 1, minHeight: '20px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '10px'}}>胃内視鏡</div>
                      <div className="flex-1 flex items-center px-2" style={{fontSize: '11px', ...emptyBg(kenshinData.endoscopyResult)}}>{kenshinData.endoscopyResult}</div>
                    </div>

                    {/* 腹部エコー */}
                    <div className="flex" style={{borderBottom: '1px solid black', flex: 1, minHeight: '20px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '10px'}}>腹部エコー</div>
                      <div className="flex-1 flex items-center px-2" style={{fontSize: '11px', ...emptyBg(kenshinData.echoResult)}}>{kenshinData.echoResult}</div>
                    </div>

                    {/* マンガン */}
                    <div className="flex" style={{borderBottom: '1px solid black', flex: 1, minHeight: '20px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px'}}>マンガン</div>
                      <div className="flex-1 flex items-center px-2" style={{fontSize: '11px', ...emptyBg(kenshinData.manganeseResult)}}>{kenshinData.manganeseResult}</div>
                    </div>

                    {/* 尿検査 */}
                    <div className="flex" style={{borderBottom: '1px solid black', flex: 4}}>
                      <div className="bg-slate-50 flex items-center justify-center text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '10px', padding: '2px'}}>尿検査</div>
                      <div className="flex flex-col flex-1">
                        {[
                          { label: '糖',             val: kenshinData.urineGlucose,       field: 'urineGlucose' },
                          { label: '蛋白',           val: kenshinData.urineProtein,        field: 'urineProtein' },
                          { label: 'ウロビリノーゲン', val: kenshinData.urineUrobilinogen,  field: 'urineUrobilinogen' },
                          { label: '潜血',           val: kenshinData.urineOccultBlood,   field: 'urineOccultBlood' },
                        ].map(({ label, val, field }, i, arr) => (
                          <div key={label} className="flex items-center gap-1 px-1" onClick={() => { setHighlightedField(field); const el = document.getElementById(`kenshin-field-${field}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} style={{flex: 1, minHeight: '18px', borderBottom: i < arr.length - 1 ? '1px solid black' : 'none', fontSize: '10px', cursor: 'pointer', ...emptyBg(val)}}>
                            <span className="text-slate-600" style={{width: '130px', flexShrink: 0}}>{label}</span>
                            <span className="font-mono font-bold" style={{fontSize: '12px'}}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 診察所見 */}
                    <div className="flex" style={{borderBottom: '1px solid black', flex: 2.5, minHeight: '22px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px'}}>診察所見</div>
                      <div className="flex-1 p-2 whitespace-pre-wrap" style={{fontSize: '11px', ...emptyBg(kenshinData.doctorFindings)}}>{kenshinData.doctorFindings}</div>
                    </div>

                    {/* 総合所見 */}
                    <div className="flex" style={{flex: 2.5}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px'}}>総合所見</div>
                      <div className="flex-1 p-2 whitespace-pre-wrap" style={{fontSize: '11px', ...emptyBg(kenshinData.overallFindings)}}>{kenshinData.overallFindings}</div>
                    </div>

                  </div>
                </div>

                {/* フッター */}
                <div className="mt-4 flex justify-end" style={{paddingRight: '10mm'}}>
                  <div className="space-y-1" style={{fontSize: '12px'}}>
                    <div>上記のとおり診断します</div>
                    {kenshinData.issueDate && <div>{toWareki(kenshinData.issueDate)}</div>}
                    <div className="mt-2">鹿児島県志布志市志布志町志布志286-4</div>
                    <div>医療法人一斉会　陽春堂内科診療所</div>
                    <div>医師　{kenshinData.doctorName === 'その他' ? kenshinData.doctorNameCustom : kenshinData.doctorName}　　㊞</div>
                  </div>
                </div>


              </div>

              {/* ===== 別紙（健康診断書に記載されていない追加検査項目） ===== */}
              {(() => {
                const hasBessiData = [
                  kenshinData.tp, kenshinData.alb, kenshinData.agRatio, kenshinData.tBil, kenshinData.dBil,
                  kenshinData.alp, kenshinData.ldh, kenshinData.ck, kenshinData.amy,
                  kenshinData.tCho, kenshinData.lhRatio,
                  kenshinData.un,
                  kenshinData.na, kenshinData.k, kenshinData.cl, kenshinData.ca, kenshinData.ip, kenshinData.mgElec, kenshinData.fe,
                  kenshinData.crp, kenshinData.rf, kenshinData.aso,
                  kenshinData.cea, kenshinData.ca199, kenshinData.psaValue, kenshinData.bnp,
                  kenshinData.hbsAg, kenshinData.hbsAb, kenshinData.hcvAb, kenshinData.syphilisSTS, kenshinData.mrsaStaph,
                  kenshinData.urineBilirubin, kenshinData.urineSpecificGravity, kenshinData.urinePh, kenshinData.urineKetone,
                  kenshinData.stoolOccult, kenshinData.norovirus, kenshinData.bacteria3, kenshinData.bacteria5, kenshinData.paratyphoid,
                  kenshinData.methanol, kenshinData.normalHexane, kenshinData.methylHippuric,
                  kenshinData.otherExams,
                ].some(Boolean);
                if (!hasBessiData) return null;
                return (
              <div className="bessi-page-break bg-white text-black" style={{padding: '8mm 12mm', fontSize: '11px', width: '180mm', minHeight: '297mm', borderTop: '2px dashed #ccc', marginTop: '8mm'}}>

                {/* 別紙タイトル */}
                <div className="text-center font-bold text-[16px] mb-3 border-b-2 border-black pb-2 tracking-widest">別　　紙</div>
                <div className="text-center text-[11px] mb-4">（健康診断結果　追加検査項目）</div>

                {/* 患者情報ヘッダー */}
                <div className="flex gap-6 mb-4 text-[11px] border border-black rounded p-2">
                  <span><span className="font-bold">氏名：</span>{kenshinData.kName || kenshinData.kYurigana ? `${kenshinData.kName}（${kenshinData.kYurigana}）` : '　　　　　　'}</span>
                  <span><span className="font-bold">生年月日：</span>{kenshinData.kBirthDate ? toWareki(kenshinData.kBirthDate) : '　　　　　'}</span>
                  <span><span className="font-bold">性別：</span>{kenshinData.kGender || '　　'}</span>
                  <span><span className="font-bold">健診日：</span>{kenshinData.kDate ? kenshinData.kDate.replace(/-/g, '/') : '　　　　　'}</span>
                </div>

                {/* 追加検査結果テーブル */}
                <div className="border border-black" style={{borderCollapse: 'collapse'}}>

                  {/* 総蛋白・ビリルビン */}
                  {[kenshinData.tp, kenshinData.alb, kenshinData.agRatio, kenshinData.tBil, kenshinData.dBil].some(Boolean) && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>総蛋白・Bil</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 flex-1" style={{fontSize: '12px'}}>
                        {[['TP', kenshinData.tp, 'g/dL'], ['Alb', kenshinData.alb, 'g/dL'], ['A/G比', kenshinData.agRatio, ''], ['T-Bil', kenshinData.tBil, 'mg/dL'], ['D-Bil', kenshinData.dBil, 'mg/dL']].map(([k, v, u]) => v ? <span key={k}><b>{k}</b>: {v}{u ? ' '+u : ''}</span> : null)}
                      </div>
                    </div>
                  )}

                  {/* 肝機能・酵素（GOT/GPT/γ-GTPは1ページ目に掲載のため除外） */}
                  {[kenshinData.alp, kenshinData.ldh, kenshinData.ck, kenshinData.amy].some(Boolean) && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>肝機能・酵素</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 flex-1" style={{fontSize: '12px'}}>
                        {[['ALP', kenshinData.alp, 'alp'], ['LDH', kenshinData.ldh, 'ldh'], ['CK', kenshinData.ck, 'ck'], ['Amy', kenshinData.amy, 'amy']].map(([k, v, f]) => v ? <span key={k}><b>{k}</b>: {v}{(() => { const a = getBloodArrow(f, v, kenshinData.kGender); return a ? <span className={`text-base font-black ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()} IU/L</span> : null)}
                      </div>
                    </div>
                  )}

                  {/* 脂質（HDL/LDL/TGは1ページ目に掲載のため除外） */}
                  {[kenshinData.tCho, kenshinData.lhRatio].some(Boolean) && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>脂質</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 flex-1" style={{fontSize: '12px'}}>
                        {[['T-Cho', kenshinData.tCho, 'mg/dL', 'tCho'], ['L/H比', kenshinData.lhRatio, '', 'lhRatio']].map(([k, v, u, f]) => v ? <span key={k}><b>{k}</b>: {v}{(() => { const a = getBloodArrow(f, v, kenshinData.kGender); return a ? <span className={`text-base font-black ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()}{u ? ' '+u : ''}</span> : null)}
                      </div>
                    </div>
                  )}

                  {/* 腎機能（尿酸/Cre/eGFRは1ページ目に掲載のため除外） */}
                  {kenshinData.un && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>腎機能</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 flex-1" style={{fontSize: '12px'}}>
                        <span><b>UN</b>: {kenshinData.un}{(() => { const a = getBloodArrow('un', kenshinData.un, kenshinData.kGender); return a ? <span className={`text-base font-black ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()} mg/dL</span>
                      </div>
                    </div>
                  )}

                  {/* 電解質 */}
                  {[kenshinData.na, kenshinData.k, kenshinData.cl, kenshinData.ca, kenshinData.ip, kenshinData.mgElec, kenshinData.fe].some(Boolean) && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>電解質</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 flex-1" style={{fontSize: '12px'}}>
                        {[['Na', kenshinData.na, 'mEq/L', 'na'], ['K', kenshinData.k, 'mEq/L', 'k'], ['Cl', kenshinData.cl, 'mEq/L', 'cl'], ['Ca', kenshinData.ca, 'mg/dL', 'ca'], ['IP', kenshinData.ip, 'mg/dL', 'ip'], ['Mg', kenshinData.mgElec, 'mg/dL', 'mgElec'], ['Fe', kenshinData.fe, 'μg/dL', 'fe']].map(([k, v, u, f]) => v ? <span key={k}><b>{k}</b>: {v}{(() => { const a = getBloodArrow(f, v, kenshinData.kGender); return a ? <span className={`text-base font-black ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()} {u}</span> : null)}
                      </div>
                    </div>
                  )}

                  {/* 免疫（血糖/HbA1cは1ページ目に掲載のため除外） */}
                  {[kenshinData.crp, kenshinData.rf, kenshinData.aso].some(Boolean) && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>免疫</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 flex-1" style={{fontSize: '12px'}}>
                        {[['CRP', kenshinData.crp, 'mg/dL', 'crp'], ['RF', kenshinData.rf, 'IU/mL', 'rf'], ['ASO', kenshinData.aso, 'IU/mL', 'aso']].map(([k, v, u, f]) => v ? <span key={k}><b>{k}</b>: {v}{(() => { const a = getBloodArrow(f, v, kenshinData.kGender); return a ? <span className={`text-base font-black ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()} {u}</span> : null)}
                      </div>
                    </div>
                  )}

                  {/* 腫瘍マーカー */}
                  {[kenshinData.cea, kenshinData.ca199, kenshinData.psaValue, kenshinData.bnp].some(Boolean) && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>腫瘍マーカー</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 flex-1" style={{fontSize: '12px'}}>
                        {[['CEA', kenshinData.cea, 'ng/mL', 'cea'], ['CA19-9', kenshinData.ca199, 'U/mL', 'ca199'], ['PSA', kenshinData.psaValue, 'ng/mL', 'psaValue'], ['BNP', kenshinData.bnp, 'pg/mL', 'bnp']].map(([k, v, u, f]) => v ? <span key={k}><b>{k}</b>: {v}{(() => { const a = getBloodArrow(f, v, kenshinData.kGender); return a ? <span className={`text-base font-black ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()} {u}</span> : null)}
                      </div>
                    </div>
                  )}

                  {/* その他採血項目 */}
                  {[kenshinData.hbsAg, kenshinData.hbsAb, kenshinData.hcvAb, kenshinData.syphilisSTS, kenshinData.mrsaStaph].some(Boolean) && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>その他採血</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 flex-1" style={{fontSize: '12px'}}>
                        {[['HBs抗原', kenshinData.hbsAg], ['HBs抗体', kenshinData.hbsAb], ['HCV抗体', kenshinData.hcvAb], ['梅毒STS', kenshinData.syphilisSTS], ['MRSA黄色ブドウ球菌', kenshinData.mrsaStaph]].map(([k, v]) => v ? <span key={k}><b>{k}</b>: {v}</span> : null)}
                      </div>
                    </div>
                  )}

                  {/* 尿検査（追加項目）（潜血は1ページ目に掲載のため除外） */}
                  {[kenshinData.urineBilirubin, kenshinData.urineSpecificGravity, kenshinData.urinePh, kenshinData.urineKetone].some(Boolean) && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>尿検査（追加）</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 flex-1" style={{fontSize: '12px'}}>
                        {[['ビリルビン', kenshinData.urineBilirubin], ['比重', kenshinData.urineSpecificGravity], ['pH', kenshinData.urinePh], ['ケトン体', kenshinData.urineKetone]].map(([k, v]) => v ? <span key={k}><b>{k}</b>: {v}</span> : null)}
                      </div>
                    </div>
                  )}


                  {/* 検便 */}
                  {[kenshinData.stoolOccult, kenshinData.norovirus, kenshinData.bacteria3, kenshinData.bacteria5, kenshinData.paratyphoid].some(Boolean) && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>検便</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 flex-1" style={{fontSize: '12px'}}>
                        {[['便潜血2日法', kenshinData.stoolOccult], ['ノロウイルス', kenshinData.norovirus], ['3菌種', kenshinData.bacteria3], ['5菌種', kenshinData.bacteria5], ['パラチフス・腸チフス', kenshinData.paratyphoid]].map(([k, v]) => v ? <span key={k}><b>{k}</b>: {v}</span> : null)}
                      </div>
                    </div>
                  )}

                  {/* 有機溶剤 */}
                  {[kenshinData.methanol, kenshinData.normalHexane, kenshinData.methylHippuric].some(Boolean) && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>有機溶剤</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 flex-1" style={{fontSize: '12px'}}>
                        {[['メタノール', kenshinData.methanol], ['ノルマルヘキサン', kenshinData.normalHexane], ['メチル馬尿酸', kenshinData.methylHippuric]].map(([k, v]) => v ? <span key={k}><b>{k}</b>: {v}</span> : null)}
                      </div>
                    </div>
                  )}

                  {/* その他 */}
                  {kenshinData.otherExams && (
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="font-bold bg-slate-100 flex items-center justify-center" style={{width: '90px', borderRight: '1px solid black', padding: '3px 6px', fontSize: '10px'}}>その他</div>
                      <div className="p-2 flex-1 whitespace-pre-wrap" style={{fontSize: '10px'}}>{kenshinData.otherExams}</div>
                    </div>
                  )}

                </div>

                {/* 別紙フッター */}
                <div className="mt-4 text-right text-[10px] text-slate-500">
                  {kenshinData.issueDate ? toWareki(kenshinData.issueDate) : ''}　医療法人一斉会　陽春堂内科診療所　医師　{kenshinData.doctorName === 'その他' ? kenshinData.doctorNameCustom : kenshinData.doctorName}
                </div>

              </div>
                );
              })()}
    </>
  );
}
