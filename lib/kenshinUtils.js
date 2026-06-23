// 健診結果・日付関連の純粋ユーティリティ（HealthCheck.jsxから分離）

// 採血基準値テーブル（BML基準値）
export const BLOOD_REFERENCE_RANGES = {
  wbc:          { min: 3.5,   max: 9.7 },
  rbc:          { M: { min: 438, max: 577 }, F: { min: 376, max: 516 } },
  hemoglobin:   { M: { min: 13.6, max: 15.3 }, F: { min: 11.2, max: 15.2 } },
  ht:           { M: { min: 40.4, max: 51.9 }, F: { min: 34.3, max: 45.2 } },
  mcv:          { min: 83,    max: 101 },
  mch:          { M: { min: 28.2, max: 34.7 }, F: { min: 26.4, max: 34.3 } },
  mchc:         { M: { min: 31.8, max: 36.4 }, F: { min: 31.3, max: 36.1 } },
  platelet:     { min: 14.0,  max: 37.9 },
  tp:           { min: 6.5,   max: 8.2 },
  alb:          { min: 3.8,   max: 5.2 },
  agRatio:      { min: 1.2,   max: 2.2 },
  tBil:         { min: 0.3,   max: 1.2 },
  dBil:         { max: 0.4 },
  alp:          { min: 38,    max: 113 },
  ldh:          { min: 120,   max: 245 },
  got:          { min: 10,    max: 40 },
  gpt:          { min: 5,     max: 45 },
  gammaGtp:     { M: { max: 79 }, F: { max: 48 } },
  ck:           { M: { min: 50, max: 230 }, F: { min: 50, max: 210 } },
  amy:          { min: 39,    max: 134 },
  tCho:         { min: 150,   max: 219 },
  hdl:          { M: { min: 40, max: 80 }, F: { min: 40, max: 90 } },
  ldl:          { min: 70,    max: 139 },
  triglyceride: { min: 50,    max: 149 },
  lhRatio:      { max: 2.0 },
  un:           { min: 8.0,   max: 20.0 },
  cre:          { M: { min: 0.65, max: 1.09 }, F: { min: 0.46, max: 0.82 } },
  egfr:         { min: 60 },
  uricAcid:     { M: { min: 3.6, max: 7.0 }, F: { min: 2.7, max: 7.0 } },
  na:           { min: 135,   max: 145 },
  k:            { min: 3.5,   max: 5.0 },
  cl:           { min: 98,    max: 108 },
  ca:           { min: 8.6,   max: 10.2 },
  ip:           { min: 2.5,   max: 4.5 },
  mgElec:       { min: 1.7,   max: 2.6 },
  fe:           { M: { min: 60, max: 210 }, F: { min: 50, max: 170 } },
  crp:          { max: 0.30 },
  rf:           { max: 15 },
  aso:          { max: 240 },
  bloodGlucose: { min: 70,    max: 109 },
  hba1c:        { min: 4.6,   max: 6.2 },
  cea:          { max: 5.0 },
  ca199:        { max: 37.0 },
  psaValue:     { max: 4.0 },
  bnp:          { max: 18.4 },
};

// 基準値比較 → '↑' / '↓' / ''
export const getBloodArrow = (name, value, gender) => {
  const range = BLOOD_REFERENCE_RANGES[name];
  if (!range || value === '' || value == null) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  const g = gender === '男' ? 'M' : gender === '女' ? 'F' : null;
  let min, max;
  if (range.M !== undefined || range.F !== undefined) {
    const gr = (g && range[g]) ? range[g] : {};
    min = gr.min; max = gr.max;
  } else {
    min = range.min; max = range.max;
  }
  if (max !== undefined && num > max) return '↑';
  if (min !== undefined && num < min) return '↓';
  return '';
};

// 健康診断書専用データの初期状態（診断結果入力タブ → 健康診断書と連動）
export const kenshinInitialState = {
  // 患者情報
  kDate: '', kId: '', kName: '', kYurigana: '', kBirthDate: '', kAge: '', kGender: '', kContact: '', kCompanyName: '', kCompanyId: '',
  address: '',
  bpSys: '', bpDia: '', pulse: '',
  height: '', weight: '', bmi: '', waist: '',
  visionR: '', visionL: '', visionR2: '', visionL2: '',
  colorVision: '',
  hearingR: '', hearingL: '',
  hearing4000R: '', hearing4000L: '',
  medicalHistory: '',
  medBP: '', medBG: '', medLipid: '',
  smokingHistory: '', drinkingHistory: '',
  subjective: '',
  // 血算 (CBC)
  wbc: '', rbc: '', hemoglobin: '', ht: '', mcv: '', mch: '', mchc: '', platelet: '',
  // 生化学 - 蛋白・ビリルビン
  tp: '', alb: '', agRatio: '', tBil: '', dBil: '',
  // 生化学 - 肝機能・酵素
  alp: '', ldh: '', got: '', gpt: '', gammaGtp: '', ck: '', amy: '',
  // 脂質
  tCho: '', hdl: '', ldl: '', triglyceride: '', lhRatio: '',
  // 腎機能
  un: '', cre: '', egfr: '', uricAcid: '',
  // 電解質
  na: '', k: '', cl: '', ca: '', ip: '', mgElec: '', fe: '',
  // 免疫・糖尿病
  bloodGlucose: '', hba1c: '', crp: '', rf: '', aso: '',
  // 腫瘍マーカー
  cea: '', ca199: '', psaValue: '', bnp: '',
  // その他採血項目
  hbsAg: '', hbsAb: '', hcvAb: '', syphilisSTS: '', mrsaStaph: '',
  // その他検査項目
  endoscopyResult: '', echoResult: '', manganeseResult: '',
  // 検便
  stoolOccult: '', norovirus: '', bacteria3: '', bacteria5: '', paratyphoid: '',
  // 有機溶剤
  methanol: '', normalHexane: '', methylHippuric: '',
  // その他
  otherExams: '',
  // 胸部X-P・心電図
  xRayDate: '', xRayCategory: '', xRayResult: '',
  ecgResult: '',
  // 尿検査
  urineGlucose: '', urineProtein: '', urineUrobilinogen: '',
  urineBilirubin: '', urineSpecificGravity: '', urinePh: '', urineKetone: '', urineOccultBlood: '',
  // 所見・発行日
  doctorFindings: '', overallFindings: '',
  doctorName: '',
  doctorNameCustom: '',
  issueDate: '',
};

// ISO日付("YYYY-MM-DD") → 曜日（タイムゾーン非依存・ローカル基準で算出）
export const WEEKDAY_NAMES = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
export const getWeekdayFromIso = (isoDate) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  return WEEKDAY_NAMES[new Date(y, m - 1, d).getDay()];
};

// ISO日付 → 和暦表示
export const toWareki = (isoDate) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  let eraName, eraYear;
  if (y >= 2019)      { eraName = '令和'; eraYear = y - 2018; }
  else if (y >= 1989) { eraName = '平成'; eraYear = y - 1988; }
  else if (y >= 1926) { eraName = '昭和'; eraYear = y - 1925; }
  else if (y >= 1912) { eraName = '大正'; eraYear = y - 1911; }
  else                { eraName = '明治'; eraYear = y - 1867; }
  return `${eraName}${eraYear}年${m}月${d}日`;
};

// ISO日付 → 和暦（西暦併記）表示
export const toWareikiWithWestern = (isoDate) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  let eraName, eraYear;
  if (y >= 2019)      { eraName = '令和'; eraYear = y - 2018; }
  else if (y >= 1989) { eraName = '平成'; eraYear = y - 1988; }
  else if (y >= 1926) { eraName = '昭和'; eraYear = y - 1925; }
  else if (y >= 1912) { eraName = '大正'; eraYear = y - 1911; }
  else                { eraName = '明治'; eraYear = y - 1867; }
  return `${eraName}${eraYear}年(${y}年)${m}月${d}日`;
};

// ISO日付 → 元号略記付き生年月日表示（例: S58(1983)年04月19日）
export const formatDobDisplay = (isoDate) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return '';
  let eraName, eraYear;
  if (year >= 2019)      { eraName = 'R'; eraYear = year - 2018; }
  else if (year >= 1989) { eraName = 'H'; eraYear = year - 1988; }
  else if (year >= 1926) { eraName = 'S'; eraYear = year - 1925; }
  else if (year >= 1912) { eraName = 'T'; eraYear = year - 1911; }
  else                   { eraName = 'M'; eraYear = year - 1867; }
  return `${eraName}${eraYear}(${year})年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日`;
};

// 生年月日の元号コードを返す
export const getBirthEra = (isoDate) => {
  if (!isoDate) return '';
  const y = parseInt(isoDate.split('-')[0]);
  if (y >= 2019) return 'R';
  if (y >= 1989) return 'H';
  if (y >= 1926) return 'S';
  if (y >= 1912) return 'T';
  return 'M';
};
