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

export default function App() {
  // 認証状態
  const [session, setSession] = useState(null);
  const [shahoFee, setShahoFee] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // カレンダーの表示月管理（右側カレンダー用）
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 患者検索
  const [patientQuery, setPatientQuery] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [patientSearching, setPatientSearching] = useState(false);
  const searchRef = useRef(null);

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
    paymentType: '後日支払',
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

  // セッション監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchCalendarData();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchCalendarData();
    });
    return () => subscription.unsubscribe();
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
    const start = today.toISOString().split('T')[0];
    const end = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate()).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('health_reserv')
      .select('id, date, patient_name, patient_name_kana, purpose, payment_type, fee, item_basic, item_x_ray, item_ecg, item_blood, item_hba1c, item_endoscopy, item_echo, item_manganese, item_stool, item_norovirus, item_bacteria3, item_bacteria5, item_paratyphoid, item_methanol, item_hexane, item_methyl_hippuric, item_psa, item_hbs_ag, item_hbs_ab, item_hcv_ab, item_syphilis, item_mrsa, deadline_type, deadline_date, has_dedicated_form')
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
        alert(`${formData.date} にはすでに同じ患者ID（${formData.id}）の予約が登録されています。`);
        return;
      }
    }
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
      birth_date: formData.birthDate || null,
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
    }
    setTimeout(() => setSaveStatus(''), 3000);
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
  const getDobSearchCondition = (input) => {
    const s = input.trim();
    // 完全な日付（parseDobToISOで変換できる場合）
    const iso = parseDobToISO(s);
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return `patient_dob.eq.${iso}`;
    // 西暦年のみ（4桁）
    if (/^\d{4}$/.test(s) && parseInt(s) >= 1900 && parseInt(s) <= 2099) return `patient_dob.ilike.${s}%`;
    // 西暦年月（6桁 YYYYMM）
    if (/^\d{6}$/.test(s)) return `patient_dob.ilike.${s.slice(0,4)}-${s.slice(4,6)}%`;
    // 和暦年のみ（例: S55, H5, R3, 昭和55）
    const eraOnly = [
      { re: /^(r|令和?|れいわ)\s*(\d{1,2})$/i,     base: 2018 },
      { re: /^(h|平成?|へいせい)\s*(\d{1,2})$/i,   base: 1988 },
      { re: /^(s|昭和?|しょうわ)\s*(\d{1,2})$/i,   base: 1925 },
      { re: /^(t|大正?|たいしょう)\s*(\d{1,2})$/i, base: 1911 },
      { re: /^(m|明治?|めいじ)\s*(\d{1,2})$/i,     base: 1867 },
    ];
    for (const era of eraOnly) {
      const match = s.match(era.re);
      if (match) return `patient_dob.ilike.${era.base + parseInt(match[2])}%`;
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
        // 半角カタカナを含む生入力ではなく、NFKC正規化済みの値を使用
        const qNorm = variants[0]; // normalize('NFKC')の結果
        const kanaOr = variants.map(v => `patient_name_kana.ilike.%${v}%`).join(',');
        const orStr = `patient_name.ilike.%${qNorm}%,patient_id.ilike.%${qNorm}%,${kanaOr}`;
        const { data, error } = await supabase
          .from('patients')
          .select('patient_id, patient_name, patient_name_kana, patient_dob, patient_gender, company_name, phone_number')
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

  const handleSelectPatient = (patient) => {
    setFormData(prev => ({
      ...prev,
      id: patient.patient_id || '',
      name: patient.patient_name || '',
      yurigana: patient.patient_name_kana || '',
      birthDate: parseDobToISO(patient.patient_dob),
      companyName: patient.company_name || '',
      contact: patient.phone_number || '',
    }));
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
    if (error) setLoginError('ログインに失敗しました');
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPatientQuery('');
    setPatientSuggestions([]);
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

  const handleReset = () => {
    setFormData(initialState);
    setPatientQuery('');
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
      birthDate: data.birth_date || '',
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
      paymentType: data.payment_type || '後日支払',
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
                autoComplete="email"
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
                autoComplete="current-password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
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
              className="flex items-center gap-2 px-4 py-2 bg-pink-100 hover:bg-pink-200 text-red-500 hover:text-red-700 font-bold text-sm rounded-xl border border-pink-200 transition-all"
            >
              <LogOut size={16} /> ログアウト
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 overflow-hidden min-h-[750px]">
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="text-blue-600" size={20} />
                    <h2 className="text-lg font-bold">予約詳細入力</h2>
                  </div>
                  <button onClick={handleReset} className="text-slate-400 hover:text-red-500 flex items-center gap-1 text-xs">
                    <RotateCcw size={14} /> リセット
                  </button>
                </div>

                {/* 患者検索 */}
                <div className="space-y-1" ref={searchRef}>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">患者検索（氏名・よみがな・ID）</label>
                  <div className="relative">
                    <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={patientQuery}
                      onChange={e => setPatientQuery(e.target.value)}
                      placeholder="氏名・よみがな・IDで検索..."
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
                    <label className="text-[11px] font-bold text-slate-400 uppercase">よみがな</label>
                    <input type="text" name="yurigana" value={formData.yurigana} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">氏名</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">生年月日</label>
                    <div className="w-full p-2 border rounded-lg bg-white min-h-[42px] text-sm">
                      {formData.birthDate ? formatDobDisplay(formData.birthDate) : <span className="text-slate-300">未入力</span>}
                    </div>
                    <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full p-1 border rounded text-xs text-slate-500 outline-none focus:ring-1 focus:ring-blue-300" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">年齢</label>
                    <div className="w-full p-2 border rounded-lg bg-slate-50 min-h-[42px] text-sm flex items-center">
                      {formData.age !== '' && formData.age != null ? `${formData.age} 歳` : <span className="text-slate-300">生年月日・健診希望日を入力</span>}
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
              </div>
            </div>
          </div>

        {/* 右セクション: PDF風プレビュー / カレンダー */}
        <div className="w-full lg:w-[595px] shrink-0 print-right">
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
                  onClick={() => { setRightTab('calendar'); fetchCalendarData(); }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 ${rightTab === 'calendar' ? 'bg-blue-500 text-white shadow-md' : 'text-blue-400 hover:text-blue-600'}`}
                >
                  📅 カレンダー
                </button>
              </div>
              {rightTab === 'preview' && (
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
                    {Array.from({ length: 6 }, (_, i) => {
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
                      return (
                        <div key={`${year}-${month}`}>
                          <div className="text-sm font-black text-slate-700 mb-2">{year}年{month + 1}月</div>
                          <div className="grid grid-cols-7 text-center text-[10px] font-bold mb-1">
                            {['日','月','火','水','木','金','土'].map((d, i) => (
                              <div key={d} className={i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}>{d}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-px bg-slate-400 border border-slate-400 rounded-lg overflow-hidden">
                            {weeks.flat().map((day, idx) => {
                              const dateStr = day ? `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : null;
                              const reservations = dateStr ? (calendarData[dateStr] || []) : [];
                              const isToday = dateStr === new Date().toISOString().split('T')[0];
                              const isSun = idx % 7 === 0;
                              const isSat = idx % 7 === 6;
                              const isHoliday = dateStr ? HOLIDAYS.has(dateStr) : false;
                              const isDisabled = isSun || isHoliday;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    if (!day || isDisabled) return;
                                    setFormData(prev => ({ ...prev, date: dateStr }));
                                  }}
                                  className={`min-h-[52px] p-1 text-[10px] ${!day ? 'bg-white' : isDisabled ? 'bg-red-50 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-blue-50'} ${dateStr === formData.date ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                                >
                                  {day && (
                                    <>
                                      <div className={`font-bold mb-0.5 ${isDisabled ? 'text-red-300' : isSat ? 'text-blue-400' : 'text-slate-600'}`}>{day}</div>
                                      {reservations.slice(0, 2).map((r, ri) => (
                                        <div
                                          key={ri}
                                          onClick={e => { e.stopPropagation(); setSelectedCalendarDate(dateStr); }}
                                          className="text-[11px] bg-blue-100 text-slate-600 rounded px-0.5 mb-px truncate leading-tight hover:bg-blue-200 cursor-pointer"
                                        >
                                          <span className="font-bold">{r.patient_name}</span>
                                        </div>
                                      ))}
                                      {reservations.length > 2 && (
                                        <div
                                          onClick={e => { e.stopPropagation(); setSelectedCalendarDate(dateStr); }}
                                          className="text-[10px] text-slate-600 px-0.5 cursor-pointer hover:text-slate-800"
                                        >
                                          他{reservations.length - 2}名
                                        </div>
                                      )}
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

            {/* A4帳票再現 */}
            {rightTab === 'preview' && <div className="bg-white shadow-2xl rounded-sm p-12 border border-slate-300 min-h-[841px] flex flex-col relative text-black leading-normal print-container" id="printable">
              <div className="absolute top-0 right-0 p-4 text-[9px] text-slate-300 font-mono">FORM_TYPE_A</div>
              <h1 className="text-[22px] font-bold text-center mb-10 border-b-2 border-black pb-3 tracking-[0.4em]">健康診断の記録用紙</h1>

              <div className="border-[1.5px] border-black text-sm print-table">
                {/* 行: 健診日 + 健診目的 */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">健診日</div>
                  <div className="flex-1 p-2 border-r-[1.5px] border-black flex items-center font-bold text-lg">
                    {formData.date ? new Date(formData.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }) : '　月　日'}
                    <span className="ml-4 font-normal text-sm">({formData.dayOfWeek || '　曜日'})</span>
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
                  <div className="print-id w-[140px] p-2 flex items-center justify-center text-sm font-mono">
                    {formData.id ? `ID: ${formData.id}` : ''}
                  </div>
                </div>

                {/* 行: 生年月日 */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">生年月日</div>
                  <div className="flex-1 p-2 flex justify-between items-center pr-10">
                    <span className="text-lg">{formData.birthDate ? formatDobDisplay(formData.birthDate) : '　　　年　月　日'}</span>
                    <span className="text-lg font-bold">{formData.age} <span className="text-xs font-normal">歳</span></span>
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
                  <div className="bp-title w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-[5px] text-center leading-tight shrink-0">血圧・脈拍<br/>色神</div>
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
        }
      `}</style>
    </div>
  );
}
