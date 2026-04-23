import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Printer, Save, Calendar, User, Phone, ClipboardCheck,
  CreditCard, PlusCircle, RotateCcw, ChevronLeft, ChevronRight,
  ListTodo, Info, Search, LogIn, LogOut
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

// 祝日・休日リスト（2025〜2027）
const HOLIDAYS = new Set([
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

// 健康診断書専用データの初期状態（診断結果入力タブ → 健康診断書と連動）
const kenshinInitialState = {
  address: '',
  bpSys: '', bpDia: '',
  height: '', weight: '', bmi: '', waist: '',
  visionR: '', visionL: '', visionR2: '', visionL2: '',
  colorVision: '',
  hearingR: '', hearingL: '',
  medicalHistory: '',
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
  // 胸部X-P・心電図
  xRayDate: '', xRayResult: '',
  ecgResult: '',
  // 尿検査
  urineGlucose: '', urineProtein: '', urineUrobilinogen: '',
  urineBilirubin: '', urineSpecificGravity: '', urinePh: '', urineKetone: '', urineOccultBlood: '',
  // 所見・発行日
  doctorFindings: '', overallFindings: '',
  issueDate: '',
};

// ISO日付 → 和暦表示
const toWareki = (isoDate) => {
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

// 生年月日の元号コードを返す
const getBirthEra = (isoDate) => {
  if (!isoDate) return '';
  const y = parseInt(isoDate.split('-')[0]);
  if (y >= 2019) return 'R';
  if (y >= 1989) return 'H';
  if (y >= 1926) return 'S';
  if (y >= 1912) return 'T';
  return 'M';
};

export default function App() {
  // 認証状態
  const [session, setSession] = useState(null);
  const [shahoFee, setShahoFee] = useState('');
  const [loginEmail, setLoginEmail] = useState(() => localStorage.getItem('rememberedEmail') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(() => !!localStorage.getItem('rememberedEmail'));

  // カレンダーの表示月管理（右側カレンダー用）
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 患者検索
  const [patientQuery, setPatientQuery] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [patientSearching, setPatientSearching] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState('');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [modalStep, setModalStep] = useState('search'); // 'search' | 'reservations'
  const [selectedPatientForModal, setSelectedPatientForModal] = useState(null);
  const [patientReservations, setPatientReservations] = useState([]);
  const [patientReservLoading, setPatientReservLoading] = useState(false);
  const [modalQuery, setModalQuery] = useState('');
  const [modalSuggestions, setModalSuggestions] = useState([]);
  const [modalSearching, setModalSearching] = useState(false);
  const searchRef = useRef(null);
  const currentMonthRef = useRef(null);
  const modalSearchRef = useRef(null);

  // 初期状態の定義
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

  const initialState = {
    date: tomorrowStr,
    dayOfWeek: days[tomorrow.getDay()],
    yurigana: '',
    id: '',
    name: '',
    birthDate: '',
    age: '',
    gender: '',
    contact: '',
    companyName: '',
    purpose: '就職',
    hasHospitalForm: '無(当院用紙を使用)',
    items: {
      basic: true,
      xRay: true,
      ecg: true,
      blood: true,
      hba1c: false,
      endoscopy: false,
      echo: false,
      manganese: false,
      stool: false,
      norovirus: false,
      bacteria3: false,
      bacteria5: false,
      paratyphoid: false,
      methanol: false,
      hexane: false,
      methylHippuric: false,
      psa: false,
      hbsAg: false,
      hbsAb: false,
      hcvAb: false,
      syphilis: false,
      mrsa: false
    },
    deadlineType: '無',
    deadlineDate: '',
    hasDedicatedForm: false,
    payment: '',
    paymentType: '当日支払',
    medicalHistory: '',
    findings: '',
    others: '',
    bp1Sys: '', bp1Dia: '',
    bp2Sys: '', bp2Dia: '',
    pulse: '',
    height: '', weight: '', bmi: '', waist: '', chest: '',
    visionR: '', visionL: '', visionR2: '', visionL2: '',
    hearingR: '', hearingL: '', hearingR2: '', hearingL2: '',
    colorVision: ''
  };

  const [formData, setFormData] = useState(initialState);
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'saving' | 'saved' | 'error'
  const [editingReservationId, setEditingReservationId] = useState(null);
  const [rightTab, setRightTab] = useState('calendar'); // 'preview' | 'calendar'
  const [calendarData, setCalendarData] = useState({}); // { 'YYYY-MM-DD': [reservations] }
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null });
  const [leftTab, setLeftTab] = useState('reservation'); // 'reservation' | 'result'
  const [kenshinData, setKenshinData] = useState(kenshinInitialState);

  // 1年以上前の予約データを自動削除
  const deleteOldReservations = async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffDate = oneYearAgo.toISOString().split('T')[0];
    await supabase.from('health_reserv').delete().lt('date', cutoffDate);
  };

  // セッション監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        deleteOldReservations();
        fetchCalendarData();
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        deleteOldReservations();
        fetchCalendarData();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 30分ごとに軽いクエリを発行してSupabaseを起こし続ける
  useEffect(() => {
    const keepAlive = setInterval(async () => {
      await supabase.from('health_reserv').select('date').limit(1);
    }, 30 * 60 * 1000);
    return () => clearInterval(keepAlive);
  }, []);

  // 生年月日と健診希望日から年齢を計算
  useEffect(() => {
    if (formData.birthDate && formData.date) {
      const birth = new Date(formData.birthDate);
      const target = new Date(formData.date);
      let age = target.getFullYear() - birth.getFullYear();
      const m = target.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && target.getDate() < birth.getDate())) age--;
      setFormData(prev => ({ ...prev, age: age >= 0 ? age : '' }));
    } else {
      setFormData(prev => ({ ...prev, age: '' }));
    }
  }, [formData.birthDate, formData.date]);

  // 曜日計算
  useEffect(() => {
    if (formData.date) {
      const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
      const day = days[new Date(formData.date).getDay()];
      setFormData(prev => ({ ...prev, dayOfWeek: day }));
    }
  }, [formData.date]);

  // 料金計算（料金表に基づくパッケージ制）
  const calcFee = (items) => {
    const { basic, xRay, ecg, blood, stool, endoscopy } = items;

    // メインパッケージ（基本+組み合わせ）
    let base = 0;
    if (basic) {
      if (xRay && blood)   base = 9400;
      else if (blood)      base = 7900;
      else if (xRay)       base = 4000;
      else                 base = 2400;
    } else {
      if (xRay)  base += 2100;
      if (blood) base += 5500;
    }

    const ecgFee        = ecg                  ?  1300 : 0;
    const hba1cFee      = items.hba1c         ?   490 : 0;
    const endoscopyFee  = endoscopy            ? 13800 : 0;
    const echoFee       = items.echo           ?  5300 : 0;
    const mangFee       = items.manganese      ?   500 : 0;
    const stoolFee      = items.stool          ?  1500 : 0;
    const norovirusFee  = items.norovirus      ?  2800 : 0;
    const bacteria3Fee  = items.bacteria3      ?  2100 : 0;
    const bacteria5Fee  = items.bacteria5      ?  2300 : 0;
    const paratyphoidFee   = items.paratyphoid    ?    0 : 0;
    const methanolFee      = items.methanol       ? 9200 : 0;
    const hexaneFee        = items.hexane         ? 4800 : 0;
    const methylHippuricFee = items.methylHippuric ? 3500 : 0;
    const psaFee       = items.psa      ? 2650 : 0;
    const hbsAgFee     = items.hbsAg   ? 1730 : 0;
    const hbsAbFee     = items.hbsAb   ? 1840 : 0;
    const hcvAbFee     = items.hcvAb   ? 2460 : 0;
    const syphilisFee  = items.syphilis ? 1780 : 0;
    const mrsaFee      = items.mrsa     ? 3750 : 0;
    const otherBloodItems = [items.psa, items.hbsAg, items.hbsAb, items.hcvAb, items.syphilis];
    const bloodBaseFee = !blood && otherBloodItems.some(Boolean) ? 400 : 0;
    return base + ecgFee + hba1cFee + endoscopyFee + echoFee + mangFee + stoolFee + norovirusFee + bacteria3Fee + bacteria5Fee + paratyphoidFee + methanolFee + hexaneFee + methylHippuricFee + psaFee + hbsAgFee + hbsAbFee + hcvAbFee + syphilisFee + mrsaFee + bloodBaseFee;
  };

  // カレンダーデータ取得
  const fetchCalendarData = async () => {
    setCalendarLoading(true);
    const today = new Date();
    const start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const end = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate()).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('health_reserv')
      .select('id, date, patient_name, patient_name_kana, patient_gender, birth_date, age, purpose, payment_type, fee, item_basic, item_x_ray, item_ecg, item_blood, item_hba1c, item_endoscopy, item_echo, item_manganese, item_stool, item_norovirus, item_bacteria3, item_bacteria5, item_paratyphoid, item_methanol, item_hexane, item_methyl_hippuric, item_psa, item_hbs_ag, item_hbs_ab, item_hcv_ab, item_syphilis, item_mrsa, deadline_type, deadline_date, has_dedicated_form')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });
    if (!error && data) {
      const grouped = {};
      data.forEach(r => {
        if (!grouped[r.date]) grouped[r.date] = [];
        grouped[r.date].push(r);
      });
      setCalendarData(grouped);
    }
    setCalendarLoading(false);
  };

  // 実際の保存処理
  const performSave = async () => {
    setSaveStatus('saving');
    const { items } = formData;
    const zeroPurposes = ['特定健診(国保)', '長寿健診', '入園児'];
    let fee = null;
    if (zeroPurposes.includes(formData.purpose)) fee = 0;
    else if (formData.purpose === '特定健診(社保)') fee = parseInt(shahoFee || 0);
    else fee = calcFee(items);

    const record = {
      date: formData.date || null,
      day_of_week: formData.dayOfWeek,
      patient_id: formData.id,
      patient_name: formData.name,
      patient_name_kana: formData.yurigana,
      patient_gender: formData.gender,
      birth_date: formData.birthDate ? formData.birthDate.replace(/-/g, '') : null,
      age: formData.age,
      contact: formData.contact,
      company_name: formData.companyName,
      purpose: formData.purpose,
      item_basic: items.basic,
      item_x_ray: items.xRay,
      item_ecg: items.ecg,
      item_blood: items.blood,
      item_hba1c: items.hba1c,
      item_endoscopy: items.endoscopy,
      item_echo: items.echo,
      item_manganese: items.manganese,
      item_stool: items.stool,
      item_norovirus: items.norovirus,
      item_bacteria3: items.bacteria3,
      item_bacteria5: items.bacteria5,
      item_paratyphoid: items.paratyphoid,
      item_methanol: items.methanol,
      item_hexane: items.hexane,
      item_methyl_hippuric: items.methylHippuric,
      item_psa: items.psa,
      item_hbs_ag: items.hbsAg,
      item_hbs_ab: items.hbsAb,
      item_hcv_ab: items.hcvAb,
      item_syphilis: items.syphilis,
      item_mrsa: items.mrsa,
      deadline_type: formData.deadlineType,
      deadline_date: formData.deadlineType === '有' && formData.deadlineDate ? formData.deadlineDate : null,
      has_dedicated_form: formData.hasDedicatedForm,
      payment_type: formData.paymentType,
      fee: fee,
      bp1_sys: formData.bp1Sys, bp1_dia: formData.bp1Dia,
      bp2_sys: formData.bp2Sys, bp2_dia: formData.bp2Dia,
      pulse: formData.pulse,
      height: formData.height, weight: formData.weight, bmi: formData.bmi, waist: formData.waist,
      vision_r: formData.visionR, vision_l: formData.visionL,
      vision_r2: formData.visionR2, vision_l2: formData.visionL2,
      hearing_r: formData.hearingR, hearing_l: formData.hearingL,
      hearing_r2: formData.hearingR2, hearing_l2: formData.hearingL2,
      color_vision: formData.colorVision,
      user_id: session?.user?.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingReservationId
      ? await supabase.from('health_reserv').update(record).eq('id', editingReservationId)
      : await supabase.from('health_reserv').insert(record);
    if (error) {
      console.error(error);
      setSaveStatus('error');
    } else {
      setSaveStatus('saved');
      if (editingReservationId) setEditingReservationId(null);
      await fetchCalendarData();
      // patients テーブルへの自動同期（患者IDがある場合のみ）
      if (formData.id) {
        const { data: existing } = await supabase
          .from('patients')
          .select('patient_id')
          .eq('patient_id', formData.id)
          .limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from('patients').insert({
            patient_id: formData.id,
            patient_name: formData.name || '',
            patient_name_kana: formData.yurigana || '',
            patient_dob: formData.birthDate ? formData.birthDate.replace(/-/g, '') : '',
            zipcode: '',
            address: '',
            phone_number: formData.contact || '',
          });
        }
      }
    }
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // 予約データ保存
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('氏名を入力してください。');
      return;
    }
    if (!editingReservationId && formData.id && formData.date) {
      const { data: existing } = await supabase
        .from('health_reserv')
        .select('id')
        .eq('date', formData.date)
        .eq('patient_id', formData.id)
        .limit(1);
      if (existing && existing.length > 0) {
        setConfirmDialog({
          show: true,
          message: `${formData.date} にはすでに患者ID（${formData.id}）${formData.name}の予約が登録されています。\n更新してよろしいですか？`,
          onConfirm: async () => {
            setConfirmDialog({ show: false, message: '', onConfirm: null });
            // 既存予約を削除してから新規保存
            await supabase.from('health_reserv').delete().eq('id', existing[0].id);
            await performSave();
          }
        });
        return;
      }
    }
    await performSave();
  };

  // 健診目的に応じた検査項目の自動チェック
  useEffect(() => {
    const allOff = (overrides = {}) =>
      Object.fromEntries(
        Object.keys(formData.items).map(k => [k, overrides[k] ?? false])
      );
    if (['特定健診(国保)', '長寿健診'].includes(formData.purpose)) {
      setFormData(prev => ({ ...prev, items: allOff({ basic: true, ecg: true, blood: true }) }));
    } else if (formData.purpose === '特定健診(社保)') {
      setFormData(prev => ({ ...prev, items: allOff({ basic: true, blood: true }) }));
    } else if (formData.purpose === '入園児') {
      setFormData(prev => ({ ...prev, items: allOff({ basic: true }) }));
    }
  }, [formData.purpose]);

  // BMI自動計算
  useEffect(() => {
    const h = parseFloat(formData.height);
    const w = parseFloat(formData.weight);
    if (h > 0 && w > 0) {
      const bmi = (w / ((h / 100) ** 2)).toFixed(1);
      setFormData(prev => ({ ...prev, bmi }));
    }
  }, [formData.height, formData.weight]);

  // ひらがな・全角カタカナ・半角カタカナ の相互変換バリアント生成
  const getKanaVariants = (input) => {
    // 半角カタカナ → 全角カタカナ（NFKC正規化）
    const normalized = input.normalize('NFKC');
    // 全角カタカナ → ひらがな
    const hira = normalized.replace(/[\u30A1-\u30F6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
    // ひらがな → 全角カタカナ
    const kata = hira.replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
    // 全角カタカナ → 半角カタカナ
    const z2h = {'ア':'ｱ','イ':'ｲ','ウ':'ｳ','エ':'ｴ','オ':'ｵ','カ':'ｶ','キ':'ｷ','ク':'ｸ','ケ':'ｹ','コ':'ｺ','サ':'ｻ','シ':'ｼ','ス':'ｽ','セ':'ｾ','ソ':'ｿ','タ':'ﾀ','チ':'ﾁ','ツ':'ﾂ','テ':'ﾃ','ト':'ﾄ','ナ':'ﾅ','ニ':'ﾆ','ヌ':'ﾇ','ネ':'ﾈ','ノ':'ﾉ','ハ':'ﾊ','ヒ':'ﾋ','フ':'ﾌ','ヘ':'ﾍ','ホ':'ﾎ','マ':'ﾏ','ミ':'ﾐ','ム':'ﾑ','メ':'ﾒ','モ':'ﾓ','ヤ':'ﾔ','ユ':'ﾕ','ヨ':'ﾖ','ラ':'ﾗ','リ':'ﾘ','ル':'ﾙ','レ':'ﾚ','ロ':'ﾛ','ワ':'ﾜ','ヲ':'ｦ','ン':'ﾝ','ァ':'ｧ','ィ':'ｨ','ゥ':'ｩ','ェ':'ｪ','ォ':'ｫ','ッ':'ｯ','ャ':'ｬ','ュ':'ｭ','ョ':'ｮ','ー':'ｰ','ガ':'ｶﾞ','ギ':'ｷﾞ','グ':'ｸﾞ','ゲ':'ｹﾞ','ゴ':'ｺﾞ','ザ':'ｻﾞ','ジ':'ｼﾞ','ズ':'ｽﾞ','ゼ':'ｾﾞ','ゾ':'ｿﾞ','ダ':'ﾀﾞ','ヂ':'ﾁﾞ','ヅ':'ﾂﾞ','デ':'ﾃﾞ','ド':'ﾄﾞ','バ':'ﾊﾞ','ビ':'ﾋﾞ','ブ':'ﾌﾞ','ベ':'ﾍﾞ','ボ':'ﾎﾞ','パ':'ﾊﾟ','ピ':'ﾋﾟ','プ':'ﾌﾟ','ペ':'ﾍﾟ','ポ':'ﾎﾟ','ヴ':'ｳﾞ'};
    const hankaku = kata.split('').map(c => z2h[c] || c).join('');
    return [...new Set([normalized, hira, kata, hankaku])];
  };

  // 生年月日検索条件を生成（西暦・和暦対応）
  // DBはYYYYMMDD形式（例: 19820624）で格納
  const getDobSearchCondition = (input) => {
    const s = input.trim();
    // 西暦フル 8桁: 19800115 → eq.19800115
    if (/^\d{8}$/.test(s)) return `patient_dob.eq.${s}`;
    // 西暦フル 区切りあり: 1980/01/15, 1980-01-15 → eq.19800115
    const mFull = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (mFull) return `patient_dob.eq.${mFull[1]}${mFull[2].padStart(2,'0')}${mFull[3].padStart(2,'0')}`;
    // 西暦年のみ（4桁）: 1980 → ilike.1980%
    if (/^\d{4}$/.test(s) && parseInt(s) >= 1900 && parseInt(s) <= 2099) return `patient_dob.ilike.${s}%`;
    // 西暦年月（6桁）: 198001 → ilike.198001%
    if (/^\d{6}$/.test(s)) return `patient_dob.ilike.${s}%`;
    // 和暦
    const eras = [
      { re: /^(r|令和?)\s*/i,  base: 2018 },
      { re: /^(h|平成?)\s*/i,  base: 1988 },
      { re: /^(s|昭和?)\s*/i,  base: 1925 },
      { re: /^(t|大正?)\s*/i,  base: 1911 },
      { re: /^(m|明治?)\s*/i,  base: 1867 },
    ];
    for (const era of eras) {
      const eraMatch = s.match(era.re);
      if (!eraMatch) continue;
      const rest = s.slice(eraMatch[0].length);
      const nums = rest.replace(/\D/g, '');
      // S550115 形式（元号+2桁年+4桁月日）→ eq.19800115
      if (/^\d{6}$/.test(nums)) {
        const y = era.base + parseInt(nums.slice(0,2));
        return `patient_dob.eq.${y}${nums.slice(2,4)}${nums.slice(4,6)}`;
      }
      // 区切りあり: S55/1/15, 昭和55年1月15日 → eq.19800115
      const parts = rest.replace(/[年月日]/g, ' ').split(/[\s\/\-]+/).filter(Boolean);
      if (parts.length >= 3) {
        const y = era.base + parseInt(parts[0]);
        return `patient_dob.eq.${y}${parts[1].padStart(2,'0')}${parts[2].padStart(2,'0')}`;
      }
      if (parts.length === 2) {
        const y = era.base + parseInt(parts[0]);
        return `patient_dob.ilike.${y}${parts[1].padStart(2,'0')}%`;
      }
      // 年のみ: S55, 昭和55 → ilike.1980%
      if (parts.length === 1 && /^\d{1,2}$/.test(parts[0])) {
        return `patient_dob.ilike.${era.base + parseInt(parts[0])}%`;
      }
    }
    return null;
  };

  // 患者検索
  useEffect(() => {
    if (!session || patientQuery.length < 1) {
      setPatientSuggestions([]);
      setShowSuggestions(false);
      setPatientSearching(false);
      return;
    }
    setPatientSearching(true);
    const timer = setTimeout(async () => {
      try {
        const q = patientQuery.trim();
        const variants = getKanaVariants(q);
        const qNorm = variants[0]; // normalize('NFKC')の結果
        const kanaOr = variants.map(v => `patient_name_kana.ilike.%${v}%`).join(',');
        const dobCond = getDobSearchCondition(q);
        const orStr = [
          `patient_name.ilike.%${qNorm}%`,
          `patient_id.ilike.%${qNorm}%`,
          kanaOr,
          ...(dobCond ? [dobCond] : []),
        ].join(',');
        const { data, error } = await supabase
          .from('patients')
          .select('patient_id, patient_name, patient_name_kana, patient_dob, patient_gender, zipcode, address, phone_number')
          .or(orStr)
          .limit(100);
        if (error) console.error('patient search error:', error);
        const list = (!error && data) ? data : [];
        setPatientSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch (e) {
        console.error('patient search exception:', e);
      } finally {
        setPatientSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [patientQuery, session]);

  // モーダル専用患者検索
  useEffect(() => {
    if (!session || modalQuery.length < 1) { setModalSuggestions([]); setModalSearching(false); return; }
    setModalSearching(true);
    const timer = setTimeout(async () => {
      try {
        const q = modalQuery.trim();
        const variants = getKanaVariants(q);
        const qNorm = variants[0];
        const kanaOr = variants.map(v => `patient_name_kana.ilike.%${v}%`).join(',');
        const dobCond = getDobSearchCondition(q);
        const orStr = [`patient_name.ilike.%${qNorm}%`, `patient_id.ilike.%${qNorm}%`, kanaOr, ...(dobCond ? [dobCond] : [])].join(',');
        const { data, error } = await supabase.from('patients')
          .select('patient_id, patient_name, patient_name_kana, patient_dob, patient_gender, zipcode, address, phone_number')
          .or(orStr).limit(100);
        setModalSuggestions(!error && data ? data : []);
      } catch (e) { console.error(e); } finally { setModalSearching(false); }
    }, 200);
    return () => clearTimeout(timer);
  }, [modalQuery, session]);

  // カレンダー表示時に当月へスクロール
  useEffect(() => {
    if (rightTab === 'calendar') {
      setTimeout(() => currentMonthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [rightTab]);

  // 外側クリックで候補を閉じる
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const formatDobDisplay = (isoDate) => {
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

  const parseDobToISO = (dob) => {
    if (!dob) return '';
    // Already ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
    // Try wareki conversion
    const s = dob.replace(/[\/\.\-]/g, ' ').replace(/年/g, ' ').replace(/[月日]/g, ' ').trim();
    const eras = [
      { re: /^(r|令和?|れいわ)\s*(\d{1,2})/i,      base: 2018 },
      { re: /^(h|平成?|へいせい)\s*(\d{1,2})/i,    base: 1988 },
      { re: /^(s|昭和?|しょうわ)\s*(\d{1,2})/i,    base: 1925 },
      { re: /^(t|大正?|たいしょう)\s*(\d{1,2})/i,  base: 1911 },
      { re: /^(m|明治?|めいじ)\s*(\d{1,2})/i,      base: 1867 },
    ];
    for (const era of eras) {
      const match = s.match(era.re);
      if (match) {
        const year = era.base + parseInt(match[2]);
        const rest = s.slice(match[0].length).trim().split(/\s+/);
        const month = rest[0] ? rest[0].padStart(2, '0') : '01';
        const day = rest[1] ? rest[1].padStart(2, '0') : '01';
        return `${year}-${month}-${day}`;
      }
    }
    // Try plain YYYYMMDD or YYYY/MM/DD etc.
    const nums = dob.replace(/\D/g, '');
    if (nums.length === 8) {
      return `${nums.slice(0,4)}-${nums.slice(4,6)}-${nums.slice(6,8)}`;
    }
    return '';
  };

  const handleSelectPatientFromModal = async (patient) => {
    setSelectedPatientForModal(patient);
    setPatientReservLoading(true);
    setModalStep('reservations');
    const { data, error } = await supabase
      .from('health_reserv')
      .select('id, date, day_of_week, purpose, fee, payment_type, item_basic, item_x_ray, item_ecg, item_blood, item_endoscopy')
      .eq('patient_id', patient.patient_id)
      .order('date', { ascending: false })
      .limit(20);
    setPatientReservations(!error && data ? data : []);
    setPatientReservLoading(false);
  };

  const handleSelectPatient = (patient) => {
    const iso = parseDobToISO(patient.patient_dob);
    setFormData(prev => ({
      ...prev,
      id: patient.patient_id || '',
      name: patient.patient_name || '',
      yurigana: patient.patient_name_kana || '',
      birthDate: iso,
      gender: patient.patient_gender || '',
      contact: patient.phone_number || '',
    }));
    setBirthDateInput(iso);
    setPatientQuery(patient.patient_name || '');
    setShowSuggestions(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      setLoginError('ログインに失敗しました');
    } else {
      if (rememberEmail) {
        localStorage.setItem('rememberedEmail', loginEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPatientQuery('');
    setPatientSuggestions([]);
  };

  // 柔軟な日付パース（複数形式対応）
  const parseDateFlexible = (input) => {
    if (!input) return '';
    const s = input.trim();

    // 和暦コンパクト: s420125, S420125（era1字 + 2桁年 + 2桁月 + 2桁日）
    const compactEra = s.match(/^([sShHrRtTmM])(\d{2})(\d{2})(\d{2})$/);
    if (compactEra) {
      const eraMap = { s: 1925, h: 1988, r: 2018, t: 1911, m: 1867 };
      const base = eraMap[compactEra[1].toLowerCase()];
      if (base) {
        const year = base + parseInt(compactEra[2]);
        const month = parseInt(compactEra[3]);
        const day = parseInt(compactEra[4]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31)
          return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      }
    }

    // 西暦 区切りあり（1桁月日対応）: 1967/1/25, 1967.1.25
    const yyyySep = s.match(/^(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})$/);
    if (yyyySep) {
      const year = parseInt(yyyySep[1]);
      const month = parseInt(yyyySep[2]);
      const day = parseInt(yyyySep[3]);
      if (year >= 1900 && year <= 2099 && month >= 1 && month <= 12 && day >= 1 && day <= 31)
        return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }

    // その他（西暦8桁・和暦区切りあり等）→ parseDobToISO に委譲
    return parseDobToISO(s);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name.startsWith('item_')) {
      const itemName = name.replace('item_', '');
      setFormData(prev => ({
        ...prev,
        items: { ...prev.items, [itemName]: checked }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // 健康診断書データ変更ハンドラ
  const handleKenshinChange = (e) => {
    const { name, value } = e.target;
    setKenshinData(prev => ({ ...prev, [name]: value }));
  };

  // 生年月日フィールドからフォーカスが外れたときにパース
  const handleBirthDateBlur = () => {
    const iso = parseDateFlexible(birthDateInput);
    setFormData(prev => ({ ...prev, birthDate: iso }));
    if (iso) setBirthDateInput(iso);
  };

  const handleReset = () => {
    setFormData(initialState);
    setKenshinData(kenshinInitialState);
    setPatientQuery('');
    setBirthDateInput('');
    setEditingReservationId(null);
  };

  // カレンダーから予約を削除
  const handleDeleteReservation = async (reservationId, patientName) => {
    if (!window.confirm(`「${patientName}」の予約を削除しますか？`)) return;
    const { error } = await supabase.from('health_reserv').delete().eq('id', reservationId);
    if (error) {
      alert('削除に失敗しました。');
    } else {
      setCalendarData(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(date => {
          updated[date] = updated[date].filter(r => r.id !== reservationId);
          if (updated[date].length === 0) delete updated[date];
        });
        if (!updated[selectedCalendarDate] || updated[selectedCalendarDate].length === 0) {
          setSelectedCalendarDate(null);
        }
        return updated;
      });
    }
  };

  // カレンダーから予約をフォームに読み込む（editMode=true: 修正、false: プレビューのみ）
  const handleLoadReservation = async (reservationId, editMode = true) => {
    const { data, error } = await supabase
      .from('health_reserv')
      .select('*')
      .eq('id', reservationId)
      .single();
    if (error || !data) return;
    setFormData({
      date: data.date || tomorrowStr,
      dayOfWeek: data.day_of_week || '',
      yurigana: data.patient_name_kana || '',
      id: data.patient_id || '',
      name: data.patient_name || '',
      gender: data.patient_gender || '',
      birthDate: data.birth_date ? parseDobToISO(data.birth_date) : '',
      age: data.age || '',
      contact: data.contact || '',
      companyName: data.company_name || '',
      purpose: data.purpose || '就職',
      hasHospitalForm: data.has_hospital_form || '無(当院用紙を使用)',
      items: {
        basic: !!data.item_basic, xRay: !!data.item_x_ray, ecg: !!data.item_ecg,
        blood: !!data.item_blood, hba1c: !!data.item_hba1c, endoscopy: !!data.item_endoscopy,
        echo: !!data.item_echo, manganese: !!data.item_manganese, stool: !!data.item_stool,
        norovirus: !!data.item_norovirus, bacteria3: !!data.item_bacteria3, bacteria5: !!data.item_bacteria5,
        paratyphoid: !!data.item_paratyphoid, methanol: !!data.item_methanol, hexane: !!data.item_hexane,
        methylHippuric: !!data.item_methyl_hippuric, psa: !!data.item_psa, hbsAg: !!data.item_hbs_ag,
        hbsAb: !!data.item_hbs_ab, hcvAb: !!data.item_hcv_ab, syphilis: !!data.item_syphilis, mrsa: !!data.item_mrsa,
      },
      deadlineType: data.deadline_type || '無',
      deadlineDate: data.deadline_date || '',
      hasDedicatedForm: !!data.has_dedicated_form,
      payment: data.fee != null ? String(data.fee) : '',
      paymentType: data.payment_type || '当日支払',
      medicalHistory: data.medical_history || '',
      findings: data.findings || '',
      others: data.others || '',
      bp1Sys: data.bp1_sys || '', bp1Dia: data.bp1_dia || '',
      bp2Sys: data.bp2_sys || '', bp2Dia: data.bp2_dia || '',
      pulse: data.pulse || '',
      height: data.height || '', weight: data.weight || '', bmi: data.bmi || '', waist: data.waist || '', chest: data.chest || '',
      visionR: data.vision_r || '', visionL: data.vision_l || '',
      visionR2: data.vision_r2 || '', visionL2: data.vision_l2 || '',
      hearingR: data.hearing_r || '', hearingL: data.hearing_l || '',
      hearingR2: data.hearing_r2 || '', hearingL2: data.hearing_l2 || '',
      colorVision: data.color_vision || '',
    });
    setPatientQuery(data.patient_name || '');
    setEditingReservationId(editMode ? reservationId : null);
    setSelectedCalendarDate(null);
    setRightTab('preview');
  };


  // ログイン画面
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <LogIn className="text-blue-600" size={22} />
            <h1 className="text-lg font-bold">健康診断システム ログイン</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">メールアドレス</label>
              <input
                type="email"
                autoComplete="off"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">パスワード</label>
              <input
                type="password"
                autoComplete="off"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={e => setRememberEmail(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              メールアドレスを記憶する
            </label>
            {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loginLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-6 text-slate-800 flex flex-col items-center">
      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-6">

        {/* 左セクション: 操作エリア */}
        <div className="flex-1 space-y-4 print-hide">

          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <h1 className="text-[1.35rem] font-black text-slate-700 tracking-wide ml-[5mm]">健康診断予約システム</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-pink-50 hover:bg-pink-100 text-red-400 hover:text-red-600 font-bold text-sm rounded-xl border border-pink-200 transition-all"
            >
              <LogOut size={16} /> ログアウト
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 overflow-hidden min-h-[750px]">
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200">
                    <button
                      onClick={() => setLeftTab('reservation')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 flex items-center gap-1.5 ${leftTab === 'reservation' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <PlusCircle size={13} /> 予約詳細入力
                    </button>
                    <button
                      onClick={() => setLeftTab('result')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 flex items-center gap-1.5 ${leftTab === 'result' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <ClipboardCheck size={13} /> 診断結果入力
                    </button>
                  </div>
                  <div className="flex items-center gap-[5mm]">
                    <button onClick={() => { setPatientQuery(''); setPatientSuggestions([]); setShowPatientModal(true); }} className="flex items-center gap-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 px-3 py-1.5 rounded-lg transition-colors">
                      <Search size={13} /> 患者検索
                    </button>
                    <button onClick={handleReset} className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-400 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors">
                      <RotateCcw size={13} /> リセット
                    </button>
                  </div>
                </div>

                {leftTab === 'reservation' && <>
                {/* 患者検索 */}
                <div className="space-y-1" ref={searchRef}>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">患者検索（氏名・ヨミガナ・ID・生年月日）</label>
                  <div className="relative">
                    <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={patientQuery}
                      onChange={e => setPatientQuery(e.target.value)}
                      placeholder="氏名・ヨミガナ・ID・生年月日で検索..."
                      className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50"
                    />
                    {patientSearching && patientQuery.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs text-slate-400">検索中...</div>
                    )}
                    {showSuggestions && !patientSearching && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {patientSuggestions.map(p => (
                          <div
                            key={p.patient_id}
                            onMouseDown={() => handleSelectPatient(p)}
                            className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="font-bold text-sm">{p.patient_name}</div>
                            <div className="text-xs text-slate-500 flex gap-3">
                              <span>{p.patient_name_kana}</span>
                              <span>ID: {p.patient_id}</span>
                              {p.patient_dob && <span>{p.patient_dob.replace(/-/g, '/')}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">健診希望日</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">カルテID (任意)</label>
                    <input type="text" name="id" value={formData.id} onChange={handleChange} placeholder="ID-00000" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">ヨミガナ</label>
                    <input type="text" name="yurigana" value={formData.yurigana} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">氏名</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">生年月日（例: S42.1.25）</label>
                    <input
                      type="text"
                      placeholder="S420125 / 19670125 / S42.1.25"
                      value={birthDateInput}
                      onChange={e => setBirthDateInput(e.target.value)}
                      onBlur={handleBirthDateBlur}
                      className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-sm text-blue-600 pl-2">
                      {formData.birthDate ? formatDobDisplay(formData.birthDate) : <span className="text-slate-300">未入力</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">年齢</label>
                      <div className="w-full p-2 border rounded-lg bg-slate-50 min-h-[42px] text-sm flex items-center">
                        {formData.age !== '' && formData.age != null ? `${formData.age} 歳` : <span className="text-slate-300">年齢は自動計算</span>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">性別</label>
                      <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">未選択</option>
                        <option value="男">男</option>
                        <option value="女">女</option>
                        <option value="その他">その他</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">連絡先電話番号</label>
                    <input type="text" name="contact" value={formData.contact} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">会社名</label>
                    <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="会社名・学校名など" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">健診目的</label>
                  <div className="grid grid-cols-4 gap-x-6 gap-y-2">
                    {['就職', '進学', '企業健診', '特定健診(社保)', '特定健診(国保)', '長寿健診', '入園児', 'その他'].map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <input type="radio" name="purpose" value={p} checked={formData.purpose === p} onChange={handleChange} className="w-4 h-4 text-blue-600" /> {p}
                      </label>
                    ))}
                  </div>
                </div>

                {(() => {
                  const isSpecialPurpose = ['特定健診(国保)', '長寿健診', '特定健診(社保)', '入園児'].includes(formData.purpose);
                  const bloodLabel = ['特定健診(国保)', '長寿健診'].includes(formData.purpose)
                    ? '採血 セット3'
                    : formData.purpose === '特定健診(社保)'
                    ? '採血 セット2'
                    : '採血 スクリーニング';
                  const cbClass = isSpecialPurpose
                    ? 'flex items-center gap-2 text-xs text-slate-600 cursor-not-allowed'
                    : 'flex items-center gap-2 text-xs cursor-pointer hover:text-blue-600';
                  const zeroPurposes = ['特定健診(国保)', '長寿健診', '入園児'];
                  const paymentTypeSelector = (
                    <select name="paymentType" value={formData.paymentType} onChange={handleChange} className="p-2 border rounded-lg bg-white text-sm font-bold">
                      <option value="当日支払">当日支払</option>
                      <option value="後日支払">後日支払</option>
                      <option value="会社請求">会社請求</option>
                    </select>
                  );
                  const feeDisplay = zeroPurposes.includes(formData.purpose) ? (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                      {paymentTypeSelector}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-blue-500 font-bold">料金</span>
                        <span className="text-2xl font-black text-blue-700">¥0</span>
                      </div>
                    </div>
                  ) : formData.purpose === '特定健診(社保)' ? (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                      {paymentTypeSelector}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-blue-500 font-bold">料金</span>
                        <span className="text-blue-700 font-bold">¥</span>
                        <input type="text" value={shahoFee} onChange={e => setShahoFee(e.target.value)} placeholder="金額を入力" className="w-36 text-right text-2xl font-black text-blue-700 bg-transparent border-b-2 border-blue-300 outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  ) : (() => {
                    const fee = calcFee(formData.items);
                    return (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                        {paymentTypeSelector}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-blue-500 font-bold">料金</span>
                          <span className="text-2xl font-black text-blue-700">¥{fee.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })();
                  return (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">一般健診</label>
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {Object.entries({ basic: '基本', xRay: 'X-P', ecg: '心電図', blood: bloodLabel, hba1c: 'HbA1c', endoscopy: '胃内視鏡', echo: '腹部エコー', manganese: 'マンガン' }).map(([key, label]) => (
                          <label key={key} className={cbClass}>
                            <input type="checkbox" name={`item_${key}`} checked={formData.items[key]} onChange={handleChange} disabled={isSpecialPurpose} className="w-3.5 h-3.5 rounded border-slate-300" /> {label}
                          </label>
                        ))}
                      </div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase">検便</label>
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {Object.entries({ stool: '便潜血2日法', norovirus: 'ノロウイルス', bacteria3: '3菌種(赤痢・サルモネラ・O157)', bacteria5: '5菌種(赤痢・サルモネラ・O157・O111・O26)', paratyphoid: 'パラチフス・腸チフス' }).map(([key, label]) => (
                          <label key={key} className={cbClass}>
                            <input type="checkbox" name={`item_${key}`} checked={formData.items[key]} onChange={handleChange} disabled={isSpecialPurpose} className="w-3.5 h-3.5 rounded border-slate-300" /> {label}
                          </label>
                        ))}
                      </div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase">有機溶剤</label>
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {Object.entries({ methanol: 'メタノール', hexane: 'ノルマルヘキサン', methylHippuric: 'メチル馬尿酸' }).map(([key, label]) => (
                          <label key={key} className={cbClass}>
                            <input type="checkbox" name={`item_${key}`} checked={formData.items[key]} onChange={handleChange} disabled={isSpecialPurpose} className="w-3.5 h-3.5 rounded border-slate-300" /> {label}
                          </label>
                        ))}
                      </div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase">その他採血項目</label>
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {Object.entries({ psa: 'PSA', hbsAg: 'HBs抗原', hbsAb: 'HBs抗体', hcvAb: 'HCV抗体', syphilis: '梅毒STS', mrsa: 'MRSA 黄色ブドウ球菌' }).map(([key, label]) => (
                          <label key={key} className={cbClass}>
                            <input type="checkbox" name={`item_${key}`} checked={formData.items[key]} onChange={handleChange} disabled={isSpecialPurpose} className="w-3.5 h-3.5 rounded border-slate-300" /> {label}
                          </label>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase">提出期限</label>
                          <div className="flex items-center gap-2">
                            <select name="deadlineType" value={formData.deadlineType} onChange={handleChange} className="p-2 border rounded-lg bg-white text-sm">
                              <option value="無">無</option>
                              <option value="有">有</option>
                            </select>
                            <input type="date" name="deadlineDate" value={formData.deadlineType === '無' ? '' : formData.deadlineDate} onChange={handleChange} disabled={formData.deadlineType === '無'} className={`flex-1 p-2 border rounded-lg text-xs ${formData.deadlineType === '無' ? 'bg-slate-100 cursor-not-allowed' : ''}`} />
                          </div>
                        </div>
                        <div className="space-y-1 flex flex-col justify-end">
                          <label className="text-[11px] font-bold text-slate-400 uppercase">専用診断用紙</label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium h-[38px]">
                            <input type="checkbox" name="hasDedicatedForm" checked={formData.hasDedicatedForm} onChange={e => setFormData(prev => ({ ...prev, hasDedicatedForm: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                            {formData.hasDedicatedForm ? '有（持参あり）' : '無'}
                          </label>
                        </div>
                      </div>
                      <div className="mt-6">{feeDisplay}</div>
                    </div>
                  );
                })()}




                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">備考事項</label>
                  <textarea name="others" value={formData.others} onChange={handleChange} className="w-full p-3 border rounded-xl h-24 text-sm resize-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                    saveStatus === 'saved' ? 'bg-green-600 text-white' :
                    saveStatus === 'error' ? 'bg-red-600 text-white' :
                    saveStatus === 'saving' ? 'bg-blue-400 text-white cursor-not-allowed' :
                    'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Save size={18} />
                  {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '保存しました' : saveStatus === 'error' ? '保存失敗' : editingReservationId ? '上書き保存' : '予約データを保存'}
                </button>
                </>}

                {/* ===== 診断結果入力タブ（健康診断書と連動） ===== */}
                {leftTab === 'result' && (
                  <div className="space-y-5">

                    {/* 対象患者サマリ（formDataから読み取り表示のみ） */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-500 uppercase mb-0.5">対象患者（予約詳細入力タブで選択）</div>
                        <div className="font-bold text-base">{formData.name || <span className="text-slate-300 font-normal text-sm">未選択</span>}</div>
                        {formData.yurigana && <div className="text-xs text-slate-400">{formData.yurigana}</div>}
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        {formData.date && <div>{formData.date.replace(/-/g, '/')}</div>}
                        {formData.age !== '' && <div>{formData.age}歳{formData.gender ? ` / ${formData.gender}` : ''}</div>}
                      </div>
                    </div>

                    {/* 住所 */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">住所</label>
                      <input type="text" name="address" value={kenshinData.address} onChange={handleKenshinChange} placeholder="住所を入力" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>

                    {/* 身体測定 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">身体測定</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: '身長(cm)', name: 'height' },
                          { label: '体重(kg)', name: 'weight' },
                          { label: 'BMI', name: 'bmi' },
                          { label: '腹囲(cm)', name: 'waist' },
                        ].map(({ label, name }) => (
                          <div key={name} className="space-y-1">
                            <div className="text-xs text-slate-500 font-medium text-center">{label}</div>
                            <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="0.0" className="w-full p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 血圧 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">血圧 (mmHg)</label>
                      <div className="flex items-center gap-2 max-w-[240px]">
                        <input type="text" name="bpSys" value={kenshinData.bpSys} onChange={handleKenshinChange} placeholder="収縮期" className="flex-1 p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        <span className="text-slate-500 font-bold">/</span>
                        <input type="text" name="bpDia" value={kenshinData.bpDia} onChange={handleKenshinChange} placeholder="拡張期" className="flex-1 p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>

                    {/* 視力 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">視力</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: '裸眼', rName: 'visionR', lName: 'visionL' },
                          { label: '矯正', rName: 'visionR2', lName: 'visionL2' },
                        ].map(({ label, rName, lName }) => (
                          <div key={label} className="space-y-1">
                            <div className="text-xs text-slate-500 font-medium">{label}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 flex-shrink-0">右</span>
                              <input type="text" name={rName} value={kenshinData[rName]} onChange={handleKenshinChange} placeholder="0.0" className="flex-1 p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                              <span className="text-xs text-slate-400 flex-shrink-0">左</span>
                              <input type="text" name={lName} value={kenshinData[lName]} onChange={handleKenshinChange} placeholder="0.0" className="flex-1 p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 色神・聴力 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">色神</label>
                        <input type="text" name="colorVision" value={kenshinData.colorVision} onChange={handleKenshinChange} placeholder="正常 / 異常" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">聴力</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 flex-shrink-0">右</span>
                          <input type="text" name="hearingR" value={kenshinData.hearingR} onChange={handleKenshinChange} placeholder="正常/異常" className="flex-1 p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                          <span className="text-xs text-slate-400 flex-shrink-0">左</span>
                          <input type="text" name="hearingL" value={kenshinData.hearingL} onChange={handleKenshinChange} placeholder="正常/異常" className="flex-1 p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      </div>
                    </div>

                    {/* 既往歴 */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">既往歴</label>
                      <input type="text" name="medicalHistory" value={kenshinData.medicalHistory} onChange={handleKenshinChange} placeholder="なし / 高血圧など" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>

                    {/* 尿検査 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">尿検査</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: '糖', name: 'urineGlucose' },
                            { label: '蛋白', name: 'urineProtein' },
                            { label: 'ウロビリノーゲン', name: 'urineUrobilinogen' },
                            { label: 'ビリルビン', name: 'urineBilirubin' },
                            { label: '比重', name: 'urineSpecificGravity' },
                            { label: 'pH', name: 'urinePh' },
                            { label: 'ケトン体', name: 'urineKetone' },
                            { label: '潜血', name: 'urineOccultBlood' },
                          ].map(({ label, name }) => (
                            <div key={name} className="space-y-0.5">
                              <div className="text-xs text-slate-500 text-center">{label}</div>
                              <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="(−)" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 胸部X-P検査 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">胸部X-P検査</label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">撮影日</div>
                          <input type="date" name="xRayDate" value={kenshinData.xRayDate} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">結果</div>
                          <input type="text" name="xRayResult" value={kenshinData.xRayResult} onChange={handleKenshinChange} placeholder="異常なし" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      </div>
                    </div>

                    {/* 心電図 */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">心電図</label>
                      <input type="text" name="ecgResult" value={kenshinData.ecgResult} onChange={handleKenshinChange} placeholder="正常範囲" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>

                    {/* 血液検査 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">血液検査（採血結果）</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-4">

                        {/* 血算 */}
                        <div>
                          <div className="text-[11px] font-bold text-blue-600 mb-1 border-b border-blue-200 pb-0.5">血算（CBC）</div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'WBC(×10³)', name: 'wbc' },
                              { label: 'RBC(万/μL)', name: 'rbc' },
                              { label: 'Hb(g/dL)', name: 'hemoglobin' },
                              { label: 'Ht(%)', name: 'ht' },
                              { label: 'MCV(fL)', name: 'mcv' },
                              { label: 'MCH(pg)', name: 'mch' },
                              { label: 'MCHC(%)', name: 'mchc' },
                              { label: 'PLT(×10⁴)', name: 'platelet' },
                            ].map(({ label, name }) => (
                              <div key={name} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 総蛋白・ビリルビン */}
                        <div>
                          <div className="text-[11px] font-bold text-blue-600 mb-1 border-b border-blue-200 pb-0.5">総蛋白・ビリルビン</div>
                          <div className="grid grid-cols-5 gap-2">
                            {[
                              { label: 'TP(g/dL)', name: 'tp' },
                              { label: 'Alb(g/dL)', name: 'alb' },
                              { label: 'A/G比', name: 'agRatio' },
                              { label: 'T-Bil(mg/dL)', name: 'tBil' },
                              { label: 'D-Bil(mg/dL)', name: 'dBil' },
                            ].map(({ label, name }) => (
                              <div key={name} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 肝機能・酵素 */}
                        <div>
                          <div className="text-[11px] font-bold text-blue-600 mb-1 border-b border-blue-200 pb-0.5">肝機能・酵素</div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'ALP(IU/L)', name: 'alp' },
                              { label: 'LDH(IU/L)', name: 'ldh' },
                              { label: 'GOT(IU/L)', name: 'got' },
                              { label: 'GPT(IU/L)', name: 'gpt' },
                              { label: 'γ-GTP(IU/L)', name: 'gammaGtp' },
                              { label: 'CK(IU/L)', name: 'ck' },
                              { label: 'Amy(IU/L)', name: 'amy' },
                            ].map(({ label, name }) => (
                              <div key={name} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 脂質 */}
                        <div>
                          <div className="text-[11px] font-bold text-blue-600 mb-1 border-b border-blue-200 pb-0.5">脂質</div>
                          <div className="grid grid-cols-5 gap-2">
                            {[
                              { label: 'T-Cho(mg/dL)', name: 'tCho' },
                              { label: 'HDL(mg/dL)', name: 'hdl' },
                              { label: 'LDL(mg/dL)', name: 'ldl' },
                              { label: 'TG(mg/dL)', name: 'triglyceride' },
                              { label: 'L/H比', name: 'lhRatio' },
                            ].map(({ label, name }) => (
                              <div key={name} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 腎機能 */}
                        <div>
                          <div className="text-[11px] font-bold text-blue-600 mb-1 border-b border-blue-200 pb-0.5">腎機能</div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'UN(mg/dL)', name: 'un' },
                              { label: 'Cre(mg/dL)', name: 'cre' },
                              { label: 'eGFR', name: 'egfr' },
                              { label: '尿酸(mg/dL)', name: 'uricAcid' },
                            ].map(({ label, name }) => (
                              <div key={name} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 電解質 */}
                        <div>
                          <div className="text-[11px] font-bold text-blue-600 mb-1 border-b border-blue-200 pb-0.5">電解質</div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'Na(mEq/L)', name: 'na' },
                              { label: 'K(mEq/L)', name: 'k' },
                              { label: 'Cl(mEq/L)', name: 'cl' },
                              { label: 'Ca(mg/dL)', name: 'ca' },
                              { label: 'IP(mg/dL)', name: 'ip' },
                              { label: 'Mg(mg/dL)', name: 'mgElec' },
                              { label: 'Fe(μg/dL)', name: 'fe' },
                            ].map(({ label, name }) => (
                              <div key={name} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 免疫・糖尿病 */}
                        <div>
                          <div className="text-[11px] font-bold text-blue-600 mb-1 border-b border-blue-200 pb-0.5">免疫・糖尿病</div>
                          <div className="grid grid-cols-5 gap-2">
                            {[
                              { label: '血糖(mg/dL)', name: 'bloodGlucose' },
                              { label: 'HbA1c(%)', name: 'hba1c' },
                              { label: 'CRP(mg/dL)', name: 'crp' },
                              { label: 'RF(IU/mL)', name: 'rf' },
                              { label: 'ASO(IU/mL)', name: 'aso' },
                            ].map(({ label, name }) => (
                              <div key={name} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 腫瘍マーカー */}
                        <div>
                          <div className="text-[11px] font-bold text-blue-600 mb-1 border-b border-blue-200 pb-0.5">腫瘍マーカー</div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'CEA(ng/mL)', name: 'cea' },
                              { label: 'CA19-9(U/mL)', name: 'ca199' },
                              { label: 'PSA(ng/mL)', name: 'psaValue' },
                              { label: 'BNP(pg/mL)', name: 'bnp' },
                            ].map(({ label, name }) => (
                              <div key={name} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* その他採血項目 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">その他採血項目</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'HBs抗原', name: 'hbsAg' },
                            { label: 'HBs抗体', name: 'hbsAb' },
                            { label: 'HCV抗体', name: 'hcvAb' },
                            { label: '梅毒STS', name: 'syphilisSTS' },
                            { label: 'MRSA 黄色ブドウ球菌', name: 'mrsaStaph' },
                          ].map(({ label, name }) => (
                            <div key={name} className="space-y-0.5">
                              <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                              <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* その他検査項目 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">その他検査項目</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '胃内視鏡', name: 'endoscopyResult' },
                            { label: '腹部エコー', name: 'echoResult' },
                            { label: 'マンガン', name: 'manganeseResult' },
                          ].map(({ label, name }) => (
                            <div key={name} className="space-y-0.5">
                              <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                              <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 検便 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">検便</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '便潜血2日法', name: 'stoolOccult' },
                            { label: 'ノロウイルス', name: 'norovirus' },
                            { label: '3菌種(赤痢・サルモネラ・O157)', name: 'bacteria3' },
                            { label: '5菌種(赤痢・サルモネラ・O157・O111・O26)', name: 'bacteria5' },
                            { label: 'パラチフス・腸チフス', name: 'paratyphoid' },
                          ].map(({ label, name }) => (
                            <div key={name} className="space-y-0.5">
                              <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                              <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 診察所見・総合所見 */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">診察所見</label>
                      <textarea name="doctorFindings" value={kenshinData.doctorFindings} onChange={handleKenshinChange} className="w-full p-3 border rounded-xl h-20 text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="異常を認めない。" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">総合所見</label>
                      <textarea name="overallFindings" value={kenshinData.overallFindings} onChange={handleKenshinChange} className="w-full p-3 border rounded-xl h-20 text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="異常を認めない。勤務に支障なし。" />
                    </div>

                    {/* 診断日 */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">診断日（健康診断書の発行日）</label>
                      <input type="date" name="issueDate" value={kenshinData.issueDate} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>

                    {/* 健康診断書プレビューボタン */}
                    <button
                      onClick={() => setRightTab('kenshin')}
                      className="w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <ClipboardCheck size={18} /> 健康診断書をプレビュー
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* 右セクション: PDF風プレビュー / カレンダー */}
        <div className="w-full lg:w-[671px] shrink-0 print-right">
          <div className="sticky top-6">
            <div className="flex justify-between items-center mb-4 px-2 print-hide">
              <div className="flex gap-1.5 bg-blue-100 p-1 rounded-xl shadow-sm border border-blue-200">
                <button
                  onClick={() => setRightTab('preview')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 ${rightTab === 'preview' ? 'bg-green-500 text-white shadow-md' : 'text-blue-400 hover:text-blue-600'}`}
                >
                  📋 プレビュー
                </button>
                <button
                  onClick={() => { setRightTab('calendar'); fetchCalendarData(); setTimeout(() => currentMonthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 ${rightTab === 'calendar' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-400 hover:text-blue-600'}`}
                >
                  📅 カレンダー
                </button>
                <button
                  onClick={() => setRightTab('kenshin')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 ${rightTab === 'kenshin' ? 'bg-emerald-600 text-white shadow-md' : 'text-blue-400 hover:text-blue-600'}`}
                >
                  📄 健康診断書
                </button>
              </div>
              {(rightTab === 'preview' || rightTab === 'kenshin') && (
                <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-sm transition-all">
                  <Printer size={14} /> 用紙を印刷
                </button>
              )}
            </div>

            {/* カレンダービュー */}
            {rightTab === 'calendar' && (
              <div className="bg-white shadow-xl rounded-xl border border-slate-200 p-4 max-h-[841px] overflow-y-auto">
                {calendarLoading ? (
                  <div className="text-center text-slate-400 py-10">読み込み中...</div>
                ) : (
                  <div className="space-y-6">
                    {Array.from({ length: 13 }, (_, i) => {
                      const d = new Date();
                      const year = new Date(d.getFullYear(), d.getMonth() + i, 1).getFullYear();
                      const month = new Date(d.getFullYear(), d.getMonth() + i, 1).getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const weeks = [];
                      let day = 1 - firstDay;
                      while (day <= daysInMonth) {
                        const week = [];
                        for (let w = 0; w < 7; w++, day++) {
                          week.push(day >= 1 && day <= daysInMonth ? day : null);
                        }
                        weeks.push(week);
                      }
                      const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();
                      return (
                        <div key={`${year}-${month}`} ref={isCurrentMonth ? currentMonthRef : null}>
                          <div className="text-sm font-black text-indigo-700 mb-2">{year}年{month + 1}月</div>
                          <div className="grid grid-cols-7 text-center text-[10px] font-bold mb-1">
                            {['日','月','火','水','木','金','土'].map((d, i) => (
                              <div key={d} className={i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-500' : 'text-slate-500'}>{d}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-px bg-slate-400 border border-slate-400 rounded-lg overflow-hidden">
                            {weeks.flat().map((day, idx) => {
                              const dateStr = day ? `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : null;
                              const reservations = dateStr ? (calendarData[dateStr] || []) : [];
                              const now = new Date();
                              const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                              const isToday = dateStr === todayStr;
                              const isSun = idx % 7 === 0;
                              const isSat = idx % 7 === 6;
                              const isHoliday = dateStr ? HOLIDAYS.has(dateStr) : false;
                              const isDisabled = isSun || isHoliday;
                              const isPast = dateStr ? dateStr < todayStr : false;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    if (!day || isDisabled) return;
                                    handleReset();
                                    setFormData(prev => ({ ...prev, date: dateStr }));
                                  }}
                                  className={`min-h-[52px] p-1 text-[10px] ${!day ? 'bg-slate-50' : isDisabled ? 'bg-rose-50 cursor-not-allowed' : isToday ? 'bg-amber-50 cursor-pointer hover:bg-amber-100' : isPast ? 'bg-slate-100 cursor-pointer hover:bg-slate-200' : 'bg-white cursor-pointer hover:bg-sky-50'} ${isToday ? 'ring-2 ring-inset ring-amber-700' : ''} ${dateStr === formData.date ? 'ring-2 ring-inset ring-indigo-500' : ''}`}
                                >
                                  {day && (
                                    <>
                                      <div className="flex justify-between items-center mb-0.5">
                                        <span className={`font-bold ${isDisabled ? 'text-rose-300' : isToday ? 'text-amber-600' : isSat ? 'text-sky-500' : 'text-slate-600'}`}>{day}</span>
                                        {reservations.length > 3 && (
                                          <span
                                            onClick={e => { e.stopPropagation(); setSelectedCalendarDate(dateStr); }}
                                            className="text-[10px] text-emerald-600 font-bold cursor-pointer hover:text-emerald-800"
                                          >他{reservations.length - 3}名</span>
                                        )}
                                      </div>
                                      {(() => { const show = 3; return reservations.slice(0, show).map((r, ri) => {
                                        const gender = (r.patient_gender || '').trim();
                                        const isMale = gender === '男';
                                        const isFemale = gender === '女';
                                        const bgColor = isPast ? 'bg-slate-200 hover:bg-slate-300' : isMale ? 'bg-blue-100 hover:bg-blue-200' : isFemale ? 'bg-pink-100 hover:bg-pink-200' : 'bg-slate-100 hover:bg-slate-200';
                                        const textColor = isPast ? 'text-slate-600' : isMale ? 'text-blue-800' : isFemale ? 'text-red-800' : 'text-black';
                                        return (
                                        <div
                                          key={ri}
                                          onClick={e => { e.stopPropagation(); setSelectedCalendarDate(dateStr); }}
                                          className={`text-[11px] ${bgColor} ${textColor} rounded px-0.5 mb-px truncate leading-tight cursor-pointer`}
                                        >
                                          <span className="font-bold">{r.patient_name}</span>
                                        </div>
                                        );
                                      }); })()}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 患者検索モーダル */}
            {showPatientModal && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowPatientModal(false); setModalStep('search'); }}>
                <div className="bg-[#1e2a3a] rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>

                  {/* ステップ1: 患者検索 */}
                  {modalStep === 'search' && (<>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-teal-500 p-2 rounded-lg"><Search size={18} className="text-white" /></div>
                        <h2 className="text-white font-bold text-lg">患者検索</h2>
                      </div>
                      <button onClick={() => setShowPatientModal(false)} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
                    </div>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        autoFocus
                        type="text"
                        value={modalQuery}
                        onChange={e => setModalQuery(e.target.value)}
                        placeholder="ID・氏名・ヨミガナ・生年月日で検索..."
                        className="w-full pl-9 pr-3 py-3 rounded-xl border-2 border-teal-400 bg-slate-50 outline-none focus:border-teal-500 text-sm"
                      />
                    </div>
                    <div className="mt-4 max-h-72 overflow-y-auto">
                      {modalSearching && <div className="text-center text-slate-400 py-6 text-sm">検索中...</div>}
                      {!modalSearching && modalQuery.length > 0 && modalSuggestions.length === 0 && (
                        <div className="text-center text-slate-400 py-6 text-sm">該当する患者が見つかりません</div>
                      )}
                      {!modalSearching && modalQuery.length === 0 && (
                        <div className="text-center text-slate-500 py-8 flex flex-col items-center gap-2">
                          <Search size={28} className="text-slate-600" />
                          <span className="text-sm">IDまたは氏名・ヨミガナ・生年月日を入力してください</span>
                        </div>
                      )}
                      {!modalSearching && modalSuggestions.map(p => (
                        <div
                          key={p.patient_id}
                          onClick={() => handleSelectPatientFromModal(p)}
                          className="px-4 py-3 hover:bg-slate-100 cursor-pointer border-b border-slate-200 last:border-b-0 rounded-lg mb-1 bg-white"
                        >
                          <div className="font-bold text-sm">{p.patient_name}</div>
                          <div className="text-xs text-slate-500 flex gap-3 mt-0.5">
                            <span>{p.patient_name_kana}</span>
                            <span>ID: {p.patient_id}</span>
                            {p.patient_dob && <span>{formatDobDisplay(parseDobToISO(p.patient_dob))}</span>}
                            {p.patient_gender && <span>{p.patient_gender}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>)}

                  {/* ステップ2: 予約一覧 */}
                  {modalStep === 'reservations' && (<>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setModalStep('search')} className="text-slate-400 hover:text-white text-sm">← 戻る</button>
                        <div>
                          <div className="text-white font-bold text-lg">{selectedPatientForModal?.patient_name}</div>
                          <div className="text-slate-400 text-xs">ID: {selectedPatientForModal?.patient_id}　{selectedPatientForModal?.patient_name_kana}</div>
                        </div>
                      </div>
                      <button onClick={() => { setShowPatientModal(false); setModalStep('search'); }} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {patientReservLoading && <div className="text-center text-slate-400 py-6 text-sm">読み込み中...</div>}
                      {!patientReservLoading && patientReservations.length === 0 && (
                        <div className="text-center text-slate-400 py-8 text-sm">予約情報なし</div>
                      )}
                      {!patientReservLoading && patientReservations.map((r, i) => {
                        const items = [r.item_basic && '基本', r.item_x_ray && 'X-P', r.item_ecg && '心電図', r.item_blood && '採血', r.item_endoscopy && '胃内視鏡'].filter(Boolean);
                        return (
                          <div
                            key={i}
                            onClick={() => { handleLoadReservation(r.id, false); setRightTab('preview'); setShowPatientModal(false); setModalStep('search'); }}
                            className="px-4 py-3 bg-white hover:bg-blue-50 cursor-pointer rounded-xl mb-2 border border-slate-200"
                          >
                            <div className="font-bold text-sm text-blue-700">{r.date} ({r.day_of_week})</div>
                            <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                              <span>{r.purpose}</span>
                              {items.map(it => <span key={it} className="bg-slate-100 px-1.5 py-0.5 rounded">{it}</span>)}
                              {r.fee != null && <span className="text-blue-600 font-bold">¥{r.fee.toLocaleString()}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>)}

                </div>
              </div>
            )}

            {/* 確認ダイアログ */}
            {confirmDialog.show && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                  <p className="text-slate-700 mb-6 whitespace-pre-line">{confirmDialog.message}</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: null })}
                      className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={confirmDialog.onConfirm}
                      className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 詳細モーダル */}
            {selectedCalendarDate && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCalendarDate(null)}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-black text-lg">{selectedCalendarDate.replace(/-/g, '/')} の予約</h2>
                    <button onClick={() => setSelectedCalendarDate(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
                  </div>
                  {(calendarData[selectedCalendarDate] || []).map((r, i) => {
                    const checkedItems = [
                      r.item_basic && '基本', r.item_x_ray && 'X-P', r.item_ecg && '心電図', r.item_blood && '採血',
                      r.item_hba1c && 'HbA1c', r.item_endoscopy && '胃内視鏡', r.item_echo && '腹部エコー', r.item_manganese && 'マンガン',
                      r.item_stool && '便潜血', r.item_norovirus && 'ノロウイルス', r.item_bacteria3 && '3菌種', r.item_bacteria5 && '5菌種', r.item_paratyphoid && 'パラチフス',
                      r.item_methanol && 'メタノール', r.item_hexane && 'ノルマルヘキサン', r.item_methyl_hippuric && 'メチル馬尿酸',
                      r.item_psa && 'PSA', r.item_hbs_ag && 'HBs抗原', r.item_hbs_ab && 'HBs抗体', r.item_hcv_ab && 'HCV抗体', r.item_syphilis && '梅毒STS', r.item_mrsa && 'MRSA',
                    ].filter(Boolean);
                    return (
                      <div key={i} className="border border-slate-200 rounded-xl p-4 mb-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="text-xs text-slate-400">{r.patient_name_kana}</div>
                            <div className="font-black text-lg">{r.patient_name}</div>
                            <div className="text-xs text-slate-500 mt-0.5 flex gap-2">
                              {r.patient_gender && <span>{r.patient_gender}</span>}
                              {r.birth_date && <span>{formatDobDisplay(parseDobToISO(r.birth_date))}</span>}
                              {r.age != null && r.age !== '' && <span>{r.age}歳</span>}
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <div>{r.purpose}</div>
                            <div className="font-bold text-blue-600">{r.fee != null ? `¥${r.fee.toLocaleString()}` : ''} {r.payment_type}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {checkedItems.map(item => (
                            <span key={item} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{item}</span>
                          ))}
                        </div>
                        {r.has_dedicated_form && <div className="mt-2 text-[10px] text-orange-600 font-bold">専用診断用紙あり</div>}
                        {r.deadline_type === '有' && r.deadline_date && <div className="mt-1 text-[10px] text-red-600">提出期限: {r.deadline_date}</div>}
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleLoadReservation(r.id, true)}
                            className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-all"
                          >
                            修正
                          </button>
                          <button
                            onClick={() => handleDeleteReservation(r.id, r.patient_name)}
                            className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-red-600 transition-all"
                          >
                            削除
                          </button>
                          <button
                            onClick={() => handleLoadReservation(r.id, false)}
                            className="flex-1 bg-slate-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-600 transition-all"
                          >
                            プレビュー
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== 健康診断書 ===== */}
            {rightTab === 'kenshin' && (
              <div className="bg-white shadow-2xl rounded-sm border border-slate-300 min-h-[841px] flex flex-col text-black leading-normal print-container" id="kenshin-printable" style={{padding: '8mm 12mm', fontSize: '12px'}}>

                {/* タイトル */}
                <h1 className="font-bold text-center mb-4" style={{fontSize: '22px', letterSpacing: '1em'}}>健　康　診　断　書</h1>

                {/* 患者情報 */}
                <div className="mb-3" style={{border: '1.5px solid black'}}>
                  {/* ふりがな・氏名・性別・住所 */}
                  <div className="flex" style={{borderBottom: '1.5px solid black'}}>
                    <div className="flex flex-col bg-slate-50" style={{width: '78px', borderRight: '1.5px solid black'}}>
                      <div className="text-center py-0.5" style={{fontSize: '10px', borderBottom: '1px solid black'}}>ふりがな</div>
                      <div className="flex-1 flex items-center justify-center font-bold" style={{fontSize: '11px'}}>氏名</div>
                    </div>
                    <div className="flex flex-col flex-1" style={{borderRight: '1.5px solid black'}}>
                      <div className="px-2 py-0.5" style={{fontSize: '11px', borderBottom: '1px solid black', minHeight: '20px'}}>{formData.yurigana}</div>
                      <div className="px-2 py-1 flex items-center gap-2">
                        <span className="font-bold" style={{fontSize: '17px'}}>{formData.name}</span>
                        <span style={{fontSize: '14px'}} className="ml-1">様</span>
                        <div className="ml-3" style={{border: '1.5px solid black', fontSize: '11px', lineHeight: '1.7'}}>
                          <div className={`px-2`} style={formData.gender === '男' ? {background:'black', color:'white', fontWeight:'bold', borderBottom: '1px solid black'} : {borderBottom: '1px solid black'}}>男</div>
                          <div className={`px-2`} style={formData.gender === '女' ? {background:'black', color:'white', fontWeight:'bold'} : {}}>女</div>
                        </div>
                      </div>
                    </div>
                    <div style={{width: '200px'}}>
                      <div className="text-center py-0.5 bg-slate-50" style={{fontSize: '10px', borderBottom: '1px solid black'}}>住所</div>
                      <div className="px-2 py-1" style={{fontSize: '11px'}}>{kenshinData.address}</div>
                    </div>
                  </div>
                  {/* 生年月日 */}
                  <div className="flex" style={{minHeight: '36px'}}>
                    <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '78px', borderRight: '1.5px solid black', fontSize: '11px'}}>生年月日</div>
                    <div className="flex-1 flex items-center gap-3 px-3 py-1">
                      {(() => {
                        const era = getBirthEra(formData.birthDate);
                        return (
                          <div style={{border: '1.5px solid black', fontSize: '11px', lineHeight: '1.7'}}>
                            {[['T','大正'],['S','昭和'],['H','平成'],['R','令和']].map(([code, name], i) => (
                              <div key={code} className="px-1.5" style={era === code ? {background:'black', color:'white', fontWeight:'bold', borderBottom: i < 3 ? '1px solid black' : 'none'} : {borderBottom: i < 3 ? '1px solid black' : 'none'}}>{name}</div>
                            ))}
                          </div>
                        );
                      })()}
                      {(() => {
                        if (!formData.birthDate) return <span style={{fontSize: '14px'}}>　　年　　月　　日（　　歳）</span>;
                        const [y, m, d] = formData.birthDate.split('-').map(Number);
                        const era = getBirthEra(formData.birthDate);
                        const eraBaseMap = { T: 1911, S: 1925, H: 1988, R: 2018, M: 1867 };
                        const eraYear = y - (eraBaseMap[era] || 0);
                        return <span style={{fontSize: '14px'}}>{eraYear}年　{m}月　{d}日　（{formData.age}歳）</span>;
                      })()}
                    </div>
                  </div>
                </div>

                {/* 診断事項タイトル */}
                <div className="text-center font-bold mb-2" style={{fontSize: '14px', letterSpacing: '0.6em'}}>診　断　事　項</div>

                {/* メインテーブル */}
                <div className="flex flex-1" style={{border: '1.5px solid black'}}>

                  {/* 左列 */}
                  <div className="flex flex-col" style={{flex: 1, borderRight: '1.5px solid black'}}>

                    {/* 身長/体重・BMI・腹囲・血圧 */}
                    {[
                      { label: '身長/体重', val: kenshinData.height && kenshinData.weight ? `${kenshinData.height} cm / ${kenshinData.weight} kg` : '' },
                      { label: 'BMI',       val: kenshinData.bmi },
                      { label: '腹囲',      val: kenshinData.waist ? `${kenshinData.waist} cm` : '' },
                      { label: '血圧(mmhg)',val: kenshinData.bpSys || kenshinData.bpDia ? `${kenshinData.bpSys || ''} / ${kenshinData.bpDia || ''}` : '' },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex" style={{borderBottom: '1px solid black', minHeight: '26px'}}>
                        <div className="bg-slate-50 flex items-center justify-center text-center font-bold" style={{width: '78px', borderRight: '1px solid black', fontSize: '11px', padding: '2px 4px'}}>{label}</div>
                        <div className="flex-1 flex items-center px-2 font-mono" style={{fontSize: '12px'}}>{val}</div>
                      </div>
                    ))}

                    {/* 眼（視力・色神） */}
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '20px', borderRight: '1px solid black', writingMode: 'vertical-rl', textOrientation: 'upright', fontSize: '12px', letterSpacing: '6px', padding: '4px 2px'}}>眼</div>
                      <div className="flex flex-col flex-1">
                        <div className="flex" style={{borderBottom: '1px solid black'}}>
                          <div className="bg-slate-50 flex flex-col items-center justify-center" style={{width: '28px', borderRight: '1px solid black', fontSize: '10px'}}>
                            <span>視</span><span>力</span>
                          </div>
                          <div className="flex flex-col flex-1" style={{borderRight: '0'}}>
                            {[
                              { side: '右', bare: kenshinData.visionR, corr: kenshinData.visionR2 },
                              { side: '左', bare: kenshinData.visionL, corr: kenshinData.visionL2 },
                            ].map(({ side, bare, corr }, i) => (
                              <div key={side} className="flex items-center gap-1 px-2" style={{minHeight: '24px', borderBottom: i === 0 ? '1px solid black' : 'none', fontSize: '11px'}}>
                                <span className="text-slate-600" style={{width: '12px'}}>{side}</span>
                                <span>裸眼: {bare}</span>
                                {corr && <span className="ml-3">矯正: {corr}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-2" style={{minHeight: '24px', fontSize: '11px'}}>
                          <span className="font-bold text-slate-600">色神</span>
                          <span>{kenshinData.colorVision}</span>
                        </div>
                      </div>
                    </div>

                    {/* 聴力 */}
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '78px', borderRight: '1px solid black', fontSize: '11px'}}>聴力</div>
                      <div className="flex flex-col flex-1">
                        {[{ side: '右', val: kenshinData.hearingR }, { side: '左', val: kenshinData.hearingL }].map(({ side, val }, i) => (
                          <div key={side} className="flex items-center gap-2 px-2" style={{minHeight: '26px', borderBottom: i === 0 ? '1px solid black' : 'none', fontSize: '11px'}}>
                            <span className="text-slate-600" style={{width: '12px'}}>{side}</span>
                            <span>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 血液検査 */}
                    <div className="flex flex-1">
                      <div className="bg-slate-50 flex items-center justify-center font-bold" style={{width: '20px', borderRight: '1px solid black', writingMode: 'vertical-rl', textOrientation: 'upright', fontSize: '11px', letterSpacing: '2px', padding: '4px 2px'}}>血液検査</div>
                      <div className="flex flex-col flex-1">

                        {[
                          { group: '貧血検査', rows: [{ label: '赤血球(万/mm³)', val: kenshinData.rbc }, { label: '血色素(g/dL)', val: kenshinData.hemoglobin }] },
                          { group: '肝機能', rows: [{ label: 'GOT(IU/L)', val: kenshinData.got }, { label: 'GPT(IU/L)', val: kenshinData.gpt }, { label: 'γ-GTP(IU/L)', val: kenshinData.gammaGtp }] },
                          { group: '血中脂質', rows: [{ label: 'HDLコレステロール(mg/dL)', val: kenshinData.hdl }, { label: 'LDLコレステロール(mg/dL)', val: kenshinData.ldl }, { label: '中性脂肪(mg/dL)', val: kenshinData.triglyceride }] },
                        ].map(({ group, rows }) => (
                          <div key={group} className="flex" style={{borderBottom: '1px solid black'}}>
                            <div className="bg-slate-50 flex items-center justify-center text-center" style={{width: '44px', borderRight: '1px solid black', fontSize: '10px', padding: '2px'}}>{group}</div>
                            <div className="flex flex-col flex-1">
                              {rows.map(({ label, val }, i) => (
                                <div key={label} className="flex items-center gap-1 px-1" style={{minHeight: '22px', borderBottom: i < rows.length - 1 ? '1px solid black' : 'none', fontSize: '10px'}}>
                                  <span className="text-slate-600" style={{width: '130px', flexShrink: 0}}>{label}</span>
                                  <span className="font-mono font-bold">{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {[
                          { label: '血糖検査(mg/dL)', val: kenshinData.bloodGlucose },
                          { label: '尿酸(mg/dL)',     val: kenshinData.uricAcid },
                        ].map(({ label, val }, i) => (
                          <div key={label} className="flex items-center gap-1 px-1" style={{minHeight: '22px', borderBottom: i === 0 ? '1px solid black' : 'none', fontSize: '10px'}}>
                            <span className="text-slate-600" style={{width: '174px', flexShrink: 0}}>{label}</span>
                            <span className="font-mono font-bold">{val}</span>
                          </div>
                        ))}

                      </div>
                    </div>
                  </div>

                  {/* 右列 */}
                  <div className="flex flex-col" style={{flex: 1}}>

                    {/* 既往歴 */}
                    <div className="flex" style={{borderBottom: '1px solid black', minHeight: '44px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px'}}>既往歴</div>
                      <div className="flex-1 p-2" style={{fontSize: '11px'}}>{kenshinData.medicalHistory || 'なし'}</div>
                    </div>

                    {/* 撮影区分 */}
                    <div className="flex" style={{borderBottom: '1px solid black', minHeight: '26px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px'}}>撮影区分</div>
                      <div className="flex-1 flex items-center px-2" style={{fontSize: '11px'}}>
                        {kenshinData.xRayDate ? `${toWareki(kenshinData.xRayDate)}　撮影` : ''}
                      </div>
                    </div>

                    {/* 胸部X-P検査 */}
                    <div className="flex" style={{borderBottom: '1px solid black', minHeight: '120px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px', lineHeight: '1.8'}}>胸部<br/>X-P<br/>検査</div>
                      <div className="flex-1 flex items-center justify-center p-2 text-center" style={{fontSize: '11px'}}>{kenshinData.xRayResult}</div>
                    </div>

                    {/* 心電図 */}
                    <div className="flex" style={{borderBottom: '1px solid black', minHeight: '40px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px'}}>心電図</div>
                      <div className="flex-1 flex items-center px-2" style={{fontSize: '11px'}}>{kenshinData.ecgResult}</div>
                    </div>

                    {/* 尿検査 */}
                    <div className="flex" style={{borderBottom: '1px solid black'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px'}}>尿検査</div>
                      <div className="flex-1 p-2" style={{fontSize: '11px', lineHeight: '1.8'}}>
                        <div>・糖　　　　（{kenshinData.urineGlucose || '　　'}）</div>
                        <div>・蛋白　　　（{kenshinData.urineProtein || '　　'}）</div>
                        <div>・ウロビリノーゲン（{kenshinData.urineUrobilinogen || '　　'}）</div>
                      </div>
                    </div>

                    {/* 診察所見 */}
                    <div className="flex" style={{borderBottom: '1px solid black', minHeight: '55px'}}>
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px'}}>診察所見</div>
                      <div className="flex-1 p-2 whitespace-pre-wrap" style={{fontSize: '11px'}}>{kenshinData.doctorFindings}</div>
                    </div>

                    {/* 総合所見 */}
                    <div className="flex flex-1">
                      <div className="bg-slate-50 flex items-center justify-center font-bold text-center" style={{width: '58px', borderRight: '1px solid black', fontSize: '11px'}}>総合所見</div>
                      <div className="flex-1 p-2 whitespace-pre-wrap" style={{fontSize: '11px'}}>{kenshinData.overallFindings}</div>
                    </div>

                  </div>
                </div>

                {/* フッター */}
                <div className="mt-4 space-y-1" style={{fontSize: '12px'}}>
                  <div>上記のとおり診断します</div>
                  <div>{kenshinData.issueDate ? toWareki(kenshinData.issueDate) : '　　　年　　月　　日'}</div>
                  <div className="mt-2" style={{marginLeft: '3em'}}>鹿児島県</div>
                  <div style={{marginLeft: '5em'}}>医療法人　□会　　　　　診療所　　医師　　　　　　　　　　㊞</div>
                </div>

              </div>
            )}

            {/* A4帳票再現 */}
            {rightTab === 'preview' && <div className="bg-white shadow-2xl rounded-sm p-12 border border-slate-300 min-h-[841px] flex flex-col relative text-black leading-normal print-container" id="printable">
              <h1 className="text-[22px] font-bold text-center mb-[5mm] border-b-2 border-black pb-3 tracking-[0.4em]">健康診断の記録用紙</h1>

              <div className="border-[1.5px] border-black text-sm print-table">
                {/* 行: 健診日 + 健診目的 */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">健診日</div>
                  <div className="flex-1 p-2 border-r-[1.5px] border-black flex items-center font-bold text-lg">
                    {formData.date ? (() => { const [y,m,d] = formData.date.split('-'); return `${y}年${parseInt(m)}月${parseInt(d)}日`; })() : '　年　月　日'}
                    <span className="ml-4 font-normal text-sm">（{formData.dayOfWeek || '　曜日'}）</span>
                  </div>
                  <div className="w-[140px] bg-slate-100 p-2 flex items-center justify-center font-bold text-sm">
                    {formData.purpose || ''}
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

                {/* 行: 連絡先 */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">連絡先</div>
                  <div className="flex-1 p-2 font-mono">{formData.contact || '　　-　　　-　　　'}</div>
                </div>

                {/* 行: 会社名 */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">会社名</div>
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
                    <div className="flex-1 p-2 flex flex-col items-start justify-start">
                      <div className="text-[10px] text-black mb-0.5">血圧2回目</div>
                      <div className="font-mono text-sm font-bold text-black w-full text-center">{formData.bp2Sys || ''} / {formData.bp2Dia || ''}</div>
                    </div>
                    <div className="w-[100px] p-2 flex flex-col items-start justify-start">
                      <div className="text-[10px] text-black mb-0.5">脈拍</div>
                      <div className="font-mono text-sm font-bold text-black">{formData.pulse || ''}</div>
                    </div>
                    <div className="w-[100px] p-2 flex flex-col items-start justify-start">
                      <div className="text-[10px] text-black mb-0.5">色神</div>
                      <div className="text-sm font-bold text-black">{formData.colorVision || ''}</div>
                    </div>
                  </div>
                </div>

                {/* 行: 身長・体重・BMI・腹囲・胸囲 */}
                <div className="flex border-b-[1.5px] border-black text-xs">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-[12px] text-center leading-tight">身長・体重<br/>BMI・腹囲</div>
                  <div className="flex-1 flex divide-x-[1.5px] divide-black">
                    {[
                      { label: '身長', value: formData.height, unit: 'cm' },
                      { label: '体重', value: formData.weight, unit: 'kg' },
                      { label: 'BMI', value: formData.bmi, unit: '' },
                      { label: '腹囲', value: formData.waist, unit: 'cm' },
                    ].map(({ label, value, unit }) => (
                      <div key={label} className="flex-1 p-2 flex flex-col items-start justify-start relative">
                        <div className="text-[10px] text-black mb-0.5">{label}</div>
                        <div className="font-mono text-sm font-bold text-black">{value || ''}</div>
                        {unit && <span className="absolute bottom-1 right-1 text-[10px] text-black">{unit}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 行: 視力・聴力 */}
                <div className="flex border-b-[1.5px] border-black text-xs">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs text-center leading-tight shrink-0">視力・聴力</div>
                  <div className="flex-1 flex divide-x-[1.5px] divide-black">
                    {/* 視力 */}
                    <div className="flex-1 flex flex-col divide-y-[1.5px] divide-black">
                      {[
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
                      ))}
                    </div>
                    {/* 聴力 */}
                    <div className="flex-1 flex flex-col divide-y-[1.5px] divide-black">
                      {[
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
                      ))}
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
                      { label: '一般健診', bg: 'bg-blue-50', border: 'border-blue-200', labelColor: 'text-blue-700', entries: { basic: '基本', xRay: 'X-P', ecg: '心電図', blood: ['特定健診(国保)', '長寿健診'].includes(formData.purpose) ? '採血 セット3' : formData.purpose === '特定健診(社保)' ? '採血 セット2' : '採血 スクリ', hba1c: 'HbA1c', endoscopy: '胃内視鏡', echo: '腹部エコー', manganese: 'マンガン' } },
                      { label: '検便', bg: 'bg-amber-50', border: 'border-amber-200', labelColor: 'text-amber-700', entries: { stool: '便潜血', norovirus: 'ノロウイルス', bacteria3: '3菌種(赤痢・サルモネラ・O157)', bacteria5: '5菌種(赤痢・サルモネラ・O157・O111・O26)', paratyphoid: 'パラチフス・腸チフス' } },
                      { label: '有機溶剤', bg: 'bg-green-50', border: 'border-green-200', labelColor: 'text-green-700', entries: { methanol: 'メタノール', hexane: 'ノルマルヘキサン', methylHippuric: 'メチル馬尿酸' } },
                      { label: 'その他採血', bg: 'bg-purple-50', border: 'border-purple-200', labelColor: 'text-purple-700', entries: { psa: 'PSA', hbsAg: 'HBs抗原', hbsAb: 'HBs抗体', hcvAb: 'HCV抗体', syphilis: '梅毒STS', mrsa: 'MRSA 黄色ブドウ球菌' } },
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
                    <span className="text-base font-bold underline decoration-[1.5px] underline-offset-4">
                      ¥ {(() => {
                        const zeroPurposes = ['特定健診(国保)', '長寿健診', '入園児'];
                        if (zeroPurposes.includes(formData.purpose)) return '0';
                        if (formData.purpose === '特定健診(社保)') return parseInt(shahoFee || 0).toLocaleString();
                        const fee = calcFee(formData.items);
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
                  </div>
                </div>

                {/* 行: 既往歴 */}
                <div className="flex border-b-[1.5px] border-black min-h-[40px]">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">既往歴</div>
                  <div className="flex-1 p-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">
                    {formData.medicalHistory}
                  </div>
                </div>

                {/* 行: 所見 */}
                <div className="flex border-b-[1.5px] border-black min-h-[40px]">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">所見</div>
                  <div className="flex-1 p-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">
                    {formData.findings}
                  </div>
                </div>

                {/* 行: その他 */}
                <div className="flex min-h-[90px]">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">その他</div>
                  <div className="flex-1 p-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 italic">
                    {formData.others}
                  </div>
                </div>
              </div>

              {/* 下部 */}
              <div className="mt-auto flex justify-between items-end pt-4 border-t border-slate-100">
                <div className="text-[9px] text-slate-400 font-mono italic tracking-wider">RESERVATION_SYS_GEN_2.5</div>
                <div className="text-right">
                  <div className="text-sm font-black border-b-2 border-black mb-1 px-1 inline-block">陽春堂内科診療所</div>
                </div>
              </div>
            </div>}
          </div>
        </div>

      </div>

      <style>{`
        .print-only { display: none; }
        @media print {
          .print-only { display: inline !important; }
          @page { size: A4 portrait; margin: 5mm 0 0 0; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body > div { padding: 0 !important; background: white !important; }
          .print-hide { display: none !important; }
          .print-right { width: 210mm !important; max-width: 210mm !important; flex: none !important; }
          .print-right .sticky { position: static !important; top: auto !important; }
          #printable {
            width: 210mm !important;
            min-height: 0 !important;
            padding: 4mm 11mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          #printable h1 { font-size: 24px !important; margin-bottom: 6px !important; padding-bottom: 4px !important; }
          #printable p { margin-bottom: 2px !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
          .bg-white { background-color: white !important; }
          .vision-hearing-item span { font-size: 12px !important; }
          .vision-hearing-val { min-width: 63px !important; font-size: 16px !important; }
          .hearing-label { min-width: 48px !important; width: auto !important; }
          .print-id { font-size: 21px !important; }
          .bp-title { font-size: 12px !important; }
          .print-table { border: 1.5px solid black !important; }
          .print-table > div { border-bottom: 1.5px solid black !important; }
          .print-table > div > div:first-child { border-right: 1.5px solid black !important; }
          #kenshin-printable {
            width: 210mm !important;
            min-height: 0 !important;
            padding: 8mm 12mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
