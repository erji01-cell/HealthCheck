import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Printer, Save, Calendar, User, Phone, ClipboardCheck,
  CreditCard, PlusCircle, RotateCcw, ChevronLeft, ChevronRight,
  ListTodo, Info, Search, LogIn, LogOut, Trash2, Database, Download, Upload, RefreshCw
} from 'lucide-react';
import {
  performBackup, listStorageBackups, downloadStorageBackup, restoreFromPayload,
  getLastBackupTime, isAutoBackupEnabled, setAutoBackupEnabled, getBackupItemTime
} from './lib/backup.js';
import {
  HOLIDAYS,
  HOLIDAYS_COVERAGE_END,
  KURITAS_BLOOD_LABELS,
  HAPILUS_BLOOD_LABELS,
  SPECIAL_COMPANY_PURPOSES,
  BP_TWO_MEASURE_LOCKED_PURPOSES,
  getCompanyBillingLabel,
  buildKuritasBloodNotes,
  calcFee,
  calcKuritasFee,
  getItemsForPurpose,
  stripKuritasBloodNotes,
} from './lib/healthCheckConfig.js';
import ReservationDetailCard from './components/ReservationDetailCard.jsx';
import TodayReservationsModal from './components/TodayReservationsModal.jsx';
import KenshinCertificate from './components/KenshinCertificate.jsx';
import RecordSheetPreview from './components/RecordSheetPreview.jsx';
import AttachmentSheet from './components/AttachmentSheet.jsx';
import {
  getBloodArrow,
  kenshinInitialState,
  getWeekdayFromIso,
  toWareki,
  toWareikiWithWestern,
  getBirthEra,
  formatDobDisplay,
} from './lib/kenshinUtils.js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

const normalizeCompanyName = (value = '') =>
  value.replace(/\u3000/g, ' ').replace(/\s+/g, ' ').trim();

const getCompanyNameKey = (value = '') => normalizeCompanyName(value).toLowerCase();
const CALENDAR_COMPANY_STORAGE_KEY = 'health_check_calendar_company_id';

const getStoredCalendarCompanyId = () => {
  try {
    return window.localStorage.getItem(CALENDAR_COMPANY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};


const getLocalIsoDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
// 健診目的フィルタの選択肢（健診目的ラジオと同じ並び）
const CALENDAR_PURPOSE_OPTIONS = [
  '就職', '進学', '企業健診', '特定健診(社保)', '特定健診(国保)', '長寿健診', '入園児', 'その他',
  'クリタス定期健診', 'クリタス特定業務',
  'ハピルスA', 'ハピルスB', 'ハピルスC', 'ハピルス雇入時', 'ハピルス深夜業',
  '第一生命', '第一生命 採血も',
];


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
  const [resultSearchMode, setResultSearchMode] = useState('reservation'); // 'reservation' | 'patient'
  const [resultQuery, setResultQuery] = useState('');
  const [resultSuggestions, setResultSuggestions] = useState([]);
  const [showResultSuggestions, setShowResultSuggestions] = useState(false);
  const [resultSearching, setResultSearching] = useState(false);
  const [selectedKenshinReservation, setSelectedKenshinReservation] = useState(null);
  const [birthDateInput, setBirthDateInput] = useState('');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [modalQuery, setModalQuery] = useState('');
  const [modalSuggestions, setModalSuggestions] = useState([]);
  const [modalSearching, setModalSearching] = useState(false);
  const searchRef = useRef(null);
  const resultSearchRef = useRef(null);
  const reservationCompanyRef = useRef(null);
  const kenshinCompanyRef = useRef(null);
  const currentMonthRef = useRef(null);
  const calendarScrollRef = useRef(null);
  const pendingCalendarScrollRef = useRef(false);
  const modalSearchRef = useRef(null);
  const kenshinTopRef = useRef(null);
  const kenshinBottomRef = useRef(null);

  // 初期状態の定義
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalIsoDate(tomorrow);
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
    companyId: '',
    purpose: '就職',
    hasHospitalForm: '無(当院用紙を使用)',
    items: {
      heightWeight: true,
      abdominalGirth: true,
      bloodPressure: true,
      vision: true,
      colorVision: false,
      hearing: true,
      urine: true,
      xRay: true,
      ecg: true,
      blood: true,
      pulse: false,
      bloodKuritasRegular: false,
      bloodKuritasSpecific: false,
      bloodHapilusB: false,
      bloodHapilusC: false,
      bloodHapilusHire: false,
      bloodHapilusNight: false,
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
    bpMeasureCount: '1',
    bp1Sys: '', bp1Dia: '',
    bp2Sys: '', bp2Dia: '',
    pulse: '',
    height: '', weight: '', bmi: '', waist: '', chest: '',
    visionR: '', visionL: '', visionR2: '', visionL2: '',
    hearingR: '', hearingL: '', hearingR2: '', hearingL2: '',
    colorVision: '',
    staffId: '', staffName: ''
  };

  const [formData, setFormData] = useState(initialState);
  const [staffMembers, setStaffMembers] = useState([]);
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'saving' | 'saved' | 'error'
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [editingReservationId, setEditingReservationId] = useState(null);
  const [rightTab, setRightTab] = useState('calendar'); // 'preview' | 'calendar'
  const [calendarData, setCalendarData] = useState({}); // { 'YYYY-MM-DD': [reservations] }
  const [calendarDetailData, setCalendarDetailData] = useState({}); // { 'YYYY-MM-DD': [detailed reservations] }
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarDetailLoading, setCalendarDetailLoading] = useState(false);
  const [calendarDetailError, setCalendarDetailError] = useState('');
  const [singleReservationDetail, setSingleReservationDetail] = useState(null);
  const [singleReservationLoading, setSingleReservationLoading] = useState(false);
  const [singleReservationError, setSingleReservationError] = useState('');
  const [showTodayReservationsModal, setShowTodayReservationsModal] = useState(false);
  const [todayReservationsDate, setTodayReservationsDate] = useState(getLocalIsoDate);
  const [todayReservations, setTodayReservations] = useState([]);
  const [todayReservationsLoading, setTodayReservationsLoading] = useState(false);
  const [todayReservationsError, setTodayReservationsError] = useState('');
  const todayReservationsModalOpenedRef = useRef(false);
  const [calendarCompanyId, setCalendarCompanyId] = useState(getStoredCalendarCompanyId);
  // 認証監視など [] 依存のeffectから最新の選択団体を参照するためのref（stale closure対策）
  const calendarCompanyIdRef = useRef(calendarCompanyId);
  const [calendarViewMode, setCalendarViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [calendarListData, setCalendarListData] = useState([]);
  const [calendarListSortField, setCalendarListSortField] = useState('date'); // 'date' | 'fee' | 'kana' | 'registered'
  const [calendarListSortDir, setCalendarListSortDir] = useState('asc'); // 'asc' | 'desc'
  const [calendarPurpose, setCalendarPurpose] = useState(''); // 健診目的フィルタ（''=すべて）
  const [calendarDateFrom, setCalendarDateFrom] = useState('');
  const [calendarDateTo, setCalendarDateTo] = useState('');
  const [calendarListLoading, setCalendarListLoading] = useState(false);
  const [calendarListError, setCalendarListError] = useState('');
  const [printMode, setPrintMode] = useState('');
  const [printAttachmentSheet, setPrintAttachmentSheet] = useState(true);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null });
  const [leftTab, setLeftTab] = useState('reservation'); // 'reservation' | 'result'
  const [kenshinData, setKenshinData] = useState(kenshinInitialState);
  const [kenshinBirthDateInput, setKenshinBirthDateInput] = useState('');
  const [kenshinSaveStatus, setKenshinSaveStatus] = useState(''); // '' | 'saving' | 'saved' | 'error'
  const [showKenshinModal, setShowKenshinModal] = useState(false);
  const [kenshinModalQuery, setKenshinModalQuery] = useState('');
  const [kenshinModalResults, setKenshinModalResults] = useState([]);
  const [kenshinModalAllResults, setKenshinModalAllResults] = useState([]);
  const [kenshinModalSearching, setKenshinModalSearching] = useState(false);
  const [highlightedField, setHighlightedField] = useState(null);
  // バックアップ管理
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupList, setBackupList] = useState([]);
  const [backupListLoading, setBackupListLoading] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [autoBackupOn, setAutoBackupOn] = useState(isAutoBackupEnabled());
  const [lastBackupAt, setLastBackupAt] = useState(getLastBackupTime());
  const [restoreReplace, setRestoreReplace] = useState(true); // 復元方式：true=完全置換 / false=追加・上書き
  const [backupWarning, setBackupWarning] = useState(''); // バックアップ関連の警告バナー
  const restoreInputRef = useRef(null);
  const [healthCompanies, setHealthCompanies] = useState([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyPickerTarget, setCompanyPickerTarget] = useState(null);
  const [companyEditValues, setCompanyEditValues] = useState({});
  const [companyNoEditValues, setCompanyNoEditValues] = useState({});
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [newCompanyNo, setNewCompanyNo] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [companySaveStatus, setCompanySaveStatus] = useState('');
  const [showReservationCompanyOptions, setShowReservationCompanyOptions] = useState(false);
  const [showKenshinCompanyOptions, setShowKenshinCompanyOptions] = useState(false);

  // 診断結果入力：生年月日→年齢自動計算
  useEffect(() => {
    if (kenshinData.kBirthDate && kenshinData.kDate) {
      const birth = new Date(kenshinData.kBirthDate);
      const target = new Date(kenshinData.kDate);
      let age = target.getFullYear() - birth.getFullYear();
      const m = target.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && target.getDate() < birth.getDate())) age--;
      setKenshinData(prev => ({ ...prev, kAge: age >= 0 ? age : '' }));
    } else {
      setKenshinData(prev => ({ ...prev, kAge: '' }));
    }
  }, [kenshinData.kBirthDate, kenshinData.kDate]);

  // 通知ダイアログ（OKのみ・alert代替）
  const showNotice = (message) => {
    setConfirmDialog({ show: true, message, onConfirm: null, noticeOnly: true });
  };

  // 1年以上前の予約データを自動削除
  const deleteOldReservations = async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffDate = getLocalIsoDate(oneYearAgo);
    const { error } = await supabase.from('health_reserv').delete().lt('date', cutoffDate);
    if (error) {
      console.error('古い予約の自動削除に失敗:', error);
      showNotice('古い予約データの自動削除に失敗しました。\nSupabaseの設定（RLSポリシー等）を確認してください。');
    }
  };

  const fetchHealthCompanies = async () => {
    const { data, error } = await supabase
      .from('health_companies')
      .select('id, display_no, name, name_key, is_active')
      .order('display_no', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });
    if (error) {
      console.error('health_companies fetch error:', error);
      return [];
    }
    const companies = sortHealthCompanies(data || []);
    setHealthCompanies(companies);
    return companies;
  };

  const findHealthCompany = (name) => {
    const key = getCompanyNameKey(name);
    if (!key) return null;
    return healthCompanies.find(c => (c.name_key || getCompanyNameKey(c.name)) === key) || null;
  };

  const sortHealthCompanies = (companies) =>
    [...companies].sort((a, b) => {
      const aNo = Number(a.display_no);
      const bNo = Number(b.display_no);
      const aHasNo = Number.isInteger(aNo);
      const bHasNo = Number.isInteger(bNo);
      if (aHasNo && bHasNo && aNo !== bNo) return aNo - bNo;
      if (aHasNo !== bHasNo) return aHasNo ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '', 'ja');
    });

  const getActiveHealthCompanies = () =>
    healthCompanies.filter(company => company.is_active !== false);

  const getFilteredHealthCompanies = (query) => {
    const key = getCompanyNameKey(query);
    const activeCompanies = getActiveHealthCompanies();
    if (!key) return activeCompanies;
    return activeCompanies.filter(company =>
      String(company.display_no || '').includes(key) ||
      getCompanyNameKey(company.name).includes(key) ||
      (company.name_key || '').includes(key)
    );
  };

  const findHealthCompanyByDisplayNo = (value) => {
    const no = parseInt(String(value).trim(), 10);
    if (!Number.isInteger(no)) return null;
    return getActiveHealthCompanies().find(company => Number(company.display_no) === no) || null;
  };

  const getNextCompanyDisplayNo = () => {
    const maxNo = healthCompanies.reduce((max, company) => {
      const no = Number(company.display_no);
      return Number.isInteger(no) && no > max ? no : max;
    }, 0);
    return maxNo + 1;
  };

  const resolveSelectedHealthCompany = (companyId, companyName) => {
    const normalizedName = normalizeCompanyName(companyName);
    if (companyId) {
      const selected = healthCompanies.find(c => c.id === companyId);
      return { id: companyId, name: selected?.name || normalizedName };
    }
    return { id: null, name: '' };
  };

  const formatSupabaseError = (error) => {
    if (!error) return '';
    return [error.message, error.details, error.hint, error.code ? `code: ${error.code}` : '']
      .filter(Boolean)
      .join(' / ');
  };

  const saveHealthReservationRecord = async (record, overrideId = null) => {
    const targetId = overrideId || editingReservationId;
    return targetId
      ? supabase.from('health_reserv').update(record).eq('id', targetId)
      : supabase.from('health_reserv').insert(record);
  };

  const ensureHealthCompany = async (name) => {
    const normalizedName = normalizeCompanyName(name);
    if (!normalizedName) return { id: null, name: '' };

    const key = getCompanyNameKey(normalizedName);
    const existing = findHealthCompany(normalizedName);
    if (existing) return existing;

    const { data: found, error: findError } = await supabase
      .from('health_companies')
      .select('id, display_no, name, name_key, is_active')
      .eq('name_key', key)
      .maybeSingle();
    if (!findError && found) {
      const activeCompany = found.is_active ? found : { ...found, is_active: true };
      if (!found.is_active) {
        await supabase.from('health_companies').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', found.id);
      }
      setHealthCompanies(prev => sortHealthCompanies(prev.some(c => c.id === found.id)
        ? prev.map(c => c.id === found.id ? activeCompany : c)
        : [...prev, activeCompany]));
      return activeCompany;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('health_companies')
      .insert({ display_no: getNextCompanyDisplayNo(), name: normalizedName, name_key: key })
      .select('id, display_no, name, name_key, is_active')
      .single();

    if (insertError) {
      const { data: retry } = await supabase
        .from('health_companies')
        .select('id, display_no, name, name_key, is_active')
        .eq('name_key', key)
        .maybeSingle();
      if (retry) return retry;
      throw insertError;
    }

    setHealthCompanies(prev => sortHealthCompanies([...prev, inserted]));
    return inserted;
  };

  const openCompanyModal = async (target = null) => {
    const companies = await fetchHealthCompanies();
    setCompanyEditValues(Object.fromEntries(companies.map(c => [c.id, c.name])));
    setCompanyNoEditValues(Object.fromEntries(companies.map(c => [c.id, c.display_no ?? ''])));
    setCompanyPickerTarget(target);
    setCompanySaveStatus('');
    setShowCompanyModal(true);
  };

  const closeCompanyModal = () => {
    setShowCompanyModal(false);
    setCompanyPickerTarget(null);
  };

  const handleSelectHealthCompany = (company) => {
    if (companyPickerTarget === 'reservation') {
      setFormData(prev => ({ ...prev, companyId: company.id || '', companyName: company.name || '' }));
    }
    if (companyPickerTarget === 'kenshin') {
      setKenshinData(prev => ({ ...prev, kCompanyId: company.id || '', kCompanyName: company.name || '' }));
    }
    closeCompanyModal();
  };

  const handleReservationCompanyInput = (e) => {
    const value = e.target.value;
    const company = findHealthCompany(value);
    setFormData(prev => ({
      ...prev,
      companyName: value,
      companyId: company?.id || '',
    }));
    setShowReservationCompanyOptions(true);
  };

  const handleReservationCompanyOptionSelect = (company) => {
    setFormData(prev => ({
      ...prev,
      companyId: company?.id || '',
      companyName: company?.name || '',
    }));
    setShowReservationCompanyOptions(false);
  };

  const handleKenshinCompanyInput = (e) => {
    const value = e.target.value;
    const company = findHealthCompany(value);
    setKenshinData(prev => ({
      ...prev,
      kCompanyName: value,
      kCompanyId: company?.id || '',
    }));
    setShowKenshinCompanyOptions(true);
  };

  const handleKenshinCompanyOptionSelect = (company) => {
    setKenshinData(prev => ({
      ...prev,
      kCompanyId: company?.id || '',
      kCompanyName: company?.name || '',
    }));
    setShowKenshinCompanyOptions(false);
  };

  const refreshCompanyEditValues = async () => {
    const companies = await fetchHealthCompanies();
    setCompanyEditValues(Object.fromEntries(companies.map(c => [c.id, c.name])));
    setCompanyNoEditValues(Object.fromEntries(companies.map(c => [c.id, c.display_no ?? ''])));
  };

  const handleAddHealthCompany = async () => {
    const normalizedName = normalizeCompanyName(newCompanyName);
    if (!normalizedName) return;
    setCompanySaveStatus('saving');
    try {
      const company = await ensureHealthCompany(normalizedName);
      const displayNo = parseInt(String(newCompanyNo).trim(), 10);
      if (Number.isInteger(displayNo) && displayNo > 0 && company.display_no !== displayNo) {
        const { error } = await supabase
          .from('health_companies')
          .update({ display_no: displayNo, updated_at: new Date().toISOString() })
          .eq('id', company.id);
        if (error) throw error;
      }
      setNewCompanyName('');
      setNewCompanyNo('');
      await refreshCompanyEditValues();
      setCompanySaveStatus('saved');
    } catch (e) {
      console.error('health company add error:', e);
      setCompanySaveStatus('error');
    }
    setTimeout(() => setCompanySaveStatus(''), 2500);
  };

  const handleUpdateHealthCompany = async (company) => {
    const normalizedName = normalizeCompanyName(companyEditValues[company.id]);
    if (!normalizedName) return;
    const key = getCompanyNameKey(normalizedName);
    const displayNoValue = String(companyNoEditValues[company.id] ?? '').trim();
    const displayNo = displayNoValue ? parseInt(displayNoValue, 10) : null;
    if (displayNoValue && (!Number.isInteger(displayNo) || displayNo <= 0)) {
      setCompanySaveStatus('error');
      setTimeout(() => setCompanySaveStatus(''), 2500);
      return;
    }
    const hasNoChanged = (company.display_no ?? null) !== displayNo;
    if (normalizedName === company.name && key === company.name_key && !hasNoChanged) return;

    setCompanySaveStatus('saving');
    const { error } = await supabase
      .from('health_companies')
      .update({ display_no: displayNo, name: normalizedName, name_key: key, updated_at: new Date().toISOString() })
      .eq('id', company.id);

    if (error) {
      console.error('health company update error:', error);
      setCompanySaveStatus('error');
      setTimeout(() => setCompanySaveStatus(''), 2500);
      return;
    }

    await Promise.all([
      supabase.from('health_reserv').update({ company_name: normalizedName }).eq('company_id', company.id),
      supabase.from('health_data').update({ k_company_name: normalizedName }).eq('company_id', company.id),
    ]);

    await refreshCompanyEditValues();
    setFormData(prev => prev.companyId === company.id ? { ...prev, companyName: normalizedName } : prev);
    setKenshinData(prev => prev.kCompanyId === company.id ? { ...prev, kCompanyName: normalizedName } : prev);
    setCompanySaveStatus('saved');
    setTimeout(() => setCompanySaveStatus(''), 2500);
  };

  // セッション監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchCalendarData(calendarCompanyIdRef.current);
        fetchHealthCompanies();
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchCalendarData(calendarCompanyIdRef.current);
        fetchHealthCompanies();
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

  // 自動バックアップ（ログイン後・1日1回）＋バックアップ確認後の古い予約自動削除
  const startupMaintenanceRanRef = useRef(false);
  useEffect(() => {
    if (!session) return;
    if (startupMaintenanceRanRef.current) return;
    startupMaintenanceRanRef.current = true;
    (async () => {
      // 起動時は毎回チェック：前回バックアップと差分があればバックアップ（同一ならスキップ）
      let failMsg = '';
      if (isAutoBackupEnabled()) {
        try {
          await performBackup(session, { downloadLocal: false, skipIfUnchanged: true });
        } catch (err) {
          failMsg = `自動バックアップに失敗しました（${err?.message || '不明なエラー'}）。バックアップ管理から手動バックアップを実行してください。`;
        }
      }
      setLastBackupAt(getLastBackupTime());

      // バックアップ健全性チェック（最終バックアップが古すぎないか確認して警告）
      let latestBackup = 0;
      try {
        const backups = await listStorageBackups(session);
        latestBackup = backups.reduce((m, it) => Math.max(m, getBackupItemTime(it)), 0);
      } catch {
        /* 一覧取得失敗時は下の警告分岐で処理 */
      }
      if (!latestBackup) {
        setBackupWarning(failMsg || 'バックアップがまだ一度も作成されていません。バックアップ管理からバックアップを実行してください。');
      } else {
        const days = Math.floor((Date.now() - latestBackup) / (24 * 60 * 60 * 1000));
        if (days >= 8) {
          setBackupWarning(`最後のバックアップから${days}日経過しています。バックアップ管理からバックアップを実行してください。`);
        } else if (failMsg) {
          setBackupWarning(failMsg);
        }
      }

      // 直近7日以内のバックアップが確認できた場合のみ自動削除を実行する
      const RECENT_BACKUP_MS = 7 * 24 * 60 * 60 * 1000;
      if (latestBackup && Date.now() - latestBackup < RECENT_BACKUP_MS) {
        deleteOldReservations();
      } else {
        console.warn('直近のバックアップが確認できないため、古い予約の自動削除をスキップしました。');
      }

      // 祝日リストの期限切れ警告（終了60日前から表示）
      const warnFrom = new Date(HOLIDAYS_COVERAGE_END);
      warnFrom.setDate(warnFrom.getDate() - 60);
      if (new Date() >= warnFrom) {
        showNotice(`祝日リストは ${HOLIDAYS_COVERAGE_END.slice(0, 4)}年末までしか登録されていません。\n来年の祝日判定が効かなくなるため、祝日リストの更新（healthCheckConfig.js の HOLIDAYS）が必要です。`);
      }
    })();
  }, [session]);

  // 担当者一覧取得（invent_staff）
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data, error } = await supabase
        .from('invent_staff')
        .select('id, name, is_active')
        .order('id', { ascending: true });
      if (error) {
        console.error('担当者一覧の読み込みに失敗しました:', error);
        return;
      }
      setStaffMembers((data ?? []).filter(member => member.is_active !== false));
    })();
  }, [session]);

  // バックアップ一覧取得
  const refreshBackupList = async () => {
    if (!session) return;
    setBackupListLoading(true);
    try {
      const list = await listStorageBackups(session);
      setBackupList(list);
    } catch (err) {
      setBackupMessage(`一覧取得失敗: ${err.message}`);
    } finally {
      setBackupListLoading(false);
    }
  };

  // ワンクリック即バックアップ（Storageへ保存のみ・ローカルDLなし）
  const [quickBackupBusy, setQuickBackupBusy] = useState(false);
  const handleQuickBackup = async () => {
    if (!session || quickBackupBusy) return;
    setQuickBackupBusy(true);
    try {
      await performBackup(session, { downloadLocal: false });
      setLastBackupAt(getLastBackupTime());
      showNotice('バックアップが完了しました');
      if (showBackupModal) await refreshBackupList();
    } catch (err) {
      showNotice('バックアップに失敗しました: ' + err.message);
    } finally {
      setQuickBackupBusy(false);
    }
  };

  // 手動バックアップ
  const handleManualBackup = async () => {
    if (!session || backupBusy) return;
    setBackupBusy(true);
    setBackupMessage('バックアップ中...');
    try {
      const { fileName, pruneResult } = await performBackup(session, { downloadLocal: true, prune: true });
      setLastBackupAt(getLastBackupTime());
      const pruneMsg = pruneResult?.deleted ? `（古い ${pruneResult.deleted} 件を削除）` : '';
      setBackupMessage(`完了: ${fileName.split('/').pop()} ${pruneMsg}`);
      await refreshBackupList();
    } catch (err) {
      setBackupMessage(`失敗: ${err.message}`);
    } finally {
      setBackupBusy(false);
    }
  };

  // 復元確認の文言（復元方式によって切り替え）
  const restoreConfirmText = (label) => restoreReplace
    ? `「${label}」から復元しますか？\n\n【完全置換】現在のデータはすべて削除され、バックアップ時点の状態に完全に戻ります。\nバックアップ後に追加したデータも消えます。`
    : `「${label}」から復元しますか？\n\n【追加・上書き】バックアップの内容を追加・上書きします。\nバックアップに無い現在のデータはそのまま残ります。`;

  // ファイルから復元
  const handleRestoreFromFile = (file) => {
    if (!file || !session) return;
    setConfirmDialog({
      show: true,
      message: restoreConfirmText(file.name),
      onConfirm: () => {
        setConfirmDialog({ show: false, message: '', onConfirm: null });
        performRestoreFromFile(file);
      },
    });
  };

  const performRestoreFromFile = async (file) => {
    setBackupBusy(true);
    setBackupMessage('復元中...');
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const results = await restoreFromPayload(payload, session, { replace: restoreReplace });
      const summary = Object.entries(results).map(([t, n]) => `${t}: ${n}件`).join(' / ');
      setBackupMessage(`復元完了: ${summary}`);
    } catch (err) {
      setBackupMessage(`復元失敗: ${err.message}`);
    } finally {
      setBackupBusy(false);
    }
  };

  // Storageから復元
  const handleRestoreFromStorage = (fileName) => {
    if (!session) return;
    setConfirmDialog({
      show: true,
      message: restoreConfirmText(fileName.split('/').pop()),
      onConfirm: () => {
        setConfirmDialog({ show: false, message: '', onConfirm: null });
        performRestoreFromStorage(fileName);
      },
    });
  };

  const performRestoreFromStorage = async (fileName) => {
    setBackupBusy(true);
    setBackupMessage('復元中...');
    try {
      const payload = await downloadStorageBackup(session, fileName);
      const results = await restoreFromPayload(payload, session, { replace: restoreReplace });
      const summary = Object.entries(results).map(([t, n]) => `${t}: ${n}件`).join(' / ');
      setBackupMessage(`復元完了: ${summary}`);
    } catch (err) {
      setBackupMessage(`復元失敗: ${err.message}`);
    } finally {
      setBackupBusy(false);
    }
  };

  // Storageからダウンロード
  const handleDownloadFromStorage = async (fileName) => {
    if (!session) return;
    try {
      const payload = await downloadStorageBackup(session, fileName);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.split('/').pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setBackupMessage(`ダウンロード失敗: ${err.message}`);
    }
  };

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

  // 曜日計算（保存用：日付文字列からタイムゾーン非依存で算出）
  useEffect(() => {
    if (formData.date) {
      const day = getWeekdayFromIso(formData.date);
      setFormData(prev => (prev.dayOfWeek === day ? prev : { ...prev, dayOfWeek: day }));
    }
  }, [formData.date]);

  const getCalendarDataRange = () => {
    const today = new Date();
    // カレンダー表示と同じ「過去12ヶ月〜先12ヶ月」を月初〜月末で完全カバー（タイムゾーン非依存）
    const startD = new Date(today.getFullYear(), today.getMonth() - 12, 1);
    const endD = new Date(today.getFullYear(), today.getMonth() + 13, 0);
    const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    return { start: fmt(startD), end: fmt(endD) };
  };

  const getReservationItemLabels = (r) => [
    r.item_height_weight && '身長/体重',
    r.item_abdominal_girth && '腹囲',
    r.item_blood_pressure && `血圧${Number(r.bp_measure_count) === 2 ? '2回' : '1回'}`,
    r.item_vision && '視力',
    r.item_pulse && '脈拍',
    r.item_color_vision && '色神',
    r.item_hearing && '聴力',
    r.item_urine && '尿検査',
    r.item_x_ray && 'X-P',
    r.item_ecg && '心電図',
    r.item_blood && '採血',
    r.item_blood_kuritas_regular && KURITAS_BLOOD_LABELS.regular,
    r.item_blood_kuritas_specific && KURITAS_BLOOD_LABELS.specific,
    r.item_blood_hapilus_b && HAPILUS_BLOOD_LABELS.b,
    r.item_blood_hapilus_c && HAPILUS_BLOOD_LABELS.c,
    r.item_blood_hapilus_hire && HAPILUS_BLOOD_LABELS.hire,
    r.item_blood_hapilus_night && HAPILUS_BLOOD_LABELS.night,
    r.item_hba1c && 'HbA1c',
    r.item_endoscopy && '胃内視鏡',
    r.item_echo && '腹部エコー',
    r.item_manganese && 'マンガン',
    r.item_stool && '便潜血',
    r.item_norovirus && 'ノロウイルス',
    r.item_bacteria3 && '3菌種',
    r.item_bacteria5 && '5菌種',
    r.item_paratyphoid && 'パラチフス',
    r.item_methanol && 'メタノール',
    r.item_hexane && 'ノルマルヘキサン',
    r.item_methyl_hippuric && 'メチル馬尿酸',
    r.item_psa && 'PSA',
    r.item_hbs_ag && 'HBs抗原',
    r.item_hbs_ab && 'HBs抗体',
    r.item_hcv_ab && 'HCV抗体',
    r.item_syphilis && '梅毒STS',
    r.item_mrsa && 'MRSA',
  ].filter(Boolean);

  const formatReservationFee = (fee) => {
    if (fee == null || fee === '') return '-';
    const num = Number(fee);
    return Number.isFinite(num) ? `¥${num.toLocaleString()}` : '-';
  };

  // 健診目的フィルタ（''=すべて）
  const matchesCalendarPurpose = (r) => !calendarPurpose || r.purpose === calendarPurpose;
  const matchesCalendarDateRange = (r) => {
    const date = String(r.date || '');
    if (!date) return false;
    if (calendarDateFrom && date < calendarDateFrom) return false;
    if (calendarDateTo && date > calendarDateTo) return false;
    return true;
  };
  const matchesCalendarFilters = (r) => matchesCalendarPurpose(r) && matchesCalendarDateRange(r);
  const getFilteredCalendarListData = () => calendarListData.filter(matchesCalendarFilters);
  const getCalendarDateRangeLabel = () => {
    if (!calendarDateFrom && !calendarDateTo) return '';
    const from = calendarDateFrom ? calendarDateFrom.replace(/-/g, '/') : '指定なし';
    const to = calendarDateTo ? calendarDateTo.replace(/-/g, '/') : '指定なし';
    return `期間: ${from} 〜 ${to}`;
  };
  const getCalendarListEmptyMessage = () => {
    const filters = [
      calendarCompanyId && 'この団体',
      calendarPurpose && `「${calendarPurpose}」`,
      getCalendarDateRangeLabel(),
    ].filter(Boolean);
    return filters.length ? `${filters.join(' / ')}の予約はありません` : '予約はありません';
  };

  const getCalendarListTotalFee = () =>
    getFilteredCalendarListData().reduce((sum, r) => {
      const num = Number(r.fee);
      return Number.isFinite(num) ? sum + num : sum;
    }, 0);

  // 金額別の件数・小計（金額の高い順）。料金null（請求分）は別枠で集計
  const getCalendarListFeeBreakdown = () => {
    const map = new Map(); // fee(number) -> count
    let billingCount = 0;
    const filtered = getFilteredCalendarListData();
    filtered.forEach(r => {
      const num = Number(r.fee);
      if (Number.isFinite(num)) {
        map.set(num, (map.get(num) || 0) + 1);
      } else {
        billingCount += 1;
      }
    });
    const feeGroups = [...map.entries()]
      .map(([fee, count]) => ({ fee, count, subtotal: fee * count }))
      .sort((a, b) => b.fee - a.fee);
    return { feeGroups, billingCount, totalCount: filtered.length };
  };

  const getCalendarListSortLabel = () => {
    const fieldLabel = {
      date: '健診日',
      fee: '金額',
      kana: '読み仮名',
      registered: '登録',
    }[calendarListSortField] || '健診日';
    const dirLabel = calendarListSortDir === 'desc' ? '降順' : '昇順';
    return `${fieldLabel} ${dirLabel}`;
  };

  const compareCalendarListByDate = (a, b) =>
    String(a.date || '').localeCompare(String(b.date || '')) ||
    String(a.patient_name_kana || a.patient_name || '').localeCompare(String(b.patient_name_kana || b.patient_name || ''), 'ja');

  const getCalendarListFeeValue = (r) => {
    const num = Number(r.fee);
    return Number.isFinite(num) ? num : null;
  };

  const getSortedCalendarListData = () => {
    const list = getFilteredCalendarListData();
    const desc = calendarListSortDir === 'desc';
    const flip = (n) => (desc ? -n : n);

    if (calendarListSortField === 'registered') {
      // id は uuid のため登録順は created_at で判定（フォールバックで id 文字列）
      return list.sort((a, b) =>
        flip(String(a.created_at || '').localeCompare(String(b.created_at || ''))) ||
        String(a.id || '').localeCompare(String(b.id || ''))
      );
    }
    if (calendarListSortField === 'kana') {
      return list.sort((a, b) =>
        flip(String(a.patient_name_kana || a.patient_name || '').localeCompare(String(b.patient_name_kana || b.patient_name || ''), 'ja')) ||
        compareCalendarListByDate(a, b)
      );
    }
    if (calendarListSortField === 'fee') {
      return list.sort((a, b) => {
        const aFee = getCalendarListFeeValue(a);
        const bFee = getCalendarListFeeValue(b);
        if (aFee == null && bFee == null) return compareCalendarListByDate(a, b);
        if (aFee == null) return 1; // 金額なしは常に末尾
        if (bFee == null) return -1;
        return flip(aFee - bFee) || compareCalendarListByDate(a, b);
      });
    }
    // date
    return list.sort((a, b) =>
      flip(String(a.date || '').localeCompare(String(b.date || ''))) ||
      String(a.patient_name_kana || a.patient_name || '').localeCompare(String(b.patient_name_kana || b.patient_name || ''), 'ja')
    );
  };

  const getSelectedCalendarCompanyName = () => {
    if (!calendarCompanyId) return 'すべての団体';
    const company = healthCompanies.find(c => c.id === calendarCompanyId);
    if (!company) return '';
    return `${company.display_no != null ? `${company.display_no} ` : ''}${company.name}`;
  };

  const handlePrintCompanyList = () => {
    if (calendarViewMode !== 'list') return;
    setPrintMode('companyList');
    setTimeout(() => window.print(), 50);
  };

  const fetchReservationDetailById = async (reservationId) => {
    setSingleReservationDetail(null);
    setSingleReservationError('');
    setSingleReservationLoading(true);
    const { data, error } = await supabase
      .from('health_reserv')
      .select('id, date, patient_id, patient_name, patient_name_kana, patient_gender, birth_date, age, company_id, company_name, purpose, payment_type, fee, bp_measure_count, item_height_weight, item_abdominal_girth, item_blood_pressure, item_vision, item_color_vision, item_pulse, item_hearing, item_urine, item_x_ray, item_ecg, item_blood, item_blood_kuritas_regular, item_blood_kuritas_specific, item_blood_hapilus_b, item_blood_hapilus_c, item_blood_hapilus_hire, item_blood_hapilus_night, item_hba1c, item_endoscopy, item_echo, item_manganese, item_stool, item_norovirus, item_bacteria3, item_bacteria5, item_paratyphoid, item_methanol, item_hexane, item_methyl_hippuric, item_psa, item_hbs_ag, item_hbs_ab, item_hcv_ab, item_syphilis, item_mrsa, deadline_type, deadline_date, has_dedicated_form, others')
      .eq('id', reservationId)
      .single();
    if (error || !data) {
      setSingleReservationError('予約詳細の取得に失敗しました。');
    } else {
      setSingleReservationDetail(data);
    }
    setSingleReservationLoading(false);
  };

  const fetchTodayReservations = async () => {
    const today = getLocalIsoDate();
    setTodayReservationsDate(today);
    setTodayReservations([]);
    setTodayReservationsError('');
    setTodayReservationsLoading(true);

    const { data, error } = await supabase
      .from('health_reserv')
      .select('*')
      .eq('date', today)
      .order('patient_name_kana', { ascending: true })
      .order('patient_name', { ascending: true });

    if (error) {
      console.error('today reservations fetch error:', error);
      setTodayReservationsError('\u672c\u65e5\u306e\u4e88\u7d04\u4e00\u89a7\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002');
    } else {
      setTodayReservations(data || []);
    }
    setTodayReservationsLoading(false);
  };

  // カレンダーのスクロール枠を当月の月セルへ合わせる（stickyバー分オフセット）
  const doScrollCalendarToCurrentMonth = () => {
    const wrapper = calendarScrollRef.current;
    const monthEl = currentMonthRef.current;
    if (!wrapper || !monthEl) return false;
    const stickyBar = wrapper.querySelector('.company-list-print-hide');
    const headerH = stickyBar ? stickyBar.offsetHeight : 0;
    const delta = monthEl.getBoundingClientRect().top - wrapper.getBoundingClientRect().top - headerH;
    wrapper.scrollTop += delta;
    return true;
  };

  const openTodayReservationsModal = () => {
    setShowTodayReservationsModal(true);
    fetchTodayReservations();
    // カレンダー表示中なら、本日が属する月（当月）へスクロール
    if (rightTab === 'calendar' && calendarViewMode === 'calendar') {
      requestAnimationFrame(() => doScrollCalendarToCurrentMonth());
    }
  };

  useEffect(() => {
    if (!session) {
      todayReservationsModalOpenedRef.current = false;
      return;
    }
    if (todayReservationsModalOpenedRef.current) return;
    todayReservationsModalOpenedRef.current = true;
    openTodayReservationsModal();
  }, [session]);

  // カレンダーデータ取得
  const fetchCalendarData = async (companyId = calendarCompanyId) => {
    setCalendarLoading(true);
    const { start, end } = getCalendarDataRange();
    let query = supabase
      .from('health_reserv')
      .select('id, date, patient_name, patient_gender, purpose')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query;
    if (error) {
      console.error('カレンダーデータの取得に失敗:', error);
    } else if (data) {
      const grouped = {};
      data.forEach(r => {
        if (!grouped[r.date]) grouped[r.date] = [];
        grouped[r.date].push(r);
      });
      setCalendarData(grouped);
      setCalendarDetailData({});
    }
    setCalendarLoading(false);
  };

  const fetchCalendarListData = async (companyId = calendarCompanyId) => {
    setCalendarListError('');
    setCalendarListLoading(true);
    const defaultRange = getCalendarDataRange();
    const hasDateRange = calendarDateFrom || calendarDateTo;
    const start = hasDateRange ? (calendarDateFrom || '1900-01-01') : defaultRange.start;
    const end = hasDateRange ? (calendarDateTo || '2999-12-31') : defaultRange.end;
    let query = supabase
      .from('health_reserv')
      .select('id, created_at, date, day_of_week, patient_id, patient_name, patient_name_kana, birth_date, age, company_name, purpose, payment_type, fee, bp_measure_count, item_height_weight, item_abdominal_girth, item_blood_pressure, item_vision, item_color_vision, item_pulse, item_hearing, item_urine, item_x_ray, item_ecg, item_blood, item_blood_kuritas_regular, item_blood_kuritas_specific, item_blood_hapilus_b, item_blood_hapilus_c, item_blood_hapilus_hire, item_blood_hapilus_night, item_hba1c, item_endoscopy, item_echo, item_manganese, item_stool, item_norovirus, item_bacteria3, item_bacteria5, item_paratyphoid, item_methanol, item_hexane, item_methyl_hippuric, item_psa, item_hbs_ag, item_hbs_ab, item_hcv_ab, item_syphilis, item_mrsa, others')
      .gte('date', start)
      .lte('date', end);
    // 団体未選択（すべての団体）の場合はフィルタなし
    if (companyId) query = query.eq('company_id', companyId);
    const { data, error } = await query
      .order('date', { ascending: true })
      .order('patient_name', { ascending: true });

    if (error) {
      console.error('calendar list fetch error:', error);
      setCalendarListError('団体別一覧の取得に失敗しました。');
      setCalendarListData([]);
    } else {
      setCalendarListData(data || []);
    }
    setCalendarListLoading(false);
  };

  useEffect(() => {
    if (rightTab !== 'calendar' || calendarViewMode !== 'list') return;
    fetchCalendarListData(calendarCompanyId);
  }, [rightTab, calendarViewMode, calendarCompanyId, calendarDateFrom, calendarDateTo]);

  // リアルタイム同期：他端末での予約変更を検知し、表示中のビューを再取得する
  // （stale closure対策：最新のフェッチ関数と表示状態をrefで参照）
  const realtimeHandlersRef = useRef({});
  realtimeHandlersRef.current = {
    fetchCalendarData,
    fetchCalendarListData,
    fetchTodayReservations,
    calendarViewMode,
    showTodayReservationsModal,
    calendarCompanyId,
  };
  // --- 変更後の自動バックアップ（最後の変更から3分後に実行） ---
  const changeBackupTimer = useRef(null);
  const scheduleChangeBackup = () => {
    if (changeBackupTimer.current) clearTimeout(changeBackupTimer.current);
    changeBackupTimer.current = setTimeout(async () => {
      if (!isAutoBackupEnabled()) return;
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        // 変更がなければスキップ／同じ日の分は上書き（backup.js側で処理）
        await performBackup(s, { downloadLocal: false, skipIfUnchanged: true });
      } catch {
        /* 失敗しても次回起動時の健全性チェックで警告される */
      }
    }, 3 * 60 * 1000);
  };

  useEffect(() => {
    if (!session) return;
    let refreshTimer = null;
    const scheduleRefresh = () => {
      // 連続イベントをまとめて500ms後に1回だけ再取得
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        const h = realtimeHandlersRef.current;
        h.fetchCalendarData(h.calendarCompanyId);
        if (h.calendarViewMode === 'list') h.fetchCalendarListData(h.calendarCompanyId);
        if (h.showTodayReservationsModal) h.fetchTodayReservations();
      }, 500);
      scheduleChangeBackup();
    };
    const channel = supabase
      .channel('health-reserv-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_reserv' }, scheduleRefresh)
      .subscribe();
    return () => {
      clearTimeout(refreshTimer);
      if (changeBackupTimer.current) clearTimeout(changeBackupTimer.current);
      supabase.removeChannel(channel);
    };
  }, [session]);

  useEffect(() => {
    calendarCompanyIdRef.current = calendarCompanyId;
    try {
      if (calendarCompanyId) {
        window.localStorage.setItem(CALENDAR_COMPANY_STORAGE_KEY, calendarCompanyId);
      } else {
        window.localStorage.removeItem(CALENDAR_COMPANY_STORAGE_KEY);
      }
    } catch {
      // localStorageが使えない環境では通常の画面内状態だけで動かす
    }
  }, [calendarCompanyId]);

  useEffect(() => {
    const clearPrintMode = () => setPrintMode('');
    window.addEventListener('afterprint', clearPrintMode);
    return () => window.removeEventListener('afterprint', clearPrintMode);
  }, []);

  // カレンダー詳細はモーダルを開くたびに、現在の団体フィルターで取り直す
  useEffect(() => {
    if (!selectedCalendarDate) {
      setCalendarDetailLoading(false);
      setCalendarDetailError('');
      return;
    }

    let cancelled = false;
    const fetchCalendarDetails = async () => {
      setCalendarDetailLoading(true);
      setCalendarDetailError('');
      let detailQuery = supabase
        .from('health_reserv')
        .select('id, date, patient_id, patient_name, patient_name_kana, patient_gender, birth_date, age, company_id, company_name, purpose, payment_type, fee, bp_measure_count, item_height_weight, item_abdominal_girth, item_blood_pressure, item_vision, item_color_vision, item_pulse, item_hearing, item_urine, item_x_ray, item_ecg, item_blood, item_blood_kuritas_regular, item_blood_kuritas_specific, item_blood_hapilus_b, item_blood_hapilus_c, item_blood_hapilus_hire, item_blood_hapilus_night, item_hba1c, item_endoscopy, item_echo, item_manganese, item_stool, item_norovirus, item_bacteria3, item_bacteria5, item_paratyphoid, item_methanol, item_hexane, item_methyl_hippuric, item_psa, item_hbs_ag, item_hbs_ab, item_hcv_ab, item_syphilis, item_mrsa, deadline_type, deadline_date, has_dedicated_form, others')
        .eq('date', selectedCalendarDate);
      if (calendarCompanyId) detailQuery = detailQuery.eq('company_id', calendarCompanyId);
      const { data, error } = await detailQuery.order('patient_name', { ascending: true });

      if (cancelled) return;
      if (error) {
        setCalendarDetailError('予約詳細の取得に失敗しました。');
      } else {
        setCalendarDetailData(prev => ({ ...prev, [selectedCalendarDate]: data || [] }));
      }
      setCalendarDetailLoading(false);
    };

    fetchCalendarDetails();

    return () => { cancelled = true; };
  }, [selectedCalendarDate, calendarCompanyId]);

  // 実際の保存処理（overrideId 指定時はそのIDの既存レコードを更新）
  const performSave = async (overrideId = null) => {
    setSaveStatus('saving');
    setSaveErrorMessage('');
    const { items } = formData;
    const zeroPurposes = ['特定健診(国保)', '長寿健診', '入園児'];
    let fee = null;
    const kuritasFee = calcKuritasFee(formData.purpose, items);
    if (kuritasFee !== null) fee = kuritasFee;
    else if (getCompanyBillingLabel(formData.purpose)) fee = null;
    else if (zeroPurposes.includes(formData.purpose)) fee = 0;
    else if (formData.purpose === '特定健診(社保)') fee = parseInt(shahoFee || 0);
    else fee = calcFee(items);
    const paymentType = getCompanyBillingLabel(formData.purpose) || formData.paymentType;

    const company = resolveSelectedHealthCompany(formData.companyId, formData.companyName);

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
      company_id: company.id,
      company_name: company.name,
      purpose: formData.purpose,
      item_height_weight: items.heightWeight,
      item_abdominal_girth: items.abdominalGirth,
      item_blood_pressure: items.bloodPressure,
      item_vision: items.vision,
      item_color_vision: items.colorVision,
      item_pulse: items.pulse,
      item_hearing: items.hearing,
      item_urine: items.urine,
      item_x_ray: items.xRay,
      item_ecg: items.ecg,
      item_blood: items.blood,
      item_blood_kuritas_regular: items.bloodKuritasRegular,
      item_blood_kuritas_specific: items.bloodKuritasSpecific,
      item_blood_hapilus_b: items.bloodHapilusB,
      item_blood_hapilus_c: items.bloodHapilusC,
      item_blood_hapilus_hire: items.bloodHapilusHire,
      item_blood_hapilus_night: items.bloodHapilusNight,
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
      payment_type: paymentType,
      fee: fee,
      others: formData.others,
      bp_measure_count: items.bloodPressure ? parseInt(formData.bpMeasureCount || '1', 10) : null,
      bp1_sys: formData.bp1Sys, bp1_dia: formData.bp1Dia,
      bp2_sys: items.bloodPressure && formData.bpMeasureCount === '2' ? formData.bp2Sys : '',
      bp2_dia: items.bloodPressure && formData.bpMeasureCount === '2' ? formData.bp2Dia : '',
      pulse: formData.pulse,
      height: formData.height, weight: formData.weight, bmi: formData.bmi, waist: formData.waist,
      vision_r: formData.visionR, vision_l: formData.visionL,
      vision_r2: formData.visionR2, vision_l2: formData.visionL2,
      hearing_r: formData.hearingR, hearing_l: formData.hearingL,
      hearing_r2: formData.hearingR2, hearing_l2: formData.hearingL2,
      color_vision: formData.colorVision,
      staff_id: formData.staffId ? parseInt(formData.staffId, 10) : null,
      staff_name: formData.staffName || null,
      user_id: session?.user?.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await saveHealthReservationRecord(record, overrideId);
    if (error) {
      console.error(error);
      setSaveErrorMessage(formatSupabaseError(error));
      setSaveStatus('error');
    } else {
      setSaveStatus('saved');
      setFormData(prev => ({ ...prev, companyId: company.id || '', companyName: company.name || '', paymentType }));
      if (editingReservationId) setEditingReservationId(null);
      pendingCalendarScrollRef.current = true;
      await fetchCalendarData();
      // patients テーブルへの自動同期（患者IDがある場合のみ）
      if (formData.id) {
        const { data: existing, error: patientSelectError } = await supabase
          .from('patients')
          .select('patient_id')
          .eq('patient_id', formData.id)
          .limit(1);
        if (patientSelectError) {
          console.error('患者マスタの確認に失敗:', patientSelectError);
          showNotice('予約は保存されましたが、患者マスタの確認に失敗しました。');
        } else if (!existing || existing.length === 0) {
          const { error: patientInsertError } = await supabase.from('patients').insert({
            patient_id: formData.id,
            patient_name: formData.name || '',
            patient_name_kana: formData.yurigana || '',
            patient_dob: formData.birthDate ? formData.birthDate.replace(/-/g, '') : '',
            zipcode: '',
            address: '',
            phone_number: formData.contact || '',
          });
          if (patientInsertError) {
            console.error('患者マスタへの登録に失敗:', patientInsertError);
            showNotice('予約は保存されましたが、患者マスタへの自動登録に失敗しました。');
          }
        }
      }
    }
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // 予約データ保存
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showNotice('氏名を入力してください。');
      return;
    }
    if (!formData.staffId) {
      showNotice('予約担当者を選択してください。');
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
            // 既存予約を上書き更新（削除→挿入だと保存失敗時にデータが消えるためupdateで置き換え）
            await performSave(existing[0].id);
          }
        });
        return;
      }
    }
    await performSave();
  };

  useEffect(() => {
    const notes = buildKuritasBloodNotes(formData.items);
    setFormData(prev => {
      const manual = stripKuritasBloodNotes(prev.others);
      const nextOthers = [...(manual ? [manual] : []), ...notes].join('\n');
      return prev.others === nextOthers ? prev : { ...prev, others: nextOthers };
    });
  }, [formData.items.bloodKuritasRegular, formData.items.bloodKuritasSpecific, formData.items.bloodHapilusB, formData.items.bloodHapilusC, formData.items.bloodHapilusHire, formData.items.bloodHapilusNight]);

  // BMI自動計算（予約詳細入力）
  useEffect(() => {
    const h = parseFloat(formData.height);
    const w = parseFloat(formData.weight);
    if (h > 0 && w > 0) {
      const bmi = (w / ((h / 100) ** 2)).toFixed(1);
      setFormData(prev => ({ ...prev, bmi }));
    }
  }, [formData.height, formData.weight]);

  // BMI自動計算（健康診断結果入力）
  useEffect(() => {
    const h = parseFloat(kenshinData.height);
    const w = parseFloat(kenshinData.weight);
    if (h > 0 && w > 0) {
      const bmi = (w / ((h / 100) ** 2)).toFixed(1);
      setKenshinData(prev => ({ ...prev, bmi }));
    } else {
      setKenshinData(prev => ({ ...prev, bmi: '' }));
    }
  }, [kenshinData.height, kenshinData.weight]);

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

  // 生年月日 → ISO DATE形式に変換（health_data の k_birth_date DATE型向け）
  const parseKBirthDate = (input) => {
    const s = input.trim();
    if (/^\d{8}$/.test(s)) return { type: 'exact', date: `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}` };
    const mFull = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (mFull) return { type: 'exact', date: `${mFull[1]}-${mFull[2].padStart(2,'0')}-${mFull[3].padStart(2,'0')}` };
    if (/^\d{4}$/.test(s) && parseInt(s) >= 1900 && parseInt(s) <= 2099) return { type: 'year', year: parseInt(s) };
    if (/^\d{6}$/.test(s)) return { type: 'yearmonth', year: parseInt(s.slice(0,4)), month: parseInt(s.slice(4,6)) };
    const eras = [
      { re: /^(r|令和?)\s*/i, base: 2018 }, { re: /^(h|平成?)\s*/i, base: 1988 },
      { re: /^(s|昭和?)\s*/i, base: 1925 }, { re: /^(t|大正?)\s*/i, base: 1911 },
      { re: /^(m|明治?)\s*/i, base: 1867 },
    ];
    for (const era of eras) {
      const eraMatch = s.match(era.re);
      if (!eraMatch) continue;
      const rest = s.slice(eraMatch[0].length);
      const nums = rest.replace(/\D/g, '');
      if (/^\d{6}$/.test(nums)) {
        const y = era.base + parseInt(nums.slice(0,2));
        return { type: 'exact', date: `${y}-${nums.slice(2,4)}-${nums.slice(4,6)}` };
      }
      const parts = rest.replace(/[年月日]/g, ' ').split(/[\s\/\-]+/).filter(Boolean);
      if (parts.length >= 3) {
        const y = era.base + parseInt(parts[0]);
        return { type: 'exact', date: `${y}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}` };
      }
      if (parts.length === 2) {
        const y = era.base + parseInt(parts[0]);
        return { type: 'yearmonth', year: y, month: parseInt(parts[1]) };
      }
      if (parts.length === 1 && /^\d{1,2}$/.test(parts[0]))
        return { type: 'year', year: era.base + parseInt(parts[0]) };
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

  // モーダル専用予約検索
  useEffect(() => {
    if (!session || modalQuery.length < 1) { setModalSuggestions([]); setModalSearching(false); return; }
    setModalSearching(true);
    const timer = setTimeout(async () => {
      try {
        const q = modalQuery.trim();
        const variants = getKanaVariants(q);
        const qNorm = variants[0];
        const kanaOr = variants.map(v => `patient_name_kana.ilike.%${v}%`).join(',');
        const birthCond = getDobSearchCondition(q)?.replaceAll('patient_dob', 'birth_date');
        const parsedDate = parseKBirthDate(q);
        const orParts = [
          `patient_name.ilike.%${qNorm}%`,
          `patient_id.ilike.%${qNorm}%`,
          kanaOr,
          `company_name.ilike.%${qNorm}%`,
          `purpose.ilike.%${qNorm}%`,
          ...(birthCond ? [birthCond] : []),
          ...(parsedDate?.type === 'exact' ? [`date.eq.${parsedDate.date}`] : []),
        ];
        const { data, error } = await supabase
          .from('health_reserv')
          .select('id, date, day_of_week, patient_id, patient_name, patient_name_kana, patient_gender, birth_date, company_name, purpose')
          .or(orParts.join(','))
          .order('date', { ascending: false })
          .limit(100);
        if (error) console.error('reservation modal search error:', error);
        setModalSuggestions(!error && data ? data : []);
      } catch (e) { console.error(e); } finally { setModalSearching(false); }
    }, 200);
    return () => clearTimeout(timer);
  }, [modalQuery, session]);

  // 診断結果入力タブ専用：予約者 / 患者マスタ検索
  useEffect(() => {
    if (!session || resultQuery.length < 1) {
      setResultSuggestions([]);
      setShowResultSuggestions(false);
      setResultSearching(false);
      return;
    }
    setResultSearching(true);
    const timer = setTimeout(async () => {
      try {
        const q = resultQuery.trim();
        const variants = getKanaVariants(q);
        const qNorm = variants[0];
        const kanaOr = variants.map(v => `patient_name_kana.ilike.%${v}%`).join(',');
        const dobCond = getDobSearchCondition(q);

        if (resultSearchMode === 'reservation') {
          const parsed = parseKBirthDate(q);
          const birthCond = dobCond ? dobCond.replaceAll('patient_dob', 'birth_date') : null;
          const orParts = [
            `patient_name.ilike.%${qNorm}%`,
            `patient_id.ilike.%${qNorm}%`,
            kanaOr,
            `company_name.ilike.%${qNorm}%`,
            ...(parsed?.type === 'exact' ? [`date.eq.${parsed.date}`] : []),
            ...(birthCond ? [birthCond] : []),
          ];
          const { data, error } = await supabase
            .from('health_reserv')
            .select('id, date, day_of_week, patient_id, patient_name, patient_name_kana, patient_gender, birth_date, contact, company_id, company_name, purpose, pulse')
            .or(orParts.join(','))
            .order('date', { ascending: false })
            .limit(100);
          if (error) console.error('reservation search error:', error);
          setResultSuggestions(!error && data ? data : []);
        } else {
          const orStr = [`patient_name.ilike.%${qNorm}%`, `patient_id.ilike.%${qNorm}%`, kanaOr, ...(dobCond ? [dobCond] : [])].join(',');
          const { data, error } = await supabase
            .from('patients')
            .select('patient_id, patient_name, patient_name_kana, patient_dob, patient_gender, zipcode, address, phone_number')
            .or(orStr)
            .limit(100);
          if (error) console.error('result patient search error:', error);
          setResultSuggestions(!error && data ? data : []);
        }
        setShowResultSuggestions(true);
      } catch (e) {
        console.error('result search exception:', e);
      } finally {
        setResultSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [resultQuery, resultSearchMode, session]);

  // カレンダーを開いたら「当月を初期表示する」予約をセット
  useEffect(() => {
    if (rightTab === 'calendar' && calendarViewMode === 'calendar') {
      pendingCalendarScrollRef.current = true;
    }
  }, [rightTab, calendarViewMode]);

  // 月セルの描画完了後（読み込み完了後）に当月へ1回だけスクロール
  // ※ scrollIntoView はページ等の外側コンテナも巻き込みヘッダーが切れるため、
  //   カレンダーのスクロール枠のみを動かし、stickyバーの高さ分オフセットする
  useEffect(() => {
    if (!pendingCalendarScrollRef.current) return;
    if (rightTab !== 'calendar' || calendarViewMode !== 'calendar' || calendarLoading) return;
    requestAnimationFrame(() => {
      if (doScrollCalendarToCurrentMonth()) pendingCalendarScrollRef.current = false;
    });
  }, [rightTab, calendarViewMode, calendarLoading, calendarData]);

  // 外側クリックで候補を閉じる
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (resultSearchRef.current && !resultSearchRef.current.contains(e.target)) {
        setShowResultSuggestions(false);
      }
      if (reservationCompanyRef.current && !reservationCompanyRef.current.contains(e.target)) {
        setShowReservationCompanyOptions(false);
      }
      if (kenshinCompanyRef.current && !kenshinCompanyRef.current.contains(e.target)) {
        setShowKenshinCompanyOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);


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
    } else if (name === 'bpMeasureCount') {
      setFormData(prev => {
        if (BP_TWO_MEASURE_LOCKED_PURPOSES.includes(prev.purpose)) return prev;
        return {
          ...prev,
          bpMeasureCount: value,
          ...(value === '1' ? { bp2Sys: '', bp2Dia: '' } : {}),
        };
      });
    } else if (name === 'purpose') {
      setFormData(prev => ({
        ...prev,
        purpose: value,
        items: getItemsForPurpose(value, prev.items),
        ...(BP_TWO_MEASURE_LOCKED_PURPOSES.includes(value) ? { bpMeasureCount: '2' } : {}),
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

  // 診断書検索
  useEffect(() => {
    if (!session || kenshinModalQuery.length < 1) { setKenshinModalResults([]); setKenshinModalSearching(false); return; }
    setKenshinModalSearching(true);
    const timer = setTimeout(async () => {
      const q = kenshinModalQuery.trim();
      const variants = getKanaVariants(q);
      const qNorm = variants[0];
      const kanaOr = variants.map(v => `k_yurigana.ilike.%${v}%`).join(',');
      const orStr = [`k_id.ilike.%${qNorm}%`, `k_name.ilike.%${qNorm}%`, kanaOr, `k_company_name.ilike.%${qNorm}%`].join(',');

      const promises = [
        supabase.from('health_data').select('*').or(orStr).order('k_date', { ascending: false }).limit(20)
      ];

      const parsed = parseKBirthDate(q);
      if (parsed) {
        // 生年月日として検索
        let bdQuery = supabase.from('health_data').select('*');
        if (parsed.type === 'exact') {
          bdQuery = bdQuery.eq('k_birth_date', parsed.date);
        } else if (parsed.type === 'year') {
          bdQuery = bdQuery.gte('k_birth_date', `${parsed.year}-01-01`).lte('k_birth_date', `${parsed.year}-12-31`);
        } else if (parsed.type === 'yearmonth') {
          const mm = String(parsed.month).padStart(2, '0');
          bdQuery = bdQuery.gte('k_birth_date', `${parsed.year}-${mm}-01`).lte('k_birth_date', `${parsed.year}-${mm}-31`);
        }
        promises.push(bdQuery.order('k_date', { ascending: false }).limit(20));

        // 健診日としても検索
        let kdQuery = supabase.from('health_data').select('*');
        if (parsed.type === 'exact') {
          kdQuery = kdQuery.eq('k_date', parsed.date);
        } else if (parsed.type === 'year') {
          kdQuery = kdQuery.gte('k_date', `${parsed.year}-01-01`).lte('k_date', `${parsed.year}-12-31`);
        } else if (parsed.type === 'yearmonth') {
          const mm = String(parsed.month).padStart(2, '0');
          kdQuery = kdQuery.gte('k_date', `${parsed.year}-${mm}-01`).lte('k_date', `${parsed.year}-${mm}-31`);
        }
        promises.push(kdQuery.order('k_date', { ascending: false }).limit(20));
      }

      const results = await Promise.all(promises);
      const merged = [...(results[0].data || []), ...(results[1]?.data || []), ...(results[2]?.data || [])];
      const deduped = [...new Map(merged.map(r => [r.id, r])).values()];
      setKenshinModalResults(deduped.slice(0, 20));
      setKenshinModalSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [kenshinModalQuery, session]);

  // 診断書削除
  const handleDeleteKenshinRecord = (r, e) => {
    e.stopPropagation();
    setConfirmDialog({
      show: true,
      message: `${r.k_name || ''} 様の診断書（健診日：${r.k_date || '不明'}）\n\n本当に削除しますか？`,
      onConfirm: async () => {
        setConfirmDialog({ show: false, message: '', onConfirm: null });
        const { error } = await supabase.from('health_data').delete().eq('id', r.id);
        if (error) { console.error(error); showNotice('削除に失敗しました'); return; }
        setKenshinModalAllResults(prev => prev.filter(x => x.id !== r.id));
        setKenshinModalResults(prev => prev.filter(x => x.id !== r.id));
        scheduleChangeBackup();
      },
    });
  };

  // 診断書検索から選択してkenshinDataに復元
  const handleSelectKenshinRecord = (r) => {
    setSelectedKenshinReservation(r.reserv_id ? {
      id: r.reserv_id,
      date: r.k_date || '',
      name: r.k_name || '',
      purpose: '',
    } : null);
    setKenshinData({
      kDate: r.k_date || '', kId: r.k_id || '', kName: r.k_name || '', kYurigana: r.k_yurigana || '',
      kBirthDate: r.k_birth_date || '', kAge: r.k_age != null ? String(r.k_age) : '',
      kGender: r.k_gender || '', kContact: r.k_contact || '', kCompanyName: r.k_company_name || '', kCompanyId: r.company_id || '',
      address: r.address || '',
      bpSys: r.bp_sys || '', bpDia: r.bp_dia || '', pulse: r.pulse || '',
      height: r.height || '', weight: r.weight || '', bmi: r.bmi || '', waist: r.waist || '',
      visionR: r.vision_r || '', visionL: r.vision_l || '', visionR2: r.vision_r2 || '', visionL2: r.vision_l2 || '',
      colorVision: r.color_vision || '',
      hearingR: r.hearing_r || '', hearingL: r.hearing_l || '',
      hearing4000R: r.hearing_4000r || '', hearing4000L: r.hearing_4000l || '',
      medicalHistory: r.medical_history || '',
      medBP: r.med_bp || '', medBG: r.med_bg || '', medLipid: r.med_lipid || '',
      smokingHistory: r.smoking_history || '', drinkingHistory: r.drinking_history || '',
      subjective: r.subjective || '',
      wbc: r.wbc || '', rbc: r.rbc || '', hemoglobin: r.hemoglobin || '', ht: r.ht || '',
      mcv: r.mcv || '', mch: r.mch || '', mchc: r.mchc || '', platelet: r.platelet || '',
      tp: r.tp || '', alb: r.alb || '', agRatio: r.ag_ratio || '', tBil: r.t_bil || '', dBil: r.d_bil || '',
      alp: r.alp || '', ldh: r.ldh || '', got: r.got || '', gpt: r.gpt || '',
      gammaGtp: r.gamma_gtp || '', ck: r.ck || '', amy: r.amy || '',
      tCho: r.t_cho || '', hdl: r.hdl || '', ldl: r.ldl || '', triglyceride: r.triglyceride || '', lhRatio: r.lh_ratio || '',
      un: r.un || '', cre: r.cre || '', egfr: r.egfr || '', uricAcid: r.uric_acid || '',
      na: r.na || '', k: r.k || '', cl: r.cl || '', ca: r.ca || '', ip: r.ip || '', mgElec: r.mg_elec || '', fe: r.fe || '',
      bloodGlucose: r.blood_glucose || '', hba1c: r.hba1c || '', crp: r.crp || '', rf: r.rf || '', aso: r.aso || '',
      cea: r.cea || '', ca199: r.ca199 || '', psaValue: r.psa_value || '', bnp: r.bnp || '',
      hbsAg: r.hbs_ag || '', hbsAb: r.hbs_ab || '', hcvAb: r.hcv_ab || '',
      syphilisSTS: r.syphilis_sts || '', mrsaStaph: r.mrsa_staph || '',
      endoscopyResult: r.endoscopy_result || '', echoResult: r.echo_result || '', manganeseResult: r.manganese_result || '',
      stoolOccult: r.stool_occult || '', norovirus: r.norovirus || '',
      bacteria3: r.bacteria3 || '', bacteria5: r.bacteria5 || '', paratyphoid: r.paratyphoid || '',
      methanol: r.methanol || '', normalHexane: r.normal_hexane || '', methylHippuric: r.methyl_hippuric || '',
      otherExams: r.other_exams || '',
      xRayDate: r.x_ray_date || '', xRayCategory: r.x_ray_category || '', xRayResult: r.x_ray_result || '',
      ecgResult: r.ecg_result || '',
      urineGlucose: r.urine_glucose || '', urineProtein: r.urine_protein || '',
      urineUrobilinogen: r.urine_urobilinogen || '', urineBilirubin: r.urine_bilirubin || '',
      urineSpecificGravity: r.urine_specific_gravity || '', urinePh: r.urine_ph || '',
      urineKetone: r.urine_ketone || '', urineOccultBlood: r.urine_occult_blood || '',
      doctorFindings: r.doctor_findings || '', overallFindings: r.overall_findings || '',
      doctorName: r.doctor_name || '', doctorNameCustom: r.doctor_name_custom || '',
      issueDate: r.issue_date || '',
    });
    setShowKenshinModal(false);
    setKenshinModalQuery('');
    setLeftTab('result');
    setRightTab('kenshin');
  };

  // 健康診断結果をSupabaseに保存
  const handleKenshinSave = async () => {
    setKenshinSaveStatus('saving');
    const d = kenshinData;
    const company = resolveSelectedHealthCompany(d.kCompanyId, d.kCompanyName);
    const record = {
      k_date: d.kDate || null,
      reserv_id: selectedKenshinReservation?.id || null,
      k_id: d.kId || null,
      k_name: d.kName,
      k_yurigana: d.kYurigana,
      k_birth_date: d.kBirthDate || null,
      k_age: d.kAge !== '' && d.kAge != null ? parseInt(d.kAge) : null,
      k_gender: d.kGender,
      k_contact: d.kContact,
      company_id: company.id,
      k_company_name: company.name,
      address: d.address,
      bp_sys: d.bpSys, bp_dia: d.bpDia, pulse: d.pulse,
      height: d.height, weight: d.weight, bmi: d.bmi, waist: d.waist,
      vision_r: d.visionR, vision_l: d.visionL, vision_r2: d.visionR2, vision_l2: d.visionL2,
      color_vision: d.colorVision,
      hearing_r: d.hearingR, hearing_l: d.hearingL,
      hearing_4000r: d.hearing4000R, hearing_4000l: d.hearing4000L,
      medical_history: d.medicalHistory,
      med_bp: d.medBP, med_bg: d.medBG, med_lipid: d.medLipid,
      smoking_history: d.smokingHistory, drinking_history: d.drinkingHistory,
      subjective: d.subjective,
      wbc: d.wbc, rbc: d.rbc, hemoglobin: d.hemoglobin, ht: d.ht,
      mcv: d.mcv, mch: d.mch, mchc: d.mchc, platelet: d.platelet,
      tp: d.tp, alb: d.alb, ag_ratio: d.agRatio, t_bil: d.tBil, d_bil: d.dBil,
      alp: d.alp, ldh: d.ldh, got: d.got, gpt: d.gpt, gamma_gtp: d.gammaGtp, ck: d.ck, amy: d.amy,
      t_cho: d.tCho, hdl: d.hdl, ldl: d.ldl, triglyceride: d.triglyceride, lh_ratio: d.lhRatio,
      un: d.un, cre: d.cre, egfr: d.egfr, uric_acid: d.uricAcid,
      na: d.na, k: d.k, cl: d.cl, ca: d.ca, ip: d.ip, mg_elec: d.mgElec, fe: d.fe,
      blood_glucose: d.bloodGlucose, hba1c: d.hba1c, crp: d.crp, rf: d.rf, aso: d.aso,
      cea: d.cea, ca199: d.ca199, psa_value: d.psaValue, bnp: d.bnp,
      hbs_ag: d.hbsAg, hbs_ab: d.hbsAb, hcv_ab: d.hcvAb, syphilis_sts: d.syphilisSTS, mrsa_staph: d.mrsaStaph,
      endoscopy_result: d.endoscopyResult, echo_result: d.echoResult, manganese_result: d.manganeseResult,
      stool_occult: d.stoolOccult, norovirus: d.norovirus, bacteria3: d.bacteria3, bacteria5: d.bacteria5, paratyphoid: d.paratyphoid,
      methanol: d.methanol, normal_hexane: d.normalHexane, methyl_hippuric: d.methylHippuric,
      other_exams: d.otherExams,
      x_ray_date: d.xRayDate || null, x_ray_category: d.xRayCategory, x_ray_result: d.xRayResult,
      ecg_result: d.ecgResult,
      urine_glucose: d.urineGlucose, urine_protein: d.urineProtein, urine_urobilinogen: d.urineUrobilinogen,
      urine_bilirubin: d.urineBilirubin, urine_specific_gravity: d.urineSpecificGravity,
      urine_ph: d.urinePh, urine_ketone: d.urineKetone, urine_occult_blood: d.urineOccultBlood,
      doctor_findings: d.doctorFindings, overall_findings: d.overallFindings,
      doctor_name: d.doctorName, doctor_name_custom: d.doctorNameCustom,
      issue_date: d.issueDate || null,
      user_id: session?.user?.id,
      updated_at: new Date().toISOString(),
    };
    const { error } = d.kId && d.kDate
      ? await supabase.from('health_data').upsert(record, { onConflict: 'k_id,k_date' })
      : await supabase.from('health_data').insert(record);
    if (error) { console.error(error); setKenshinSaveStatus('error'); }
    else {
      setKenshinData(prev => ({ ...prev, kCompanyId: company.id || '', kCompanyName: company.name || '' }));
      setKenshinSaveStatus('saved');
      scheduleChangeBackup();
    }
    setTimeout(() => setKenshinSaveStatus(''), 3000);
  };

  // 生年月日フィールドからフォーカスが外れたときにパース
  const handleBirthDateBlur = () => {
    const iso = parseDateFlexible(birthDateInput);
    setFormData(prev => ({ ...prev, birthDate: iso }));
    if (iso) setBirthDateInput(iso);
  };

  // 診断結果入力用：生年月日パース
  const handleKenshinBirthDateBlur = () => {
    const iso = parseDateFlexible(kenshinBirthDateInput);
    setKenshinData(prev => ({ ...prev, kBirthDate: iso }));
    if (iso) setKenshinBirthDateInput(iso);
  };

  // 診断結果入力用：患者検索から選択
  const handleSelectKenshinPatient = (p) => {
    const iso = p.patient_dob ? parseDateFlexible(p.patient_dob) : '';
    setKenshinData(prev => ({
      ...prev,
      kId: p.patient_id || '',
      kName: p.patient_name || '',
      kYurigana: p.patient_name_kana || '',
      kBirthDate: iso,
      kGender: p.patient_gender || '',
      kContact: p.phone_number || '',
      address: p.address || '',
    }));
    if (iso) setKenshinBirthDateInput(iso);
    setSelectedKenshinReservation(null);
    setResultQuery('');
    setShowResultSuggestions(false);
  };

  // 診断結果入力用：予約から選択
  const handleSelectKenshinReservation = (r) => {
    const iso = r.birth_date ? parseDobToISO(r.birth_date) : '';
    setKenshinData(prev => ({
      ...prev,
      kDate: r.date || prev.kDate,
      kId: r.patient_id || '',
      kName: r.patient_name || '',
      kYurigana: r.patient_name_kana || '',
      kBirthDate: iso,
      kGender: r.patient_gender || '',
      kContact: r.contact || '',
      kCompanyName: r.company_name || '',
      kCompanyId: r.company_id || '',
      pulse: r.pulse || prev.pulse,
    }));
    if (iso) setKenshinBirthDateInput(iso);
    setSelectedKenshinReservation({
      id: r.id,
      date: r.date || '',
      name: r.patient_name || '',
      purpose: r.purpose || '',
    });
    setResultQuery('');
    setShowResultSuggestions(false);
  };

  const handleReset = () => {
    setFormData(initialState);
    setKenshinData(kenshinInitialState);
    setPatientQuery('');
    setResultQuery('');
    setResultSuggestions([]);
    setShowResultSuggestions(false);
    setSelectedKenshinReservation(null);
    setBirthDateInput('');
    setKenshinBirthDateInput('');
    setEditingReservationId(null);
  };

  // カレンダーから予約を削除
  const handleDeleteReservation = (reservationId, patientName) => {
    setConfirmDialog({
      show: true,
      message: `「${patientName}」の予約を削除しますか？`,
      onConfirm: () => {
        setConfirmDialog({ show: false, message: '', onConfirm: null });
        performDeleteReservation(reservationId);
      },
    });
  };

  const performDeleteReservation = async (reservationId) => {
    const { error } = await supabase.from('health_reserv').delete().eq('id', reservationId);
    if (error) {
      console.error('予約の削除に失敗:', error);
      showNotice('削除に失敗しました。');
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
      setCalendarDetailData(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(date => {
          updated[date] = updated[date].filter(r => r.id !== reservationId);
          if (updated[date].length === 0) delete updated[date];
        });
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
    const birthDateIso = data.birth_date ? parseDobToISO(data.birth_date) : '';
    const loadedPurpose = data.purpose || '就職';
    const loadedBpMeasureCount = BP_TWO_MEASURE_LOCKED_PURPOSES.includes(loadedPurpose)
      ? '2'
      : Number(data.bp_measure_count) === 2 || data.bp2_sys || data.bp2_dia ? '2' : '1';
    setFormData({
      date: data.date || tomorrowStr,
      dayOfWeek: data.day_of_week || '',
      yurigana: data.patient_name_kana || '',
      id: data.patient_id || '',
      name: data.patient_name || '',
      gender: data.patient_gender || '',
      birthDate: birthDateIso,
      age: data.age || '',
      contact: data.contact || '',
      companyName: data.company_name || '',
      companyId: data.company_id || '',
      purpose: loadedPurpose,
      hasHospitalForm: data.has_hospital_form || '無(当院用紙を使用)',
      items: {
        heightWeight: !!data.item_height_weight, abdominalGirth: !!data.item_abdominal_girth,
        bloodPressure: !!data.item_blood_pressure, vision: !!data.item_vision,
        colorVision: !!data.item_color_vision, pulse: !!data.item_pulse, hearing: !!data.item_hearing, urine: !!data.item_urine,
        xRay: !!data.item_x_ray, ecg: !!data.item_ecg,
        blood: !!data.item_blood,
        bloodKuritasRegular: !!data.item_blood_kuritas_regular,
        bloodKuritasSpecific: !!data.item_blood_kuritas_specific,
        bloodHapilusB: !!data.item_blood_hapilus_b,
        bloodHapilusC: !!data.item_blood_hapilus_c,
        bloodHapilusHire: !!data.item_blood_hapilus_hire,
        bloodHapilusNight: !!data.item_blood_hapilus_night,
        hba1c: !!data.item_hba1c, endoscopy: !!data.item_endoscopy,
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
      bpMeasureCount: loadedBpMeasureCount,
      bp1Sys: data.bp1_sys || '', bp1Dia: data.bp1_dia || '',
      bp2Sys: data.bp2_sys || '', bp2Dia: data.bp2_dia || '',
      pulse: data.pulse || '',
      height: data.height || '', weight: data.weight || '', bmi: data.bmi || '', waist: data.waist || '', chest: data.chest || '',
      visionR: data.vision_r || '', visionL: data.vision_l || '',
      visionR2: data.vision_r2 || '', visionL2: data.vision_l2 || '',
      hearingR: data.hearing_r || '', hearingL: data.hearing_l || '',
      hearingR2: data.hearing_r2 || '', hearingL2: data.hearing_l2 || '',
      colorVision: data.color_vision || '',
      staffId: data.staff_id != null ? String(data.staff_id) : '',
      staffName: data.staff_name || '',
    });
    setBirthDateInput(birthDateIso);
    // 検索枠には患者名を入れない（サジェストのプルダウンが出るのを防ぐ。氏名はフォーム側に表示）
    setPatientQuery('');
    setEditingReservationId(editMode ? reservationId : null);
    setSelectedCalendarDate(null);
    if (editMode) setLeftTab('reservation');
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

  const renderCompanyCombobox = ({
    value,
    showOptions,
    setShowOptions,
    onInput,
    onSelect,
    focusClass,
    inputRef,
  }) => {
    const filteredCompanies = getFilteredHealthCompanies(value);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowOptions(false);
        return;
      }
      if (e.key !== 'Enter') return;
      const companyByNo = findHealthCompanyByDisplayNo(e.currentTarget.value);
      if (companyByNo) {
        e.preventDefault();
        onSelect(companyByNo);
      }
    };
    return (
      <div className="relative" ref={inputRef}>
        <input
          type="text"
          value={value || ''}
          onChange={onInput}
          onFocus={() => setShowOptions(true)}
          onKeyDown={handleKeyDown}
          placeholder="団体名なし"
          className={`w-full h-[42px] p-2 pr-8 border rounded-lg bg-white outline-none ${focusClass}`}
        />
        <button
          type="button"
          onClick={() => setShowOptions(prev => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 text-xs"
          aria-label="団体一覧を開く"
        >
          ▼
        </button>
        {showOptions && (
          <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(null); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 text-slate-500"
            >
              団体名なし
            </button>
            {filteredCompanies.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-400">一致する団体がありません</div>
            ) : (
              filteredCompanies.map(company => (
                <button
                  key={company.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); onSelect(company); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-b-0 flex items-center gap-2"
                >
                  {company.display_no != null && <span className="w-8 shrink-0 text-[11px] font-bold text-blue-600">{company.display_no}</span>}
                  <span className="truncate">{company.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-slate-100 p-4 lg:p-6 text-slate-800 flex flex-col items-center lg:h-screen lg:overflow-hidden ${printMode === 'companyList' ? 'print-company-list-active' : ''}`}>
      {/* バックアップ警告バナー */}
      {backupWarning && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[300] max-w-2xl w-[calc(100%-2rem)] px-4 py-3 bg-amber-50 border border-amber-300 rounded-2xl shadow-lg flex items-center gap-3 print-hide">
          <Info size={20} className="text-amber-500 shrink-0" />
          <span className="text-sm font-bold text-amber-800 flex-grow">{backupWarning}</span>
          <button onClick={() => setBackupWarning('')} className="text-amber-400 hover:text-amber-700 shrink-0 p-1 text-lg font-bold">✕</button>
        </div>
      )}
      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-6 lg:h-full lg:min-h-0">

        {/* 左セクション: 操作エリア */}
        <div className="flex-1 space-y-4 print-hide relative lg:flex lg:flex-col lg:min-h-0">

          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <h1 className="text-[1.35rem] font-black text-slate-700 tracking-wide ml-[5mm]">健康診断予約・診断書作成システム<span className="text-[0.675rem] font-medium text-slate-400 ml-2">ver.2026.06.30</span></h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-pink-50 hover:bg-pink-100 text-red-400 hover:text-red-600 font-bold text-sm rounded-xl border border-pink-200 transition-all"
            >
              <LogOut size={16} /> ログアウト
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 overflow-hidden min-h-[750px] lg:flex-1 lg:overflow-y-auto lg:min-h-0">
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="sticky top-0 z-40 -mx-6 -mt-6 flex items-center justify-between border-b bg-white px-6 pt-6 pb-4 shadow-sm before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-white before:content-['']">
                  <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200">
                    <button
                      onClick={() => { setLeftTab('reservation'); setRightTab('calendar'); }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 flex items-center gap-1.5 ${leftTab === 'reservation' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <PlusCircle size={13} /> 予約詳細入力
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLeftTab('result'); setRightTab('kenshin'); }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 flex items-center gap-1.5 ${leftTab === 'result' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <ClipboardCheck size={13} /> 診断結果入力
                    </button>
                  </div>
                  <div className="flex items-center gap-[5mm]">
                    <button onClick={() => { setPatientQuery(''); setPatientSuggestions([]); setShowPatientModal(true); }} className="flex items-center gap-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 px-3 py-1.5 rounded-lg transition-colors">
                      <Search size={13} /> 予約患者検索
                    </button>
                    <div className="relative">
                      <button
                        onClick={handleQuickBackup}
                        disabled={quickBackupBusy}
                        className="absolute bottom-full right-0 mb-1 flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-2 py-0.5 rounded-md transition-colors whitespace-nowrap disabled:opacity-50"
                        title="今すぐバックアップ"
                      >
                        <Save size={11} /> {quickBackupBusy ? '...' : 'バックアップ'}
                      </button>
                      <button onClick={handleReset} className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-400 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors">
                        <RotateCcw size={13} /> リセット
                      </button>
                    </div>
                  </div>
                </div>

                {leftTab === 'reservation' && <>
                {/* 患者検索 */}
                <div className="space-y-1 pb-[3mm]" ref={searchRef}>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">予約患者検索（氏名・ヨミガナ・ID・生年月日）</label>
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
                    <label className="text-[11px] font-bold text-slate-400 uppercase">氏名</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">ヨミガナ</label>
                    <input type="text" name="yurigana" value={formData.yurigana} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
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
                      <label className="text-[11px] font-bold text-slate-400 uppercase">健診時年齢</label>
                      <div className="w-full p-2 border rounded-lg bg-slate-50 min-h-[42px] text-sm flex items-center">
                        {formData.age !== '' && formData.age != null ? <span className="text-blue-600 font-bold">{formData.age} 歳</span> : <span className="text-slate-300">年齢は自動計算</span>}
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
                    <div className="h-[16px] flex items-start justify-between">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">団体名</label>
                      <button type="button" onClick={() => openCompanyModal('reservation')} className="h-[16px] px-2 rounded bg-blue-50 border border-blue-100 text-[11px] leading-none font-bold text-blue-600 hover:bg-blue-100 hover:text-blue-700">団体管理</button>
                    </div>
                    {renderCompanyCombobox({
                      value: formData.companyName,
                      showOptions: showReservationCompanyOptions,
                      setShowOptions: setShowReservationCompanyOptions,
                      onInput: handleReservationCompanyInput,
                      onSelect: handleReservationCompanyOptionSelect,
                      focusClass: 'focus:ring-2 focus:ring-blue-500',
                      inputRef: reservationCompanyRef,
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">健診目的</label>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <div className="grid grid-cols-4 gap-x-6 gap-y-2">
                      {['就職', '進学', '企業健診', '特定健診(社保)', '特定健診(国保)', '長寿健診', '入園児', 'その他'].map(p => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                          <input type="radio" name="purpose" value={p} checked={formData.purpose === p} onChange={handleChange} className="w-4 h-4 text-blue-600" /> {p}
                        </label>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <div className="text-[11px] font-bold text-emerald-600 uppercase mb-2">特定企業</div>
                      <div className="grid grid-cols-4 gap-x-6 gap-y-2">
                        {['クリタス定期健診', 'クリタス特定業務', 'ハピルスA', 'ハピルスB', 'ハピルスC', 'ハピルス雇入時', 'ハピルス深夜業', '第一生命', '第一生命 採血も'].map(p => (
                          <label key={p} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                            <input type="radio" name="purpose" value={p} checked={formData.purpose === p} onChange={handleChange} className="w-4 h-4 text-emerald-600" /> {p}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {(() => {
                  const isSpecialPurpose = ['特定健診(国保)', '長寿健診', '特定健診(社保)', '入園児', ...SPECIAL_COMPANY_PURPOSES].includes(formData.purpose);
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
                  const feeDisplay = getCompanyBillingLabel(formData.purpose) ? (() => {
                    const kFee = calcKuritasFee(formData.purpose, formData.items);
                    return (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
                        <div className="text-sm font-bold text-emerald-700">{getCompanyBillingLabel(formData.purpose)}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-emerald-500 font-bold">料金</span>
                          {kFee != null && <span className="text-2xl font-black text-emerald-700">¥{kFee.toLocaleString()}</span>}
                        </div>
                      </div>
                    );
                  })() :zeroPurposes.includes(formData.purpose) ? (
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
                      <div className="flex items-center gap-3">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">一般健診</label>
                        <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
                          <input type="checkbox"
                            checked={['heightWeight','abdominalGirth','bloodPressure','vision','hearing','urine','xRay','ecg','blood'].every(k => formData.items[k])}
                            onChange={e => {
                              const keys = ['heightWeight','abdominalGirth','bloodPressure','vision','hearing','urine','xRay','ecg','blood'];
                              const next = {};
                              keys.forEach(k => { next[k] = e.target.checked; });
                              setFormData(prev => ({ ...prev, items: { ...prev.items, ...next } }));
                            }}
                            disabled={isSpecialPurpose}
                            className="w-3.5 h-3.5 rounded border-slate-300"
                          />
                          （特定企業・色神・脈拍以外すべて）
                        </label>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries({ heightWeight: '身長/体重', abdominalGirth: '腹囲', bloodPressure: '血圧', vision: '視力', hearing: '聴力', urine: '尿検査', xRay: 'X-P', ecg: '心電図', blood: bloodLabel, pulse: '脈拍', colorVision: '色神' }).map(([key, label]) => {
                            const disabled = isSpecialPurpose;
                            const lockedChecked = disabled && formData.items[key];
                            return (
                              <label key={key} className={disabled ? `flex items-center gap-2 text-xs cursor-not-allowed ${lockedChecked ? 'text-slate-800 font-bold' : 'text-slate-500'}` : cbClass}>
                                <input
                                  type="checkbox"
                                  name={`item_${key}`}
                                  checked={formData.items[key]}
                                  onChange={handleChange}
                                  disabled={disabled}
                                  className={`w-3.5 h-3.5 rounded ${lockedChecked ? 'accent-blue-600' : 'border-slate-300'}`}
                                /> {label}
                              </label>
                            );
                          })}
                        </div>
                        <div className="border-t border-slate-200 pt-3">
                          <div className="text-[11px] font-bold text-emerald-600 uppercase mb-2">特定企業（採血）</div>
                          <div className="grid grid-cols-4 gap-2">
                            {Object.entries({ bloodKuritasRegular: KURITAS_BLOOD_LABELS.regular, bloodKuritasSpecific: KURITAS_BLOOD_LABELS.specific, bloodHapilusB: HAPILUS_BLOOD_LABELS.b, bloodHapilusC: HAPILUS_BLOOD_LABELS.c, bloodHapilusHire: HAPILUS_BLOOD_LABELS.hire, bloodHapilusNight: HAPILUS_BLOOD_LABELS.night }).map(([key, label]) => {
                              const lockedChecked = formData.items[key];
                              return (
                                <label key={key} className={`flex items-center gap-2 text-xs cursor-not-allowed ${lockedChecked ? 'text-slate-800 font-bold' : 'text-slate-500'}`}>
                                  <input
                                    type="checkbox"
                                    name={`item_${key}`}
                                    checked={formData.items[key]}
                                    onChange={handleChange}
                                    disabled={true}
                                    className={`w-3.5 h-3.5 rounded ${lockedChecked ? 'accent-emerald-600' : 'border-slate-300'}`}
                                  /> {label}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {formData.items.bloodPressure && (() => {
                        const bpLocked = BP_TWO_MEASURE_LOCKED_PURPOSES.includes(formData.purpose);
                        return (
                          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                            <span className="text-[11px] font-black text-blue-600 whitespace-nowrap">血圧測定</span>
                            {['1', '2'].map(count => (
                              <label key={count} className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold ${bpLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${formData.bpMeasureCount === count ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}>
                                <input
                                  type="radio"
                                  name="bpMeasureCount"
                                  value={count}
                                  checked={formData.bpMeasureCount === count}
                                  onChange={handleChange}
                                  disabled={bpLocked}
                                  className="sr-only"
                                />
                                {count}回
                              </label>
                            ))}
                          </div>
                        );
                      })()}
                      <label className="text-[11px] font-bold text-slate-400 uppercase">検便</label>
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {Object.entries({ stool: '便潜血2日法', norovirus: 'ノロウイルス', bacteria3: '3菌種(赤痢・サルモネラ・O157)', bacteria5: '5菌種(赤痢・サルモネラ・O157・O111・O26)', paratyphoid: 'パラチフス・腸チフス' }).map(([key, label]) => (
                          <label key={key} className={formData.purpose === 'クリタス定期健診' && key === 'stool' ? 'flex items-center gap-2 text-xs cursor-pointer hover:text-blue-600' : cbClass}>
                            <input type="checkbox" name={`item_${key}`} checked={formData.items[key]} onChange={handleChange} disabled={isSpecialPurpose && !(formData.purpose === 'クリタス定期健診' && key === 'stool')} className="w-3.5 h-3.5 rounded border-slate-300" /> {label}
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
                          <label key={key} className={formData.purpose === 'クリタス定期健診' && key === 'psa' ? 'flex items-center gap-2 text-xs cursor-pointer hover:text-blue-600' : cbClass}>
                            <input type="checkbox" name={`item_${key}`} checked={formData.items[key]} onChange={handleChange} disabled={isSpecialPurpose && !(formData.purpose === 'クリタス定期健診' && key === 'psa')} className="w-3.5 h-3.5 rounded border-slate-300" /> {label}
                          </label>
                        ))}
                      </div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase">その他健診</label>
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {Object.entries({ hba1c: 'HbA1c', endoscopy: '胃内視鏡', echo: '腹部エコー', manganese: 'マンガン' }).map(([key, label]) => {
                          const isKuritasRegularOptional = formData.purpose === 'クリタス定期健診' && key === 'endoscopy';
                          const lockedChecked = isSpecialPurpose && !isKuritasRegularOptional && formData.items[key];
                          return (
                            <label key={key} className={isKuritasRegularOptional ? 'flex items-center gap-2 text-xs cursor-pointer hover:text-blue-600' : isSpecialPurpose ? `flex items-center gap-2 text-xs cursor-not-allowed ${lockedChecked ? 'text-slate-800 font-bold' : 'text-slate-500'}` : cbClass}>
                              <input type="checkbox" name={`item_${key}`} checked={formData.items[key]} onChange={handleChange} disabled={isSpecialPurpose && !isKuritasRegularOptional} className={`w-3.5 h-3.5 rounded ${lockedChecked ? 'accent-blue-600' : 'border-slate-300'}`} /> {label}
                            </label>
                          );
                        })}
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
                  <label className="text-[11px] font-bold text-slate-400 uppercase">備考</label>
                  <textarea name="others" value={formData.others} onChange={handleChange} className="w-full p-3 border rounded-xl h-24 text-sm resize-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="flex items-stretch gap-3">
                  {/* 左半分：予約担当者 */}
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase">予約担当者 <span className="text-red-500">*</span></label>
                    <select
                      value={formData.staffId}
                      onChange={(e) => {
                        const sid = e.target.value;
                        const member = staffMembers.find(m => String(m.id) === sid);
                        setFormData(prev => ({ ...prev, staffId: sid, staffName: member ? member.name : '' }));
                      }}
                      className="w-full p-4 border rounded-xl bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">担当者を選択</option>
                      {staffMembers.map(m => (
                        <option key={m.id} value={String(m.id)}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* 右半分：保存ボタン */}
                  <div className="flex-1 flex flex-col">
                    <label className="text-[11px] font-bold text-transparent uppercase select-none">保存</label>
                    <button
                      onClick={handleSave}
                      disabled={saveStatus === 'saving'}
                      className={`w-full flex-1 font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
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
                {saveStatus === 'error' && saveErrorMessage && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    {saveErrorMessage}
                  </div>
                )}
                </>}

                {/* ===== 診断結果入力タブ（健康診断書と連動） ===== */}
                {leftTab === 'result' && (
                  <div className="space-y-5">
                    <div ref={kenshinTopRef} />

                    {/* 対象者検索 */}
                    <div className="space-y-2" ref={resultSearchRef}>
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">対象者検索（氏名・ヨミガナ・ID・生年月日）</label>
                        <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                          {[
                            { key: 'reservation', label: '予約者' },
                            { key: 'patient', label: '患者マスタ' },
                          ].map(mode => (
                            <button
                              key={mode.key}
                              type="button"
                              onClick={() => {
                                setResultSearchMode(mode.key);
                                setResultQuery('');
                                setResultSuggestions([]);
                                setShowResultSuggestions(false);
                              }}
                              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${resultSearchMode === mode.key ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                        <input
                          type="text"
                          value={resultQuery}
                          onChange={e => setResultQuery(e.target.value)}
                          placeholder={resultSearchMode === 'reservation' ? '予約者を検索...' : '患者マスタを検索...'}
                          className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50"
                        />
                        {resultSearching && resultQuery.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs text-slate-400">検索中...</div>
                        )}
                        {showResultSuggestions && !resultSearching && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {resultSuggestions.length === 0 && (
                              <div className="px-4 py-3 text-xs text-slate-400">該当するデータが見つかりません</div>
                            )}
                            {resultSuggestions.map(item => (
                              <div
                                key={resultSearchMode === 'reservation' ? item.id : item.patient_id}
                                onMouseDown={() => resultSearchMode === 'reservation' ? handleSelectKenshinReservation(item) : handleSelectKenshinPatient(item)}
                                className="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0"
                              >
                                <div className="font-bold text-sm">{item.patient_name}</div>
                                <div className="text-xs text-slate-500 flex gap-3">
                                  <span>{item.patient_name_kana}</span>
                                  <span>ID: {item.patient_id}</span>
                                  {resultSearchMode === 'reservation' && item.date && <span>予約日: {item.date.replace(/-/g, '/')}</span>}
                                  {resultSearchMode === 'reservation' && item.purpose && <span>{item.purpose}</span>}
                                  {resultSearchMode === 'patient' && item.patient_dob && <span>{item.patient_dob.replace(/-/g, '/')}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedKenshinReservation && (
                        <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800">
                          <span className="font-bold">
                            選択中の予約：{selectedKenshinReservation.name || '氏名未入力'} / {selectedKenshinReservation.date ? selectedKenshinReservation.date.replace(/-/g, '/') : '日付未入力'}{selectedKenshinReservation.purpose ? ` / ${selectedKenshinReservation.purpose}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedKenshinReservation(null)}
                            className="text-emerald-700 hover:text-emerald-900 font-bold"
                          >
                            解除
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">健診受診日</label>
                        <input type="date" name="kDate" value={kenshinData.kDate} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">カルテID (任意)</label>
                        <input type="text" name="kId" value={kenshinData.kId} onChange={handleKenshinChange} placeholder="ID-00000" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">氏名</label>
                        <input type="text" name="kName" value={kenshinData.kName} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">ヨミガナ</label>
                        <input type="text" name="kYurigana" value={kenshinData.kYurigana} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">生年月日（例: S42.1.25）</label>
                        <input
                          type="text"
                          placeholder="S420125 / 19670125 / S42.1.25"
                          value={kenshinBirthDateInput}
                          onChange={e => setKenshinBirthDateInput(e.target.value)}
                          onBlur={handleKenshinBirthDateBlur}
                          className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="text-sm text-emerald-600 pl-2">
                          {kenshinData.kBirthDate ? formatDobDisplay(kenshinData.kBirthDate) : <span className="text-slate-300">未入力</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase">健診時年齢</label>
                          <div className="w-full p-2 border rounded-lg bg-slate-50 min-h-[42px] text-sm flex items-center">
                            {kenshinData.kAge !== '' && kenshinData.kAge != null ? <span className="text-blue-600 font-bold">{kenshinData.kAge} 歳</span> : <span className="text-slate-300">年齢は自動計算</span>}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase">性別</label>
                          <select name="kGender" value={kenshinData.kGender} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                            <option value="">未選択</option>
                            <option value="男">男</option>
                            <option value="女">女</option>
                            <option value="その他">その他</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">連絡先電話番号</label>
                        <input type="text" name="kContact" value={kenshinData.kContact} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <div className="h-[16px] flex items-start justify-between">
                          <label className="text-[11px] font-bold text-slate-400 uppercase">団体名</label>
                          <button type="button" onClick={() => openCompanyModal('kenshin')} className="h-[16px] px-2 rounded bg-blue-50 border border-blue-100 text-[11px] leading-none font-bold text-blue-600 hover:bg-blue-100 hover:text-blue-700">団体管理</button>
                        </div>
                        {renderCompanyCombobox({
                          value: kenshinData.kCompanyName,
                          showOptions: showKenshinCompanyOptions,
                          setShowOptions: setShowKenshinCompanyOptions,
                          onInput: handleKenshinCompanyInput,
                          onSelect: handleKenshinCompanyOptionSelect,
                          focusClass: 'focus:ring-2 focus:ring-emerald-500',
                          inputRef: kenshinCompanyRef,
                        })}
                      </div>
                    </div>

                    {/* 住所 */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">住所</label>
                      <input type="text" name="address" value={kenshinData.address} onChange={handleKenshinChange} placeholder="住所を入力" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>

                    {/* 既往歴・服薬歴・喫煙歴・自覚症状グループ */}
                    <div className="border border-emerald-200 rounded-xl p-3 space-y-3 bg-emerald-50/30">
                      <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">既往歴・服薬歴・喫煙歴・飲酒・自覚症状</div>

                      {/* 既往歴 */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">既往歴</label>
                        <input type="text" name="medicalHistory" value={kenshinData.medicalHistory} onChange={handleKenshinChange} placeholder="なし / 高血圧など" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                      </div>

                      {/* 服薬歴 */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">服薬歴</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '血圧', name: 'medBP' },
                            { label: '血糖', name: 'medBG' },
                            { label: '脂質', name: 'medLipid' },
                          ].map(({ label, name }) => (
                            <div key={name} className="space-y-0.5">
                              <div className="text-[10px] text-slate-500 font-medium text-center">{label}</div>
                              <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="なし / 薬剤名" className="w-full p-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 text-center bg-white" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 喫煙歴・飲酒 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase">喫煙歴</label>
                          <input type="text" name="smokingHistory" value={kenshinData.smokingHistory} onChange={handleKenshinChange} placeholder="なし / 〇本×〇年など" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase">飲酒</label>
                          <input type="text" name="drinkingHistory" value={kenshinData.drinkingHistory} onChange={handleKenshinChange} placeholder="なし / 〇合×週〇日など" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                        </div>
                      </div>

                      {/* 自覚症状 */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">自覚症状</label>
                        <input type="text" name="subjective" value={kenshinData.subjective} onChange={handleKenshinChange} placeholder="なし / 症状など" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                      </div>
                    </div>

                    {/* 身体測定 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">身体測定</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: '身長(cm)', name: 'height' },
                          { label: '体重(kg)', name: 'weight' },
                          { label: '腹囲(cm)', name: 'waist' },
                        ].map(({ label, name }) => (
                          <div key={name} className="space-y-1">
                            <div className="text-xs text-slate-500 font-medium text-center">{label}</div>
                            <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="0.0" className="w-full p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                          </div>
                        ))}
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500 font-medium text-center">BMI</div>
                          <div className="w-full p-2 border rounded-lg text-center text-sm bg-slate-50 text-slate-700 font-mono">{kenshinData.bmi || '−'}</div>
                        </div>
                      </div>
                    </div>

                    {/* 血圧・脈拍 */}
                    <div className="grid grid-cols-4 gap-2 items-end">
                      <div className="col-span-2 space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">血圧 <span className="normal-case">(mmHg)</span></label>
                        <div className="flex items-center gap-2 w-full">
                          <input type="text" name="bpSys" value={kenshinData.bpSys} onChange={handleKenshinChange} placeholder="収縮期" className="min-w-0 flex-1 p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                          <span className="text-slate-500 font-bold">/</span>
                          <input type="text" name="bpDia" value={kenshinData.bpDia} onChange={handleKenshinChange} placeholder="拡張期" className="min-w-0 flex-1 p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase">脈拍</label>
                        <input type="text" name="pulse" value={kenshinData.pulse} onChange={handleKenshinChange} placeholder="回/分" className="w-full p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>

                    {/* 視力・色神 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">視力・色神</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { label: '裸眼 右', name: 'visionR',     placeholder: '0.0' },
                          { label: '裸眼 左', name: 'visionL',     placeholder: '0.0' },
                          { label: '矯正 右', name: 'visionR2',    placeholder: '0.0' },
                          { label: '矯正 左', name: 'visionL2',    placeholder: '0.0' },
                        ].map(({ label, name, placeholder }) => (
                          <div key={name} className="space-y-0.5">
                            <div className="text-[10px] text-slate-500 text-center">{label}</div>
                            <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder={placeholder} className="w-full p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                          </div>
                        ))}
                        {/* 色神 ドロップダウン */}
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-slate-500 text-center">色神</div>
                          <select name="colorVision" value={kenshinData.colorVision} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                            <option value="">　</option>
                            <option value="正常">正常</option>
                            <option value="異常">異常</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 聴力 */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: '聴力1000Hz 右', name: 'hearingR' },
                        { label: '聴力1000Hz 左', name: 'hearingL' },
                        { label: '聴力4000Hz 右', name: 'hearing4000R' },
                        { label: '聴力4000Hz 左', name: 'hearing4000L' },
                      ].map(({ label, name }) => (
                        <div key={name} className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase">{label}</label>
                          <select name={name} value={kenshinData[name]} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                            <option value="">　</option>
                            <option value="正常">正常</option>
                            <option value="異常">異常</option>
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* 尿検査 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">尿検査</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: '糖',            name: 'urineGlucose',        select: true },
                            { label: '蛋白',          name: 'urineProtein',         select: true },
                            { label: 'ウロビリノーゲン', name: 'urineUrobilinogen',  select: true },
                            { label: 'ビリルビン',    name: 'urineBilirubin',        select: true },
                            { label: '比重',          name: 'urineSpecificGravity',  select: false },
                            { label: 'pH',            name: 'urinePh',               select: false },
                            { label: 'ケトン体',      name: 'urineKetone',           select: true },
                            { label: '潜血',          name: 'urineOccultBlood',      select: true },
                          ].map(({ label, name, select }) => (
                            <div key={name} id={`kenshin-field-${name}`} className="space-y-0.5">
                              <div className="text-xs text-slate-500 text-center">{label}</div>
                              {select ? (
                                <select name={name} value={kenshinData[name]} onChange={handleKenshinChange} className={`w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${highlightedField === name ? 'ring-2 ring-orange-400 bg-orange-50' : 'bg-white'}`}>
                                  <option value="">　</option>
                                  <option value="(-)">(-)</option>
                                  <option value="(±)">(±)</option>
                                  <option value="(1+)">(1+)</option>
                                  <option value="(2+)">(2+)</option>
                                  <option value="(3+)">(3+)</option>
                                  <option value="(4+)">(4+)</option>
                                </select>
                              ) : (
                                <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="(-)" className={`w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${highlightedField === name ? 'ring-2 ring-orange-400 bg-orange-50' : 'bg-white'}`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 胸部X-P検査 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">胸部X-P検査</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">撮影日</div>
                          <input type="date" name="xRayDate" value={kenshinData.xRayDate} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">撮影区分</div>
                          <select name="xRayCategory" value={kenshinData.xRayCategory} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                            <option value="">　</option>
                            <option value="直接">直接</option>
                            <option value="間接">間接</option>
                          </select>
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
                              <div key={name} id={`kenshin-field-${name}`} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <div className="flex items-center gap-0.5">
                                  <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className={`flex-1 min-w-0 p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${highlightedField === name ? 'ring-2 ring-orange-400 bg-orange-50' : 'bg-white'}`} />
                                  {(() => { const a = getBloodArrow(name, kenshinData[name], kenshinData.kGender); return a ? <span className={`text-xl font-black flex-shrink-0 ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()}
                                </div>
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
                                <div className="flex items-center gap-0.5">
                                  <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="flex-1 min-w-0 p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                                  {(() => { const a = getBloodArrow(name, kenshinData[name], kenshinData.kGender); return a ? <span className={`text-xl font-black flex-shrink-0 ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()}
                                </div>
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
                              <div key={name} id={`kenshin-field-${name}`} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <div className="flex items-center gap-0.5">
                                  <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className={`flex-1 min-w-0 p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${highlightedField === name ? 'ring-2 ring-orange-400 bg-orange-50' : 'bg-white'}`} />
                                  {(() => { const a = getBloodArrow(name, kenshinData[name], kenshinData.kGender); return a ? <span className={`text-xl font-black flex-shrink-0 ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()}
                                </div>
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
                              <div key={name} id={`kenshin-field-${name}`} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <div className="flex items-center gap-0.5">
                                  <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className={`flex-1 min-w-0 p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${highlightedField === name ? 'ring-2 ring-orange-400 bg-orange-50' : 'bg-white'}`} />
                                  {(() => { const a = getBloodArrow(name, kenshinData[name], kenshinData.kGender); return a ? <span className={`text-xl font-black flex-shrink-0 ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()}
                                </div>
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
                              <div key={name} id={`kenshin-field-${name}`} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <div className="flex items-center gap-0.5">
                                  <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className={`flex-1 min-w-0 p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${highlightedField === name ? 'ring-2 ring-orange-400 bg-orange-50' : 'bg-white'}`} />
                                  {(() => { const a = getBloodArrow(name, kenshinData[name], kenshinData.kGender); return a ? <span className={`text-xl font-black flex-shrink-0 ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()}
                                </div>
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
                                <div className="flex items-center gap-0.5">
                                  <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="flex-1 min-w-0 p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                                  {(() => { const a = getBloodArrow(name, kenshinData[name], kenshinData.kGender); return a ? <span className={`text-xl font-black flex-shrink-0 ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()}
                                </div>
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
                              <div key={name} id={`kenshin-field-${name}`} className="space-y-0.5">
                                <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                                <div className="flex items-center gap-0.5">
                                  <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className={`flex-1 min-w-0 p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${highlightedField === name ? 'ring-2 ring-orange-400 bg-orange-50' : 'bg-white'}`} />
                                  {(() => { const a = getBloodArrow(name, kenshinData[name], kenshinData.kGender); return a ? <span className={`text-xl font-black flex-shrink-0 ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()}
                                </div>
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
                                <div className="flex items-center gap-0.5">
                                  <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="flex-1 min-w-0 p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                                  {(() => { const a = getBloodArrow(name, kenshinData[name], kenshinData.kGender); return a ? <span className={`text-xl font-black flex-shrink-0 ${a === '↑' ? 'text-red-500' : 'text-blue-500'}`}>{a}</span> : null; })()}
                                </div>
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

                    {/* 有機溶剤 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">有機溶剤</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'メタノール', name: 'methanol' },
                            { label: 'ノルマルヘキサン', name: 'normalHexane' },
                            { label: 'メチル馬尿酸', name: 'methylHippuric' },
                          ].map(({ label, name }) => (
                            <div key={name} className="space-y-0.5">
                              <div className="text-[10px] text-slate-500 text-center leading-tight">{label}</div>
                              <input type="text" name={name} value={kenshinData[name]} onChange={handleKenshinChange} placeholder="―" className="w-full p-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* その他 */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">その他</label>
                      <textarea name="otherExams" value={kenshinData.otherExams} onChange={handleKenshinChange} className="w-full p-3 border border-slate-200 rounded-xl h-20 text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50" placeholder="その他の検査結果など" />
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

                    {/* 医師名 */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">医師名</label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-4 flex-wrap">
                          {['杉原一明', '杉原一信'].map(name => (
                            <label key={name} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="doctorName"
                                value={name}
                                checked={kenshinData.doctorName === name}
                                onChange={handleKenshinChange}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              <span className="text-sm font-medium">{name}</span>
                            </label>
                          ))}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="doctorName"
                              value="その他"
                              checked={kenshinData.doctorName === 'その他'}
                              onChange={handleKenshinChange}
                              className="w-4 h-4 accent-emerald-600"
                            />
                            <span className="text-sm font-medium">その他</span>
                          </label>
                          {kenshinData.doctorName === 'その他' && (
                            <input
                              type="text"
                              name="doctorNameCustom"
                              value={kenshinData.doctorNameCustom}
                              onChange={handleKenshinChange}
                              placeholder="医師名を入力"
                              className="flex-1 min-w-[140px] p-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                          )}
                          {kenshinData.doctorName && (
                            <button
                              onClick={() => setKenshinData(prev => ({ ...prev, doctorName: '', doctorNameCustom: '' }))}
                              className="ml-auto text-xs text-slate-400 hover:text-slate-600"
                            >クリア</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 診断日 */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">診断日（健康診断書の発行日）</label>
                      <input type="date" name="issueDate" value={kenshinData.issueDate} onChange={handleKenshinChange} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>

                    {/* 健康診断結果保存ボタン */}
                    <button
                      onClick={handleKenshinSave}
                      disabled={kenshinSaveStatus === 'saving'}
                      className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${kenshinSaveStatus === 'saved' ? 'bg-green-500 text-white' : kenshinSaveStatus === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                      <Save size={18} />
                      {kenshinSaveStatus === 'saving' ? '保存中...' : kenshinSaveStatus === 'saved' ? '保存しました ✓' : kenshinSaveStatus === 'error' ? '保存失敗 ✗' : '健康診断結果を保存'}
                    </button>
                    <div ref={kenshinBottomRef} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* スクロールボタン（診断結果入力タブ時のみ・入力枠左3mmに固定表示） */}
          {leftTab === 'result' && (
            <div className="hidden lg:flex flex-col gap-2 fixed z-40 print-hide" style={{left: 'calc(50vw - 751px)', top: '50%', transform: 'translateY(-50%)'}}>
              <button
                onClick={() => kenshinTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition-all"
                title="先頭へ"
              >▲</button>
              <button
                onClick={() => kenshinBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition-all"
                title="末尾へ"
              >▼</button>
            </div>
          )}

        {/* 右セクション: PDF風プレビュー / カレンダー */}
        <div className="w-full lg:w-[690px] shrink-0 print-right lg:flex lg:flex-col lg:h-full lg:min-h-0 relative">
          {/* 団体一覧表示時のみ：スクロールバー右外側の先頭/末尾ジャンプボタン */}
          {rightTab === 'calendar' && calendarViewMode === 'list' && (
            <div className="hidden lg:flex flex-col gap-2 absolute z-40 print-hide" style={{ left: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)' }}>
              <button
                onClick={() => calendarScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition-all"
                title="先頭へ"
              >▲</button>
              <button
                onClick={() => calendarScrollRef.current?.scrollTo({ top: calendarScrollRef.current.scrollHeight, behavior: 'smooth' })}
                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition-all"
                title="末尾へ"
              >▼</button>
            </div>
          )}
          <button
            onClick={async () => {
              const pw = window.prompt('バックアップ管理のパスワードを入力してください');
              if (pw === null) return;
              if (pw !== '0125') { showNotice('パスワードが違います'); return; }
              setShowBackupModal(true); setBackupMessage(''); await refreshBackupList();
            }}
            className="absolute right-2 top-0 z-20 flex items-center gap-2 bg-purple-50 border border-purple-200 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 hover:bg-purple-100 shadow-sm transition-all whitespace-nowrap print-hide"
            title="患者管理"
          >
            <Database size={14} /> 患者管理
          </button>
          <div className="lg:flex lg:flex-col lg:h-full lg:min-h-0">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4 px-2 pr-[118px] print-hide lg:shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {/* 表示切替：予約プレビュー・予約カレンダー・診断書プレビュー・診断書検索 */}
                <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200">
                  <button
                    onClick={() => { setRightTab('preview'); setLeftTab('reservation'); }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${rightTab === 'preview' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-blue-600 hover:bg-white'}`}
                  >
                    <ListTodo size={12} /> 予約プレビュー
                  </button>
                  <button
                    onClick={() => { setRightTab('calendar'); setLeftTab('reservation'); fetchCalendarData(calendarCompanyId); }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${rightTab === 'calendar' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-blue-600 hover:bg-white'}`}
                  >
                    <Calendar size={12} /> 予約カレンダー
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRightTab('kenshin'); setLeftTab('result'); }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${rightTab === 'kenshin' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-emerald-600 hover:bg-white'}`}
                  >
                    <ClipboardCheck size={12} /> 診断書プレビュー
                  </button>
                  <button
                    type="button"
                    onClick={() => { setKenshinModalQuery(''); setShowKenshinModal(true); }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-black transition-all duration-200 text-slate-500 hover:text-emerald-600 hover:bg-white flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Search size={12} /> 診断書検索
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 print-hide">
                {(rightTab === 'preview' || rightTab === 'kenshin') && (
                  <>
                    {rightTab === 'preview' && (
                      <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={printAttachmentSheet}
                          onChange={(e) => setPrintAttachmentSheet(e.target.checked)}
                          className="h-3.5 w-3.5 accent-blue-600"
                        />
                        貼付台紙も印刷
                      </label>
                    )}
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-sm transition-all whitespace-nowrap">
                      <Printer size={14} /> 用紙印刷
                    </button>
                  </>
                )}
              </div>
            </div>

            <div ref={calendarScrollRef} className="lg:flex-1 lg:overflow-y-auto lg:min-h-0 kenshin-scroll-wrapper">

            {/* カレンダービュー */}
            {rightTab === 'calendar' && (
              <div className="company-calendar-card bg-white shadow-xl rounded-xl border border-slate-200 p-4">
                <div className="company-list-print-hide sticky top-0 z-30 -mx-4 -mt-4 mb-4 flex flex-col gap-2 border-b border-slate-100 bg-white px-4 pt-4 pb-4">
                  {/* 1段目: 表示切替・件数・リセット/印刷 */}
                  <div className="flex items-center gap-2">
                    <div className="flex shrink-0 gap-1.5 bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200">
                      <button
                        type="button"
                        onClick={() => { setCalendarViewMode('calendar'); fetchCalendarData(calendarCompanyId); }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${calendarViewMode === 'calendar' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:text-blue-600 hover:bg-white'}`}
                      >
                        <Calendar size={12} /> カレンダー
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarViewMode('list')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${calendarViewMode === 'list' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600 hover:bg-white'}`}
                      >
                        <ListTodo size={12} /> 団体別一覧
                      </button>
                    </div>
                    <div className="shrink-0 min-w-[42px] text-left text-sm font-black text-indigo-600 whitespace-nowrap">
                      {calendarViewMode === 'list'
                        ? getFilteredCalendarListData().length
                        : Object.values(calendarData).reduce((sum, reservations) => sum + reservations.filter(matchesCalendarFilters).length, 0)}件
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={openTodayReservationsModal}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-xs font-bold text-amber-700 hover:bg-amber-100 whitespace-nowrap"
                      >
                        <Calendar size={13} /> {'\u672c\u65e5\u306e\u4e00\u89a7'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCalendarCompanyId('');
                          setCalendarPurpose('');
                          setCalendarDateFrom('');
                          setCalendarDateTo('');
                          setSelectedCalendarDate(null);
                          setCalendarDetailData({});
                          setCalendarListData([]);
                          setCalendarListError('');
                          pendingCalendarScrollRef.current = true;
                          fetchCalendarData('');
                        }}
                        disabled={!calendarCompanyId && !calendarPurpose && !calendarDateFrom && !calendarDateTo}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        リセット
                      </button>
                      {calendarViewMode === 'list' && (
                        <button
                          type="button"
                          onClick={handlePrintCompanyList}
                          disabled={calendarListLoading || getFilteredCalendarListData().length === 0}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          <Printer size={13} /> 印刷
                        </button>
                      )}
                    </div>
                  </div>
                  {/* 2段目: 団体・健診目的のフィルタ */}
                  <div className="flex items-center gap-2">
                    <label className="shrink-0 text-[11px] font-black text-slate-400">団体</label>
                    <select
                      value={calendarCompanyId}
                      onChange={e => {
                        const companyId = e.target.value;
                        setCalendarCompanyId(companyId);
                        setSelectedCalendarDate(null);
                        setCalendarDetailData({});
                        setCalendarListData([]);
                        setCalendarListError('');
                        pendingCalendarScrollRef.current = true;
                        fetchCalendarData(companyId);
                      }}
                      className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">すべての団体</option>
                      {getActiveHealthCompanies().map(company => (
                        <option key={company.id} value={company.id}>
                          {company.display_no != null ? `${company.display_no} ` : ''}{company.name}
                        </option>
                      ))}
                    </select>
                    <label className="shrink-0 text-[11px] font-black text-slate-400">目的</label>
                    <select
                      value={calendarPurpose}
                      onChange={e => { setCalendarPurpose(e.target.value); pendingCalendarScrollRef.current = true; }}
                      className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="">すべての目的</option>
                      {CALENDAR_PURPOSE_OPTIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  {/* 3段目: 健診日の期間フィルタ */}
                  <div className="flex items-center gap-2">
                    <label className="shrink-0 text-[11px] font-black text-slate-400">期間</label>
                    <input
                      type="date"
                      value={calendarDateFrom}
                      onChange={e => setCalendarDateFrom(e.target.value)}
                      className="w-[145px] border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <span className="text-xs font-black text-slate-400">〜</span>
                    <input
                      type="date"
                      value={calendarDateTo}
                      onChange={e => setCalendarDateTo(e.target.value)}
                      className="w-[145px] border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      type="button"
                      onClick={() => { setCalendarDateFrom(''); setCalendarDateTo(''); }}
                      disabled={!calendarDateFrom && !calendarDateTo}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      期間クリア
                    </button>
                    <div className="min-w-0 flex-1 text-[11px] font-bold text-slate-400 truncate">
                      {getCalendarDateRangeLabel()}
                    </div>
                  </div>
                </div>
                {calendarViewMode === 'calendar' ? (calendarLoading ? (
                  <div className="text-center text-slate-400 py-10">読み込み中...</div>
                ) : (
                  <div className="space-y-6">
                    {Array.from({ length: 25 }, (_, idx) => {
                      const i = idx - 12; // 過去12ヶ月 〜 先12ヶ月
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
                              const reservations = dateStr ? (calendarData[dateStr] || []).filter(matchesCalendarFilters) : [];
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
                                    setLeftTab('reservation');
                                  }}
                                  className={`min-h-[52px] p-1 text-[10px] ${!day ? 'bg-slate-50' : isDisabled ? 'bg-rose-50 cursor-not-allowed' : isToday ? 'bg-orange-50 cursor-pointer hover:bg-orange-100' : isPast ? 'bg-slate-100 cursor-pointer hover:bg-slate-200' : 'bg-white cursor-pointer hover:bg-sky-50'} ${isToday ? 'ring-2 ring-inset ring-orange-500' : ''} ${dateStr === formData.date ? 'ring-2 ring-inset ring-indigo-500' : ''}`}
                                >
                                  {day && (
                                    <>
                                      <div className="flex justify-between items-center mb-0.5">
                                        {isToday ? (
                                          <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-orange-500 text-white font-black leading-none shadow-sm">{day}</span>
                                        ) : (
                                          <span className={`font-bold ${isDisabled ? 'text-rose-300' : isSat ? 'text-sky-500' : 'text-slate-600'}`}>{day}</span>
                                        )}
                                      </div>
                                      {reservations.map((r, ri) => {
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
                                      })}
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
                )) : (
                  <div className="company-list-print-area space-y-3">
                    {calendarListLoading ? (
                      <div className="text-center text-slate-400 py-10">一覧を読み込み中...</div>
                    ) : calendarListError ? (
                      <div className="text-center text-red-500 py-10 text-sm font-bold">{calendarListError}</div>
                    ) : getFilteredCalendarListData().length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-bold text-slate-400">
                        {getCalendarListEmptyMessage()}
                      </div>
                    ) : (
                      <>
                        <div className="company-list-print-header hidden">
                          <div className="text-xl font-black text-slate-800">{calendarCompanyId ? '団体別 健康診断予約一覧' : '健康診断予約一覧'}</div>
                          <div className="mt-1 text-sm font-bold text-slate-600">{getSelectedCalendarCompanyName()}{calendarPurpose ? `　／　目的: ${calendarPurpose}` : ''}{getCalendarDateRangeLabel() ? `　／　${getCalendarDateRangeLabel()}` : ''}</div>
                          <div className="mt-1 text-xs text-slate-400">表示順: {getCalendarListSortLabel()}　印刷日: {new Date().toLocaleDateString('ja-JP')}</div>
                        </div>
                        <div className="company-list-summary grid grid-cols-3 gap-2">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[10px] font-black text-slate-400">件数</div>
                            <div className="text-lg font-black text-slate-700">{getFilteredCalendarListData().length}件</div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[10px] font-black text-slate-400">合計金額</div>
                            <div className="text-lg font-black text-indigo-600">{formatReservationFee(getCalendarListTotalFee())}</div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="text-[10px] font-black text-slate-400">表示順</div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <select
                                value={calendarListSortField}
                                onChange={e => setCalendarListSortField(e.target.value)}
                                className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300"
                              >
                                <option value="date">健診日</option>
                                <option value="fee">金額</option>
                                <option value="kana">読み仮名</option>
                                <option value="registered">登録</option>
                              </select>
                              <div className="flex shrink-0 rounded-lg border border-slate-200 bg-white overflow-hidden">
                                {[['asc', '昇順'], ['desc', '降順']].map(([dir, label]) => (
                                  <button
                                    key={dir}
                                    type="button"
                                    onClick={() => setCalendarListSortDir(dir)}
                                    className={`px-2 py-1 text-xs font-black transition-colors ${calendarListSortDir === dir ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="company-list-table overflow-hidden rounded-xl border border-slate-200">
                          <div className="company-list-table-header grid grid-cols-[88px_1fr_92px_88px] gap-2 bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-500">
                            <div>健診日</div>
                            <div>患者・健診目的</div>
                            <div className="text-right">支払い</div>
                            <div className="text-right">料金</div>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {getSortedCalendarListData().map((r, i) => {
                              const itemLabels = getReservationItemLabels(r);
                              return (
                                <div
                                  key={r.id}
                                  onClick={() => fetchReservationDetailById(r.id)}
                                  className={`company-list-row grid grid-cols-[88px_1fr_92px_88px] gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 ${i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}
                                >
                                  <div>
                                    <div className="font-black text-slate-700">{r.date ? r.date.replace(/-/g, '/') : ''}</div>
                                    {(getWeekdayFromIso(r.date) || r.day_of_week) && <div className="mt-0.5 text-[10px] font-bold text-slate-400">{getWeekdayFromIso(r.date) || r.day_of_week}</div>}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-baseline gap-3 min-w-0">
                                      <div className="font-black text-slate-800 truncate">{r.patient_name}</div>
                                      {r.patient_id && <div className="shrink-0 text-xs font-black text-emerald-600">ID: {r.patient_id}</div>}
                                      <div className="shrink-0 text-[11px] font-bold text-slate-600">{r.purpose}</div>
                                    </div>
                                    {(r.patient_name_kana || r.company_name) && (
                                      <div className="flex items-baseline justify-between gap-2 leading-tight">
                                        <div className="text-[10px] font-bold text-slate-400 truncate">{r.patient_name_kana}</div>
                                        {r.company_name && <div className="shrink-0 text-[10px] font-bold text-indigo-500 truncate max-w-[55%]">🏢 {r.company_name}</div>}
                                      </div>
                                    )}
                                    {(r.birth_date || (r.age != null && r.age !== '')) && (
                                      <div className="flex gap-2 text-[10px] font-bold text-slate-500 leading-tight">
                                        {r.birth_date && <span>{formatDobDisplay(parseDobToISO(r.birth_date))}</span>}
                                        {r.age != null && r.age !== '' && <span className="text-blue-600 font-bold">{r.age}歳</span>}
                                      </div>
                                    )}
                                    {itemLabels.length > 0 && (
                                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                                        {itemLabels.map(item => (
                                          <span key={item} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{item}</span>
                                        ))}
                                      </div>
                                    )}
                                    {r.others && (
                                      <div className="mt-0.5 text-[10px] font-bold text-amber-700 whitespace-pre-wrap">
                                        備考: {r.others}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col text-right">
                                    <div className="font-bold text-slate-500">{getCompanyBillingLabel(r.purpose) || r.payment_type || '-'}</div>
                                    {r.created_at && (
                                      <div className="mt-auto pt-1 text-[10px] font-bold text-emerald-600">
                                        登録: {(() => { const d = new Date(r.created_at); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; })()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right font-black text-blue-600">{formatReservationFee(r.fee ?? calcKuritasFee(r.purpose, { xRay: r.item_xray, endoscopy: r.item_endoscopy, stool: r.item_stool, psa: r.item_psa }))}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {(() => {
                          const { feeGroups, billingCount, totalCount } = getCalendarListFeeBreakdown();
                          if (totalCount === 0) return null;
                          return (
                            <div className="company-list-feebreak rounded-xl border border-slate-200 overflow-hidden" style={{ breakInside: 'avoid' }}>
                              <div className="bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600">金額別 件数・小計</div>
                              <div className="divide-y divide-slate-100">
                                {feeGroups.map(g => (
                                  <div key={g.fee} className="grid grid-cols-[1fr_64px_120px] gap-2 px-3 py-1.5 text-xs">
                                    <div className="font-black text-blue-600">¥{g.fee.toLocaleString()}</div>
                                    <div className="text-right font-bold text-slate-600">{g.count}件</div>
                                    <div className="text-right font-black text-indigo-600">¥{g.subtotal.toLocaleString()}</div>
                                  </div>
                                ))}
                                {billingCount > 0 && (
                                  <div className="grid grid-cols-[1fr_64px_120px] gap-2 px-3 py-1.5 text-xs">
                                    <div className="font-black text-slate-500">（請求分）</div>
                                    <div className="text-right font-bold text-slate-600">{billingCount}件</div>
                                    <div className="text-right font-black text-slate-400">—</div>
                                  </div>
                                )}
                                <div className="grid grid-cols-[1fr_64px_120px] gap-2 px-3 py-1.5 text-xs bg-slate-50">
                                  <div className="font-black text-slate-700">合計</div>
                                  <div className="text-right font-black text-slate-700">{totalCount}件</div>
                                  <div className="text-right font-black text-indigo-700">¥{getCalendarListTotalFee().toLocaleString()}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 予約検索モーダル */}
            {showPatientModal && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPatientModal(false)}>
                <div className="bg-[#1e2a3a] rounded-2xl shadow-2xl p-6 w-full max-w-xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-teal-500 p-2 rounded-lg"><Search size={18} className="text-white" /></div>
                      <h2 className="text-white font-bold text-lg">予約患者検索</h2>
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
                      placeholder="ID・氏名・ヨミガナ・生年月日・団体名・健診日・健診目的で検索..."
                      className="w-full pl-9 pr-3 py-3 rounded-xl border-2 border-teal-400 bg-slate-50 outline-none focus:border-teal-500 text-sm"
                    />
                  </div>
                  <div className="mt-4 max-h-[420px] overflow-y-auto space-y-2 pr-1">
                    {modalSearching && <div className="text-center text-slate-400 py-6 text-sm">検索中...</div>}
                    {!modalSearching && modalQuery.length > 0 && modalSuggestions.length === 0 && (
                      <div className="text-center text-slate-400 py-6 text-sm">該当する予約が見つかりません</div>
                    )}
                    {!modalSearching && modalQuery.length === 0 && (
                      <div className="text-center text-slate-500 py-8 flex flex-col items-center gap-2">
                        <Search size={28} className="text-slate-600" />
                        <span className="text-sm">患者情報・団体名・健診日・健診目的を入力してください</span>
                      </div>
                    )}
                    {!modalSearching && modalSuggestions.map(r => (
                      <button
                        type="button"
                        key={r.id}
                        onClick={async () => {
                          await handleLoadReservation(r.id, true);
                          setShowPatientModal(false);
                          setModalQuery('');
                          setModalSuggestions([]);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:bg-blue-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-black text-sm text-slate-800 truncate">{r.patient_name}</div>
                            <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                              {r.patient_name_kana && <span>{r.patient_name_kana}</span>}
                              {r.patient_id && <span className="font-bold text-emerald-600">ID: {r.patient_id}</span>}
                              {r.patient_gender && <span>{r.patient_gender}</span>}
                              {r.birth_date && <span>{formatDobDisplay(parseDobToISO(r.birth_date))}</span>}
                            </div>
                          </div>
                          <div className="shrink-0 text-right text-xs font-black text-blue-700">
                            <div>{r.date ? r.date.replace(/-/g, '/') : ''}</div>
                            <div className="text-[10px] text-slate-400">{getWeekdayFromIso(r.date) || r.day_of_week || ''}</div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {r.company_name && <span className="font-bold text-indigo-600">{r.company_name}</span>}
                          {r.purpose && <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-600">{r.purpose}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* バックアップ管理モーダル */}
            {showBackupModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBackupModal(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto" style={{minHeight: '80vh'}} onClick={e => e.stopPropagation()}>
                  <div className="px-8 pt-8 pb-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs tracking-widest text-purple-500 font-bold">BACKUP &amp; RESTORE</div>
                        <h2 className="text-3xl font-black text-slate-800 mt-1">バックアップ管理</h2>
                        <p className="text-sm text-slate-500 mt-1.5">データを JSON 形式で保存・復元します</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={backupBusy}
                          onClick={handleManualBackup}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Save size={16} /> 今すぐバックアップ
                        </button>
                        <button
                          disabled={backupBusy}
                          onClick={() => restoreInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        >
                          <Upload size={16} /> ファイルから復元
                        </button>
                        <button
                          disabled={backupListLoading}
                          onClick={refreshBackupList}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <RefreshCw size={16} /> 一覧を更新
                        </button>
                        <button onClick={() => setShowBackupModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold ml-2">✕</button>
                      </div>
                    </div>
                    <input
                      ref={restoreInputRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleRestoreFromFile(f); e.target.value = ''; }}
                    />
                  </div>
                  <div className="px-8 py-3 bg-white border-b border-slate-100 flex items-center gap-4 flex-wrap text-sm">
                    <span className="font-black text-slate-600">復元方式:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-slate-600">
                      <input type="radio" name="restoreMode" checked={restoreReplace} onChange={() => setRestoreReplace(true)}
                        className="w-4 h-4 accent-rose-600 cursor-pointer" />
                      完全置換
                      <span className="text-xs text-slate-400 font-normal">（全データを削除してバックアップ時点に完全に戻す）</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-slate-600">
                      <input type="radio" name="restoreMode" checked={!restoreReplace} onChange={() => setRestoreReplace(false)}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                      追加・上書き
                      <span className="text-xs text-slate-400 font-normal">（バックアップに無い現在のデータは残す）</span>
                    </label>
                  </div>
                  <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-sm">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoBackupOn}
                        onChange={e => { setAutoBackupOn(e.target.checked); setAutoBackupEnabled(e.target.checked); }}
                        className="w-5 h-5"
                      />
                      <span className="font-bold text-slate-700">自動バックアップ（起動時＋変更の3分後）</span>
                      <span className="text-slate-400 ml-2">前回: {lastBackupAt ? new Date(lastBackupAt).toLocaleString('ja-JP') : '未実行'}</span>
                    </label>
                    <span className="text-slate-400">同じ日の分は上書き保存 / 最大30日分保持 / 変更がない日は保存しない</span>
                  </div>
                  {backupMessage && (
                    <div className="px-8 py-3 text-sm text-slate-600 bg-amber-50 border-b border-amber-100">{backupMessage}</div>
                  )}
                  <div className="px-8 py-5">
                    <div className="text-sm font-bold text-slate-600 mb-3">Storage 内のバックアップ（{backupList.length} 件 / 最大30日分保持）</div>
                    {backupListLoading && <div className="text-center text-slate-400 py-6 text-sm">読み込み中...</div>}
                    {!backupListLoading && backupList.length === 0 && (
                      <div className="text-center text-slate-400 py-8 text-sm">バックアップがありません</div>
                    )}
                    {!backupListLoading && backupList.length > 0 && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600">
                            <th className="text-left px-4 py-3">日時</th>
                            <th className="text-left px-4 py-3">ファイル名</th>
                            <th className="text-right px-4 py-3">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backupList.map(item => {
                            const ts = item.updated_at || item.created_at;
                            const dt = ts ? new Date(ts).toLocaleString('ja-JP') : '';
                            return (
                              <tr key={item.name} className="border-t border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3 font-mono text-slate-700">{dt}</td>
                                <td className="px-4 py-3 font-mono text-slate-500 break-all">{item.name}</td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => handleDownloadFromStorage(item.name)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 mr-2"
                                  >
                                    <Download size={13} /> DL
                                  </button>
                                  <button
                                    disabled={backupBusy}
                                    onClick={() => handleRestoreFromStorage(item.name)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                  >
                                    <Upload size={13} /> 復元
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 診断書検索モーダル */}
            {showKenshinModal && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowKenshinModal(false)}>
                <div className="bg-[#1e2a3a] rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-600 p-2 rounded-lg"><Search size={18} className="text-white" /></div>
                      <h2 className="text-white font-bold text-lg">診断書検索</h2>
                    </div>
                    <button onClick={() => setShowKenshinModal(false)} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
                  </div>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      autoFocus
                      type="text"
                      value={kenshinModalQuery}
                      onChange={e => setKenshinModalQuery(e.target.value)}
                      placeholder="ID・氏名・ヨミガナ・生年月日・団体名・健診日で検索..."
                      className="w-full pl-9 pr-3 py-3 rounded-xl border-2 border-emerald-400 bg-slate-50 outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <div className="mt-4 max-h-72 overflow-y-auto">
                    {kenshinModalSearching && <div className="text-center text-slate-400 py-6 text-sm">検索中...</div>}
                    {!kenshinModalSearching && kenshinModalQuery.length > 0 && kenshinModalResults.length === 0 && (
                      <div className="text-center text-slate-400 py-6 text-sm">該当する診断書が見つかりません</div>
                    )}
                    {!kenshinModalSearching && kenshinModalQuery.length === 0 && kenshinModalAllResults.map(r => (
                      <div
                        key={r.id}
                        onClick={() => handleSelectKenshinRecord(r)}
                        className="relative px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-200 last:border-b-0 rounded-lg mb-1 bg-white"
                      >
                        <button
                          onClick={(e) => handleDeleteKenshinRecord(r, e)}
                          title="削除"
                          className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="font-bold text-sm pr-6">{r.k_name}</div>
                        <div className="text-xs text-slate-500 flex gap-3 mt-0.5 flex-wrap pr-6">
                          {r.k_yurigana && <span>{r.k_yurigana}</span>}
                          {r.k_id && <span>ID: {r.k_id}</span>}
                          {r.k_birth_date && <span>{formatDobDisplay(r.k_birth_date)}</span>}
                          {r.k_gender && <span>{r.k_gender}</span>}
                          {r.k_date && <span>健診日: {r.k_date}</span>}
                          {r.k_company_name && <span>{r.k_company_name}</span>}
                        </div>
                      </div>
                    ))}
                    {!kenshinModalSearching && kenshinModalResults.map(r => (
                      <div
                        key={r.id}
                        onClick={() => handleSelectKenshinRecord(r)}
                        className="relative px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-200 last:border-b-0 rounded-lg mb-1 bg-white"
                      >
                        <button
                          onClick={(e) => handleDeleteKenshinRecord(r, e)}
                          title="削除"
                          className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="font-bold text-sm pr-6">{r.k_name}</div>
                        <div className="text-xs text-slate-500 flex gap-3 mt-0.5 flex-wrap pr-6">
                          {r.k_yurigana && <span>{r.k_yurigana}</span>}
                          {r.k_id && <span>ID: {r.k_id}</span>}
                          {r.k_birth_date && <span>{formatDobDisplay(r.k_birth_date)}</span>}
                          {r.k_gender && <span>{r.k_gender}</span>}
                          {r.k_date && <span>健診日: {r.k_date}</span>}
                          {r.k_company_name && <span>{r.k_company_name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 団体マスタ管理モーダル */}
            {showCompanyModal && (() => {
              const q = getCompanyNameKey(companySearchQuery);
              const companies = healthCompanies
                .filter(company => company.is_active !== false)
                .filter(company => !q || String(company.display_no || '').includes(q) || getCompanyNameKey(company.name).includes(q));
              return (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeCompanyModal}>
                  <div className="bg-[#1e2a3a] rounded-2xl shadow-2xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg"><ListTodo size={18} className="text-white" /></div>
                        <div>
                          <h2 className="text-white font-bold text-lg">{companyPickerTarget ? '団体選択/管理' : '団体マスタ管理'}</h2>
                          <p className="text-slate-400 text-xs">{companyPickerTarget ? '候補一覧から団体を選択、または追加・名称修正' : '候補一覧の追加・名称修正'}</p>
                        </div>
                      </div>
                      <button onClick={closeCompanyModal} className="text-slate-400 hover:text-white text-xl font-bold">✕</button>
                    </div>

                    <div className="grid grid-cols-[90px_1fr_auto] gap-2 mb-3">
                      <input
                        type="number"
                        min="1"
                        value={newCompanyNo}
                        onChange={e => setNewCompanyNo(e.target.value)}
                        placeholder="番号"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={newCompanyName}
                        onChange={e => setNewCompanyName(e.target.value)}
                        placeholder="新しい団体名を追加"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddHealthCompany}
                        disabled={!normalizeCompanyName(newCompanyName) || companySaveStatus === 'saving'}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-40"
                      >
                        追加
                      </button>
                    </div>

                    <div className="relative mb-3">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={companySearchQuery}
                        onChange={e => setCompanySearchQuery(e.target.value)}
                        placeholder="団体名を検索"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-blue-100 bg-blue-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {companySaveStatus && (
                      <div className={`mb-3 text-xs font-bold ${companySaveStatus === 'saved' ? 'text-emerald-300' : companySaveStatus === 'error' ? 'text-red-300' : 'text-slate-300'}`}>
                        {companySaveStatus === 'saving' ? '保存中...' : companySaveStatus === 'saved' ? '保存しました' : '保存に失敗しました。同じ番号または団体名がないか確認してください。'}
                      </div>
                    )}

                    <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                      {companies.length === 0 && (
                        <div className="text-center text-slate-400 py-8 text-sm">表示できる団体がありません</div>
                      )}
                      {companies.map(company => {
                        const editedName = normalizeCompanyName(companyEditValues[company.id] ?? company.name);
                        const editedNoText = String(companyNoEditValues[company.id] ?? '').trim();
                        const editedNo = editedNoText ? parseInt(editedNoText, 10) : null;
                        const hasNoChanged = (company.display_no ?? null) !== editedNo;
                        const hasNameChanged = editedName && editedName !== normalizeCompanyName(company.name);
                        const hasCompanyChanged = hasNameChanged || hasNoChanged;
                        return (
                          <div key={company.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={companyNoEditValues[company.id] ?? ''}
                              onChange={e => setCompanyNoEditValues(prev => ({ ...prev, [company.id]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && hasCompanyChanged && companySaveStatus !== 'saving') {
                                  handleUpdateHealthCompany(company);
                                }
                              }}
                              className="w-[72px] shrink-0 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-center"
                            />
                            <input
                              type="text"
                              value={companyEditValues[company.id] ?? company.name}
                              onChange={e => setCompanyEditValues(prev => ({ ...prev, [company.id]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && hasCompanyChanged && companySaveStatus !== 'saving') {
                                  handleUpdateHealthCompany(company);
                                }
                              }}
                              className="flex-1 min-w-0 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {companyPickerTarget && (
                              <button
                                type="button"
                                onClick={() => handleSelectHealthCompany(company)}
                                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                              >
                                選択
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleUpdateHealthCompany(company)}
                              disabled={companySaveStatus === 'saving' || !hasCompanyChanged}
                              className={`px-3 py-2 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-45 ${hasCompanyChanged ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-500'}`}
                            >
                              {hasCompanyChanged ? '保存' : '変更なし'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 確認ダイアログ（noticeOnly時はOKのみの通知ダイアログ） */}
            {confirmDialog.show && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                  <p className="text-slate-700 mb-6 whitespace-pre-line">{confirmDialog.message}</p>
                  <div className="flex gap-3 justify-center">
                    {!confirmDialog.noticeOnly && (
                      <button
                        onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: null })}
                        className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50"
                      >
                        キャンセル
                      </button>
                    )}
                    <button
                      onClick={confirmDialog.onConfirm || (() => setConfirmDialog({ show: false, message: '', onConfirm: null }))}
                      className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showTodayReservationsModal && (
              <TodayReservationsModal
                date={todayReservationsDate}
                reservations={todayReservations}
                loading={todayReservationsLoading}
                error={todayReservationsError}
                getItemLabels={getReservationItemLabels}
                onClose={() => setShowTodayReservationsModal(false)}
                onRefresh={fetchTodayReservations}
                onSelect={reservation => {
                  setShowTodayReservationsModal(false);
                  fetchReservationDetailById(reservation.id);
                }}
              />
            )}

            {/* 団体一覧から開く単独予約詳細モーダル */}
            {(singleReservationLoading || singleReservationError || singleReservationDetail) && (
              <div
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={() => { setSingleReservationDetail(null); setSingleReservationError(''); setSingleReservationLoading(false); }}
              >
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[550px] max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="shrink-0 flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 bg-white">
                    <h2 className="font-black text-lg">
                      {singleReservationDetail?.date ? `${singleReservationDetail.date.replace(/-/g, '/')} の予約詳細` : '予約詳細'}
                    </h2>
                    <button
                      onClick={() => { setSingleReservationDetail(null); setSingleReservationError(''); setSingleReservationLoading(false); }}
                      className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {singleReservationLoading && (
                      <div className="text-center text-slate-400 py-8 text-sm font-bold">予約詳細を読み込み中...</div>
                    )}
                    {singleReservationError && (
                      <div className="text-center text-red-500 py-8 text-sm font-bold">{singleReservationError}</div>
                    )}
                    {!singleReservationLoading && !singleReservationError && singleReservationDetail && (
                      <ReservationDetailCard
                        reservation={singleReservationDetail}
                        checkedItems={getReservationItemLabels(singleReservationDetail)}
                        birthDateText={singleReservationDetail.birth_date ? formatDobDisplay(parseDobToISO(singleReservationDetail.birth_date)) : ''}
                        onEdit={r => {
                          setSingleReservationDetail(null);
                          setSingleReservationError('');
                          handleLoadReservation(r.id, true);
                        }}
                        onDelete={r => {
                          setSingleReservationDetail(null);
                          setSingleReservationError('');
                          handleDeleteReservation(r.id, r.patient_name);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 詳細モーダル */}
            {selectedCalendarDate && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCalendarDate(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[550px] max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="shrink-0 flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 bg-white">
                    <h2 className="font-black text-lg">{selectedCalendarDate.replace(/-/g, '/')} の予約</h2>
                    <button onClick={() => setSelectedCalendarDate(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {calendarDetailLoading && (
                      <div className="text-center text-slate-400 py-8 text-sm font-bold">予約詳細を読み込み中...</div>
                    )}
                    {calendarDetailError && (
                      <div className="text-center text-red-500 py-8 text-sm font-bold">{calendarDetailError}</div>
                    )}
                    {!calendarDetailLoading && !calendarDetailError && (calendarDetailData[selectedCalendarDate] || []).map((r, i) => {
                      const checkedItems = [
                        r.item_height_weight && '身長/体重', r.item_abdominal_girth && '腹囲', r.item_blood_pressure && `血圧${Number(r.bp_measure_count) === 2 ? '2回' : '1回'}`, r.item_vision && '視力', r.item_hearing && '聴力', r.item_urine && '尿検査',
                        r.item_x_ray && 'X-P', r.item_ecg && '心電図', r.item_blood && '採血', r.item_blood_kuritas_regular && KURITAS_BLOOD_LABELS.regular, r.item_blood_kuritas_specific && KURITAS_BLOOD_LABELS.specific, r.item_blood_hapilus_b && HAPILUS_BLOOD_LABELS.b, r.item_blood_hapilus_c && HAPILUS_BLOOD_LABELS.c, r.item_blood_hapilus_hire && HAPILUS_BLOOD_LABELS.hire, r.item_blood_hapilus_night && HAPILUS_BLOOD_LABELS.night, r.item_pulse && '脈拍', r.item_color_vision && '色神',
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
                              {r.patient_id && <span className="font-black text-emerald-600">ID: {r.patient_id}</span>}
                              {r.patient_gender && <span>{r.patient_gender}</span>}
                              {r.birth_date && <span>{formatDobDisplay(parseDobToISO(r.birth_date))}</span>}
                              {r.age != null && r.age !== '' && <span className="text-blue-600 font-bold">{r.age}歳</span>}
                            </div>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <div>{r.purpose}</div>
                            {r.company_name && <div className="mt-0.5 font-bold text-slate-600">{r.company_name}</div>}
                            <div className="font-bold text-blue-600">
                              {getCompanyBillingLabel(r.purpose)
                                ? (() => {
                                    const kFee = r.fee ?? calcKuritasFee(r.purpose, { xRay: r.item_xray, endoscopy: r.item_endoscopy, stool: r.item_stool, psa: r.item_psa });
                                    return `${getCompanyBillingLabel(r.purpose)}${kFee != null ? ` ¥${kFee.toLocaleString()}` : ''}`;
                                  })()
                                : `${r.fee != null ? `¥${r.fee.toLocaleString()}` : ''} ${r.payment_type || ''}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {checkedItems.map(item => (
                            <span key={item} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{item}</span>
                          ))}
                        </div>
                        {r.has_dedicated_form && <div className="mt-2 text-[10px] text-orange-600 font-bold">専用診断用紙あり</div>}
                        {r.deadline_type === '有' && r.deadline_date && <div className="mt-1 text-[10px] text-red-600">提出期限: {r.deadline_date}</div>}
                        {r.others && (
                          <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-2 py-1.5 text-[11px] font-bold text-amber-700 whitespace-pre-wrap">
                            備考: {r.others}
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleLoadReservation(r.id, true)}
                            className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-all"
                          >
                            修正・プレビュー
                          </button>
                          <button
                            onClick={() => handleDeleteReservation(r.id, r.patient_name)}
                            className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-red-600 transition-all"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ===== 健康診断書 ===== */}
            {rightTab === 'kenshin' && (
              <KenshinCertificate kenshinData={kenshinData} setHighlightedField={setHighlightedField} />
            )}

            {/* A4帳票再現 */}
            {rightTab === 'preview' && (
              <>
                <RecordSheetPreview formData={formData} shahoFee={shahoFee} />
                {printAttachmentSheet && <AttachmentSheet formData={formData} />}
              </>
            )}

            </div>
          </div>
        </div>

      </div>

      <style>{`
        .print-only { display: none; }
        @media print {
          .kenshin-scroll-wrapper { overflow: visible !important; max-height: none !important; height: auto !important; }
          .print-only { display: inline !important; }
          @page { size: A4 portrait; margin: 5mm 0 0 0; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body > div { padding: 0 !important; background: white !important; }
          body > div > div { min-height: 0 !important; height: auto !important; overflow: visible !important; padding: 0 !important; }
          body > div > div > div { min-height: 0 !important; height: auto !important; overflow: visible !important; }
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
          #attachment-sheet {
            width: 210mm !important;
            min-height: 0 !important;
            padding: 5mm 10mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: white !important;
            page-break-before: always !important;
            break-before: page !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #attachment-sheet h1 { font-size: 20px !important; margin-bottom: 3mm !important; padding-bottom: 3px !important; }
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
            height: 292mm !important;
            padding: 8mm 12mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bessi-page-break {
            page-break-before: always !important;
            break-before: page !important;
            border-top: none !important;
            margin-top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 8mm 12mm !important;
            box-shadow: none !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-company-list-active .company-list-print-hide {
            display: none !important;
          }
          .print-company-list-active .company-calendar-card {
            width: 210mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          .print-company-list-active .company-list-print-area {
            width: 210mm !important;
            box-sizing: border-box !important;
            padding: 6mm 8mm !important;
            color: #0f172a !important;
            background: white !important;
          }
          .print-company-list-active .company-list-print-header {
            display: block !important;
            margin-bottom: 5mm !important;
            padding-bottom: 3mm !important;
            border-bottom: 1px solid #cbd5e1 !important;
          }
          .print-company-list-active .company-list-summary {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 2mm !important;
            margin-bottom: 4mm !important;
          }
          .print-company-list-active .company-list-table {
            overflow: visible !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 0 !important;
          }
          .print-company-list-active .company-list-table-header {
            background: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-company-list-active .company-list-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
