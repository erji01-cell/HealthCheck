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

export default function App() {
  // 認証状態
  const [session, setSession] = useState(null);
  const [shahoFee, setShahoFee] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // 表示モードの管理 ('form' or 'calendar')
  const [viewMode, setViewMode] = useState('form');

  // カレンダーの表示月管理
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2, 1));

  // 患者検索
  const [patientQuery, setPatientQuery] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // 初期状態の定義
  const initialState = {
    date: '2026-03-25',
    dayOfWeek: '水曜日',
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
      methylHippuric: false
    },
    deadlineType: '無',
    deadlineDate: '',
    hasDedicatedForm: false,
    payment: '',
    paymentType: '後日支払',
    others: '',
    bp1Sys: '', bp1Dia: '',
    bp2Sys: '', bp2Dia: '',
    pulse: '',
    height: '', weight: '', bmi: '', waist: '', chest: '',
    visionR: '', visionL: '',
    hearingR: '', hearingL: '',
    colorVision: ''
  };

  const [formData, setFormData] = useState(initialState);

  // セッション監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 生年月日から年齢を計算
  useEffect(() => {
    if (formData.birthDate) {
      const birth = new Date(formData.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      setFormData(prev => ({ ...prev, age }));
    }
  }, [formData.birthDate]);

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
    if (!basic) return null;

    // メインパッケージ（基本+組み合わせ）
    let base = 0;
    if (xRay && blood)     base = 9400;
    else if (blood)        base = 7900;
    else if (xRay)         base = 4000;
    else                   base = 2400;

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
    return base + ecgFee + hba1cFee + endoscopyFee + echoFee + mangFee + stoolFee + norovirusFee + bacteria3Fee + bacteria5Fee + paratyphoidFee + methanolFee + hexaneFee + methylHippuricFee;
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

  // 患者検索
  useEffect(() => {
    if (!session || patientQuery.length < 1) {
      setPatientSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      const q = patientQuery.trim();
      const { data, error } = await supabase
        .from('patients')
        .select('patient_id, patient_name, patient_name_kana, patient_dob, patient_gender, company_name, phone_number')
        .or(`patient_name.ilike.%${q}%,patient_name_kana.ilike.%${q}%,patient_id.ilike.%${q}%`)
        .limit(10);
      if (!error && data) {
        setPatientSuggestions(data);
        setShowSuggestions(data.length > 0);
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
  };

  // カレンダー生成ロジック
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 border-b border-r bg-slate-50/50"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = formData.date === dateString;
      const isToday = new Date().toISOString().split('T')[0] === dateString;

      days.push(
        <div
          key={d}
          onClick={() => {
            setFormData(prev => ({ ...prev, date: dateString }));
            setViewMode('form');
          }}
          className={`h-20 border-b border-r p-1 cursor-pointer transition-colors hover:bg-blue-50 relative ${isSelected ? 'bg-blue-100' : 'bg-white'}`}
        >
          <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isSelected ? 'bg-blue-600 text-white' : isToday ? 'bg-red-500 text-white' : 'text-slate-600'}`}>
            {d}
          </span>
          {isSelected && (
            <div className="mt-1 bg-blue-600 text-white text-[9px] p-1 rounded shadow-sm truncate">
              {formData.name || '新規予約'}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const changeMonth = (offset) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
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
        <div className="flex-1 space-y-4">

          {/* モード切替 + ログアウト */}
          <div className="flex items-center justify-between">
            <div className="inline-flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              <button
                onClick={() => setViewMode('form')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'form' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <ListTodo size={16} /> 入力フォーム
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Calendar size={16} /> カレンダー選択
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={14} /> ログアウト
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 overflow-hidden min-h-[750px]">
            {viewMode === 'form' ? (
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
                    {showSuggestions && (
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
                    return fee !== null ? (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                        {paymentTypeSelector}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-blue-500 font-bold">料金</span>
                          <span className="text-2xl font-black text-blue-700">¥{fee.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : null;
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

                <button onClick={() => window.alert("Supabase連携待機中")} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                  <Save size={18} /> 予約データを保存
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Calendar size={20} className="text-blue-600" />
                    {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
                  </h2>
                  <div className="flex border rounded-lg overflow-hidden">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 border-r"><ChevronLeft size={20} /></button>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50"><ChevronRight size={20} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-7 border-t border-l rounded-lg overflow-hidden text-[11px]">
                  {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                    <div key={d} className={`p-2 font-bold text-center border-r border-b bg-slate-50 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
                      {d}
                    </div>
                  ))}
                  {renderCalendar()}
                </div>

                <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 items-start">
                  <Info className="text-amber-500 mt-0.5" size={18} />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    カレンダーから予約日を選択すると、その日が「健診日」としてフォームに自動入力されます。青く塗られている日が現在選択中の日付です。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右セクション: PDF風プレビュー */}
        <div className="w-full lg:w-[595px] shrink-0">
          <div className="sticky top-6">
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Document Preview</span>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-sm transition-all"
              >
                <Printer size={14} /> 用紙を印刷
              </button>
            </div>

            {/* A4帳票再現 */}
            <div className="bg-white shadow-2xl rounded-sm p-12 border border-slate-300 min-h-[841px] flex flex-col relative text-black leading-normal print-container" id="printable">
              <div className="absolute top-0 right-0 p-4 text-[9px] text-slate-300 font-mono">FORM_TYPE_A</div>
              <p className="text-right text-[10px] mb-1 font-bold">受付窓口控え</p>

              <h1 className="text-2xl font-bold text-center mb-10 border-b-2 border-black pb-3 tracking-[0.4em]">健康診断の記録用紙</h1>

              <div className="border-[1.5px] border-black text-sm">
                {/* 行: 健診日 + 健診目的 */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center">健診日</div>
                  <div className="flex-1 p-2 border-r-[1.5px] border-black flex items-center font-bold text-lg">
                    {formData.date ? new Date(formData.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }) : '　月　日'}
                    <span className="ml-4 font-normal text-sm">({formData.dayOfWeek || '　曜日'})</span>
                  </div>
                  <div className="w-[140px] bg-slate-100 p-2 border-l-[1.5px] border-black flex items-center justify-center font-bold text-sm">
                    {formData.purpose || ''}
                  </div>
                </div>

                {/* 行: 氏名（読み仮名上・ID右） */}
                <div className="flex border-b-[1.5px] border-black">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center">氏名</div>
                  <div className="flex-1 px-4 py-2 flex flex-col justify-center border-r-[1.5px] border-black">
                    <span className="text-xs text-slate-500 leading-tight">{formData.yurigana}</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-xl font-bold">{formData.name}</span>
                      <span className="text-sm font-normal">様</span>
                    </div>
                  </div>
                  <div className="w-[140px] p-2 flex items-center justify-center text-sm font-mono">
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
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center">血圧・脈拍</div>
                  <div className="flex-1 flex divide-x-[1.5px] divide-black">
                    <div className="flex-1 p-2 flex flex-col items-center justify-center">
                      <div className="text-[9px] text-slate-400 mb-0.5">血圧1回目</div>
                      <div className="font-mono text-sm">{formData.bp1Sys || '___'} / {formData.bp1Dia || '___'}</div>
                    </div>
                    <div className="flex-1 p-2 flex flex-col items-center justify-center">
                      <div className="text-[9px] text-slate-400 mb-0.5">血圧2回目</div>
                      <div className="font-mono text-sm">{formData.bp2Sys || '___'} / {formData.bp2Dia || '___'}</div>
                    </div>
                    <div className="w-[100px] p-2 flex flex-col items-center justify-center">
                      <div className="text-[9px] text-slate-400 mb-0.5">脈拍</div>
                      <div className="font-mono text-sm">{formData.pulse || '___'}</div>
                    </div>
                  </div>
                </div>

                {/* 行: 身長・体重・BMI・腹囲・胸囲 */}
                <div className="flex border-b-[1.5px] border-black text-xs">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-[10px] text-center leading-tight">身長・体重<br/>BMI・腹囲・胸囲</div>
                  <div className="flex-1 flex divide-x-[1.5px] divide-black">
                    {[
                      { label: '身長', value: formData.height, unit: 'cm' },
                      { label: '体重', value: formData.weight, unit: 'kg' },
                      { label: 'BMI', value: formData.bmi, unit: '' },
                      { label: '腹囲', value: formData.waist, unit: 'cm' },
                      { label: '胸囲', value: formData.chest, unit: 'cm' },
                    ].map(({ label, value, unit }) => (
                      <div key={label} className="flex-1 p-2 flex flex-col items-center justify-center">
                        <div className="text-[9px] text-slate-400 mb-0.5">{label}</div>
                        <div className="font-mono text-sm">{value || '___'}<span className="text-[9px] text-slate-400">{value && unit}</span></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 行: 視力・聴力・色神 */}
                <div className="flex border-b-[1.5px] border-black text-xs">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-[10px] text-center leading-tight">視力・聴力<br/>色神</div>
                  <div className="flex-1 flex divide-x-[1.5px] divide-black">
                    {[
                      { label: '視力 右', value: formData.visionR },
                      { label: '視力 左', value: formData.visionL },
                      { label: '聴力 右', value: formData.hearingR },
                      { label: '聴力 左', value: formData.hearingL },
                      { label: '色神', value: formData.colorVision },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex-1 p-2 flex flex-col items-center justify-center">
                        <div className="text-[9px] text-slate-400 mb-0.5">{label}</div>
                        <div className="text-sm">{value || '___'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 行: 項目 */}
                <div className="flex border-b-[1.5px] border-black min-h-[120px]">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-[10px]">
                    <span>健診項目</span>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries({ basic: '基本', xRay: 'X-P', ecg: '心電図', blood: '採血', hba1c: 'HbA1c', endoscopy: '胃内視鏡', echo: '腹部エコー', manganese: 'マンガン', stool: '便潜血', norovirus: 'ノロウイルス', bacteria3: '3菌種(赤痢・サルモネラ・O157)', bacteria5: '5菌種(赤痢・サルモネラ・O157・O111・O26)', paratyphoid: 'パラチフス・腸チフス', methanol: 'メタノール', hexane: 'ノルマルヘキサン', methylHippuric: 'メチル馬尿酸' }).map(([key, label]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className={`w-3 h-3 border border-black ${formData.items[key] ? 'bg-black' : ''}`}></span>
                          <span className={`text-[10px] ${formData.items[key] ? 'font-bold' : 'text-slate-200'}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 行: 期限 */}
                <div className="flex border-b-[1.5px] border-black text-xs">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center">提出期限</div>
                  <div className="flex-1 p-2 flex items-center gap-10">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 border border-black ${formData.deadlineType === '無' ? 'bg-black' : ''}`}></span>
                      <span>無</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className={`w-3.5 h-3.5 border border-black ${formData.deadlineType === '有' ? 'bg-black' : ''}`}></span>
                      <span>有</span>
                      <span className="ml-2 border-b border-black flex-1 text-center font-mono h-5">
                        {formData.deadlineType === '有' && formData.deadlineDate ? formData.deadlineDate.replace(/-/g, '/') : '　　/　/　'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 行: 専用診断用紙 */}
                <div className="flex border-b-[1.5px] border-black text-xs">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center">専用用紙</div>
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

                {/* 行: その他 */}
                <div className="flex min-h-[180px]">
                  <div className="w-[100px] bg-slate-100 p-2 font-bold border-r-[1.5px] border-black flex items-center justify-center text-xs">その他</div>
                  <div className="flex-1 p-4 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 italic">
                    {formData.others}
                  </div>
                </div>
              </div>

              {/* 下部 */}
              <div className="mt-auto flex justify-between items-end pt-10 border-t border-slate-100">
                <div className="text-[9px] text-slate-400 font-mono italic tracking-wider">RESERVATION_SYS_GEN_2.5</div>
                <div className="text-right">
                  <div className="text-sm font-black border-b-2 border-black mb-1 px-1 inline-block">〇〇総合病院 健診センター</div>
                  <div className="text-[10px] text-slate-500">〒000-0000 〇〇県〇〇市〇〇町123-45</div>
                  <div className="text-[11px] font-bold tracking-tight">窓口電話: 012-3456-7890 (内線 112)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; margin: 0; padding: 0; }
          body > div { padding: 0 !important; }
          .min-h-screen, .max-w-\\[1400px\\] { max-width: 100% !important; margin: 0 !important; padding: 0 !important; display: block !important; }
          .flex-1, .inline-flex, .text-slate-400, button, h3, .sticky > div:first-child { display: none !important; }
          .w-full.lg\\:w-\\[595px\\] { width: 100% !important; margin: 0 !important; }
          .bg-white.shadow-2xl {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 20mm !important;
            visibility: visible !important;
          }
          .bg-slate-100 { -webkit-print-color-adjust: exact; background-color: #f1f5f9 !important; }
          * { visibility: hidden; }
          #printable, #printable * { visibility: visible !important; }
          #printable { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
}
