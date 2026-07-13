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

export const SONY_PURPOSE = 'ソニー生命';
export const SONY_CHEST_NOTE = 'ソニー生命：胸囲';

// 生命保険会社の保険審査（受託可）
export const INSURANCE_REVIEW_PURPOSES = [
  '住友生命',
  'FWD生命',
  '朝日生命',
  'PGF生命',
  'ソニー生命',
  '大樹生命',
  '東京海上あんしん',
  'アフラック',
  'SOMPOひまわり',
  'アクサ生命',
  'オリックス生命',
];

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

// 血圧測定を2回に固定する健診目的
export const BP_TWO_MEASURE_LOCKED_PURPOSES = [
  '特定健診(社保)',
  '特定健診(国保)',
  '長寿健診',
  '大樹生命',
  '東京海上あんしん',
  'PGF生命',
  'FWD生命',
  'アクサ生命',
  'SOMPOひまわり',
  SONY_PURPOSE,
  ...SPECIAL_COMPANY_PURPOSES,
];

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

// 祝日リストの整備済み最終日（この日が近づくと起動時に警告を表示。リスト追記時はここも更新すること）
export const HOLIDAYS_COVERAGE_END = '2027-12-31';

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

// 同友会（クリタス）料金計算
export const calcKuritasFee = (purpose, items) => {
  if (purpose === 'クリタス定期健診') {
    let fee = 8600 + 2100; // A一式 + 胸部レントゲン（自動チェック）
    if (items.endoscopy)  fee += 13000;
    if (items.stool)      fee += 1300;
    if (items.psa)        fee += 1400;
    return fee;
  }
  if (purpose === 'クリタス特定業務') return 8200;
  if (purpose === 'ハピルスA')      return 4000;
  if (purpose === 'ハピルスB')      return 11190;
  if (purpose === 'ハピルスC')      return 10700;
  if (purpose === 'ハピルス雇入時') return 11190;
  if (purpose === 'ハピルス深夜業') return 9690;
  return null;
};

// 料金計算（料金表に基づくパッケージ制）
export const calcFee = (items) => {
  const { xRay, ecg, blood } = items;
  const hasBlood = !!(blood || items.bloodKuritasRegular || items.bloodKuritasSpecific || items.bloodInsuranceReview);

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

export const ZERO_FEE_PURPOSES = ['特定健診(国保)', '長寿健診', '入園児'];

export const parseManualFee = (value) => {
  const cleaned = String(value ?? '').replace(/[^\d]/g, '');
  if (!cleaned) return 0;
  const num = Number.parseInt(cleaned, 10);
  return Number.isFinite(num) ? num : 0;
};

export const calculateReservationFee = ({ purpose = '', items = {}, shahoFee = '' } = {}) => {
  const fixedCompanyFee = calcKuritasFee(purpose, items);
  if (fixedCompanyFee !== null) return fixedCompanyFee;
  if (getCompanyBillingLabel(purpose)) return null;
  if (ZERO_FEE_PURPOSES.includes(purpose)) return 0;
  if (purpose === '特定健診(社保)') return parseManualFee(shahoFee);
  return calcFee(items);
};

export const getReservationPaymentType = (purpose, selectedPaymentType = '') =>
  getCompanyBillingLabel(purpose) || selectedPaymentType;

export const formatYenAmount = (fee) => {
  if (fee == null || fee === '') return '';
  const num = Number(fee);
  return Number.isFinite(num) ? `¥${num.toLocaleString()}` : '';
};

const rowFlag = (row, ...keys) => keys.some(key => !!row?.[key]);

export const buildReservationItemsFromRow = (row = {}) => ({
  heightWeight: rowFlag(row, 'item_height_weight'),
  abdominalGirth: rowFlag(row, 'item_abdominal_girth'),
  bloodPressure: rowFlag(row, 'item_blood_pressure'),
  vision: rowFlag(row, 'item_vision'),
  colorVision: rowFlag(row, 'item_color_vision'),
  pulse: rowFlag(row, 'item_pulse'),
  hearing: rowFlag(row, 'item_hearing'),
  urine: rowFlag(row, 'item_urine'),
  xRay: rowFlag(row, 'item_x_ray', 'item_xray'),
  ecg: rowFlag(row, 'item_ecg'),
  blood: rowFlag(row, 'item_blood'),
  bloodKuritasRegular: rowFlag(row, 'item_blood_kuritas_regular'),
  bloodKuritasSpecific: rowFlag(row, 'item_blood_kuritas_specific'),
  bloodHapilusB: rowFlag(row, 'item_blood_hapilus_b'),
  bloodHapilusC: rowFlag(row, 'item_blood_hapilus_c'),
  bloodHapilusHire: rowFlag(row, 'item_blood_hapilus_hire'),
  bloodHapilusNight: rowFlag(row, 'item_blood_hapilus_night'),
  bloodInsuranceReview: rowFlag(row, 'item_blood_insurance_review'),
  hba1c: rowFlag(row, 'item_hba1c'),
  endoscopy: rowFlag(row, 'item_endoscopy'),
  echo: rowFlag(row, 'item_echo'),
  manganese: rowFlag(row, 'item_manganese'),
  cotinine: rowFlag(row, 'item_cotinine'),
  stool: rowFlag(row, 'item_stool'),
  norovirus: rowFlag(row, 'item_norovirus'),
  bacteria3: rowFlag(row, 'item_bacteria3'),
  bacteria5: rowFlag(row, 'item_bacteria5'),
  paratyphoid: rowFlag(row, 'item_paratyphoid'),
  methanol: rowFlag(row, 'item_methanol'),
  hexane: rowFlag(row, 'item_hexane'),
  methylHippuric: rowFlag(row, 'item_methyl_hippuric'),
  psa: rowFlag(row, 'item_psa'),
  hbsAg: rowFlag(row, 'item_hbs_ag'),
  hbsAb: rowFlag(row, 'item_hbs_ab'),
  hcvAb: rowFlag(row, 'item_hcv_ab'),
  syphilis: rowFlag(row, 'item_syphilis'),
  mrsa: rowFlag(row, 'item_mrsa'),
});

export const getReservationFeeValue = (reservation = {}, options = {}) => {
  if (reservation.fee !== null && reservation.fee !== undefined && reservation.fee !== '') {
    const savedFee = Number(reservation.fee);
    if (Number.isFinite(savedFee)) return savedFee;
  }
  return calculateReservationFee({
    purpose: reservation.purpose,
    items: buildReservationItemsFromRow(reservation),
    shahoFee: options.shahoFee,
  });
};

export const getReservationBillingText = (reservation = {}, options = {}) => {
  const billingLabel = getCompanyBillingLabel(reservation.purpose);
  const feeText = formatYenAmount(getReservationFeeValue(reservation, options));
  if (billingLabel) return [billingLabel, feeText].filter(Boolean).join(' ');
  return [feeText, reservation.payment_type].filter(Boolean).join(' ');
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
  } else if (purpose === '大樹生命') {
    return allOff({ heightWeight: true, bloodPressure: true, pulse: true, urine: true });
  } else if (purpose === '東京海上あんしん') {
    return allOff({ heightWeight: true, bloodPressure: true, pulse: true, urine: true });
  } else if (purpose === 'PGF生命') {
    return allOff({ heightWeight: true, bloodPressure: true, pulse: true, urine: true });
  } else if (purpose === 'FWD生命') {
    return allOff({ heightWeight: true, bloodPressure: true, pulse: true, urine: true });
  } else if (purpose === 'アクサ生命') {
    return allOff({ heightWeight: true, bloodPressure: true, pulse: true, urine: true });
  } else if (purpose === 'SOMPOひまわり') {
    return allOff({ heightWeight: true, bloodPressure: true, pulse: true, urine: true });
  } else if (purpose === SONY_PURPOSE) {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, pulse: true, urine: true });
  } else if (INSURANCE_REVIEW_PURPOSES.includes(purpose)) {
    return allOff();
  } else if (['就職', '進学', '企業健診'].includes(purpose)) {
    return allOff({ heightWeight: true, abdominalGirth: true, bloodPressure: true, vision: true, hearing: true, urine: true, xRay: true, ecg: true, blood: true });
  } else if (purpose === 'その他') {
    return allOff();
  }

  return currentItems;
};
