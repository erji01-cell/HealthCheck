export const KURITAS_BLOOD_ITEMS = {
  regular: ['血液一般検査', 'AST(GOT)', 'ALT(GPT)', 'ALP', 'γ-GT(γGTP)', 'LDLコレステロール', '中性脂肪(TG)', 'HDLコレステロール', 'クレアチニン', '尿酸', '血糖', 'HbA1c'],
  specific: ['血液一般検査', 'AST(GOT)', 'ALT(GPT)', 'γ-GT(γGTP)', 'LDLコレステロール', '中性脂肪(TG)', 'HDLコレステロール', 'クレアチニン', '血糖'],
};

export const KURITAS_BLOOD_LABELS = {
  regular: '採血 クリタス 定期',
  specific: '採血 クリタス 特定',
};

export const KURITAS_PURPOSES = ['クリタス定期健診', 'クリタス特定業務'];

export const HAPILUS_PURPOSES = ['ハピルスA', 'ハピルスB', 'ハピルスC', 'ハピルス雇入時', 'ハピルス深夜業'];

// 第一生命：特定企業グループ（項目ロック・血圧2回）だが料金は通常計算・支払い区分選択
export const DAIICHI_PURPOSES = ['第一生命', '第一生命 採血も'];

export const HAPILUS_BLOOD_LABELS = {
  b: '採血 ハピルスB',
  c: '採血 ハピルスC',
  hire: '採血 ハピルス雇入時',
  night: '採血 ハピルス深夜業',
};

export const HAPILUS_BLOOD_ITEMS = {
  b: ['血液一般検査', 'AST(GOT)', 'ALT(GPT)', 'γ-GTP', 'HDLコレステロール', 'LDLコレステロール', '中性脂肪', '血糖', 'HbA1c'],
  c: ['血液一般検査', 'AST(GOT)', 'ALT(GPT)', 'γ-GTP', 'HDLコレステロール', 'LDLコレステロール', '中性脂肪', '血糖'],
  hire: ['血液一般検査', 'AST(GOT)', 'ALT(GPT)', 'γ-GTP', 'HDLコレステロール', 'LDLコレステロール', '中性脂肪', '血糖', 'HbA1c'],
  night: ['血液一般検査', 'AST(GOT)', 'ALT(GPT)', 'γ-GTP', 'HDLコレステロール', 'LDLコレステロール', '中性脂肪', '血糖', 'HbA1c'],
};

// 「特定企業」グループ（クリタス＋ハピルス＋第一生命）：項目ロック・血圧2回・UIグループ
// ※料金null・専用請求は getCompanyBillingLabel が非nullの目的（クリタス／ハピルス）のみ
export const SPECIAL_COMPANY_PURPOSES = [...KURITAS_PURPOSES, ...HAPILUS_PURPOSES, ...DAIICHI_PURPOSES];

// 請求ラベル（特定企業以外は null）
export const getCompanyBillingLabel = (purpose) => {
  if (KURITAS_PURPOSES.includes(purpose)) return '同友会請求';
  if (HAPILUS_PURPOSES.includes(purpose)) return 'ベネフィットワン請求';
  return null;
};

// 特定企業（クリタス＋ハピルス）の採血内訳を備考に出力するための定義
const COMPANY_BLOOD_NOTES = [
  { flag: 'bloodKuritasRegular', label: KURITAS_BLOOD_LABELS.regular, items: KURITAS_BLOOD_ITEMS.regular },
  { flag: 'bloodKuritasSpecific', label: KURITAS_BLOOD_LABELS.specific, items: KURITAS_BLOOD_ITEMS.specific },
  { flag: 'bloodHapilusB', label: HAPILUS_BLOOD_LABELS.b, items: HAPILUS_BLOOD_ITEMS.b },
  { flag: 'bloodHapilusC', label: HAPILUS_BLOOD_LABELS.c, items: HAPILUS_BLOOD_ITEMS.c },
  { flag: 'bloodHapilusHire', label: HAPILUS_BLOOD_LABELS.hire, items: HAPILUS_BLOOD_ITEMS.hire },
  { flag: 'bloodHapilusNight', label: HAPILUS_BLOOD_LABELS.night, items: HAPILUS_BLOOD_ITEMS.night },
];

const COMPANY_BLOOD_LABEL_LIST = COMPANY_BLOOD_NOTES.map(b => b.label);

export const stripKuritasBloodNotes = (text = '') =>
  text
    .split('\n')
    .filter(line => !COMPANY_BLOOD_LABEL_LIST.some(label => line.startsWith(`${label}：`)))
    .join('\n')
    .trim();

export const buildKuritasBloodNotes = (items = {}) =>
  COMPANY_BLOOD_NOTES
    .filter(b => items[b.flag])
    .map(b => `${b.label}：${b.items.join('、')}`);

// 祝日・休日リスト（2025〜2027）
export const HOLIDAYS = new Set([
  // 2025
  '2025-01-01','2025-01-13','2025-02-11','2025-02-23','2025-02-24',
  '2025-03-20','2025-04-29','2025-05-03','2025-05-04','2025-05-05','2025-05-06',
  '2025-07-21','2025-08-11','2025-09-15','2025-09-22','2025-09-23',
  '2025-10-13','2025-11-03','2025-11-23','2025-11-24',
  // 2026
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23',
  '2026-03-20','2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06',
  '2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23',
  '2026-10-12','2026-11-03','2026-11-23',
  // 2027
  '2027-01-01','2027-01-11','2027-02-11','2027-02-23',
  '2027-03-21','2027-04-29','2027-05-03','2027-05-04','2027-05-05',
  '2027-07-19','2027-08-11','2027-09-20','2027-09-23',
  '2027-10-11','2027-11-03','2027-11-23',
]);

// 料金計算（料金表に基づくパッケージ制）
export const calcFee = (items) => {
  const { xRay, ecg, blood } = items;
  const hasBlood = !!(blood || items.bloodKuritasRegular || items.bloodKuritasSpecific);

  const basic = !!(items.heightWeight || items.abdominalGirth || items.bloodPressure ||
                   items.vision || items.colorVision || items.hearing || items.urine ||
                   xRay || ecg || hasBlood);

  let base = 0;
  if (basic) {
    if (xRay && ecg && hasBlood) base = 10700;
    else if (xRay && hasBlood)   base = 9400;
    else if (ecg && hasBlood)    base = 9200;
    else if (xRay && ecg)     base = 5300;
    else if (hasBlood)        base = 7900;
    else if (xRay)            base = 4000;
    else if (ecg)             base = 3700;
    else                      base = 2400;
  }

  const hba1cFee     = items.hba1c    ? (hasBlood ?  490 : 2140) : 0;
  const psaFee       = items.psa      ? (hasBlood ? 2650 : 3050) : 0;
  const hbsAgFee     = items.hbsAg    ? (hasBlood ? 1730 : 2130) : 0;
  const hbsAbFee     = items.hbsAb    ? (hasBlood ? 1840 : 2240) : 0;
  const hcvAbFee     = items.hcvAb    ? (hasBlood ? 2460 : 2860) : 0;
  const syphilisFee  = items.syphilis ? (hasBlood ? 1780 : 2180) : 0;
  const mrsaFee      = items.mrsa     ? 3750 : 0;

  const endoscopyFee       = items.endoscopy   ? 13800 : 0;
  const echoFee            = items.echo        ?  5300 : 0;
  const mangFee            = items.manganese   ?   500 : 0;
  const stoolFee           = items.stool       ?  1500 : 0;
  const norovirusFee       = items.norovirus   ?  2800 : 0;
  const bacteria3Fee       = items.bacteria3   ?  2100 : 0;
  const bacteria5Fee       = items.bacteria5   ?  2300 : 0;
  const paratyphoidFee     = items.paratyphoid ?     0 : 0;
  const methanolFee        = items.methanol    ?  9200 : 0;
  const hexaneFee          = items.hexane      ?  4800 : 0;
  const methylHippuricFee  = items.methylHippuric ? 3500 : 0;

  return base + hba1cFee + psaFee + hbsAgFee + hbsAbFee + hcvAbFee + syphilisFee + mrsaFee
       + endoscopyFee + echoFee + mangFee + stoolFee + norovirusFee + bacteria3Fee + bacteria5Fee
       + paratyphoidFee + methanolFee + hexaneFee + methylHippuricFee;
};

export const getItemsForPurpose = (purpose, currentItems = {}) => {
  const allOff = (overrides = {}) =>
    Object.fromEntries(
      Object.keys(currentItems).map(k => [k, overrides[k] ?? false])
    );

  if (purpose === '特定健診(国保)') {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, urine: true, blood: true, ecg: true });
  } else if (purpose === '長寿健診') {
    return allOff({ heightWeight: true, bloodPressure: true, urine: true, blood: true, ecg: true });
  } else if (purpose === '特定健診(社保)') {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, urine: true, blood: true });
  } else if (purpose === '入園児') {
    return allOff({ heightWeight: true });
  } else if (purpose === 'クリタス定期健診') {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, vision: true, hearing: true, urine: true, xRay: true, ecg: true, bloodKuritasRegular: true, hba1c: true });
  } else if (purpose === 'クリタス特定業務') {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, vision: true, hearing: true, urine: true, ecg: true, bloodKuritasSpecific: true });
  } else if (purpose === 'ハピルスA') {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, vision: true, hearing: true, urine: true, xRay: true });
  } else if (purpose === 'ハピルスB') {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, vision: true, hearing: true, urine: true, xRay: true, ecg: true, bloodHapilusB: true });
  } else if (purpose === 'ハピルスC') {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, vision: true, hearing: true, urine: true, xRay: true, ecg: true, bloodHapilusC: true });
  } else if (purpose === 'ハピルス雇入時') {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, vision: true, hearing: true, urine: true, xRay: true, ecg: true, bloodHapilusHire: true });
  } else if (purpose === 'ハピルス深夜業') {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, vision: true, hearing: true, urine: true, ecg: true, bloodHapilusNight: true });
  } else if (purpose === '第一生命') {
    return allOff({ heightWeight: true, bloodPressure: true, urine: true });
  } else if (purpose === '第一生命 採血も') {
    return allOff({ heightWeight: true, bloodPressure: true, urine: true, blood: true });
  } else if (['就職', '進学', '企業健診'].includes(purpose)) {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, vision: true, hearing: true, urine: true, xRay: true, ecg: true, blood: true });
  } else if (purpose === 'その他') {
    return allOff();
  }

  return currentItems;
};
