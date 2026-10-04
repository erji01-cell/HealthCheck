import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, History, RefreshCw, Search } from 'lucide-react';

const OPERATION_META = {
  INSERT: { label: '新規登録', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  UPDATE: { label: '修正', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  DELETE: { label: '削除', className: 'border-rose-200 bg-rose-50 text-rose-700' },
};

const FIELD_LABELS = {
  date: '健診日',
  day_of_week: '曜日',
  patient_id: '患者ID',
  patient_name: '氏名',
  patient_name_kana: 'ヨミガナ',
  patient_gender: '性別',
  birth_date: '生年月日',
  age: '年齢',
  contact: '連絡先',
  address: '住所',
  company_id: '団体ID',
  company_name: '団体名',
  purpose: '健診目的',
  deadline_type: '提出期限区分',
  deadline_date: '提出期限',
  has_dedicated_form: '専用用紙',
  payment_type: '支払い',
  fee: '料金',
  others: '備考',
  bp_measure_count: '血圧測定回数',
  staff_id: '登録担当者ID',
  staff_name: '登録担当者',
  item_height_weight: '身長・体重',
  item_abdominal_girth: '腹囲',
  item_blood_pressure: '血圧',
  item_vision: '視力',
  item_color_vision: '色神',
  item_pulse: '脈拍',
  item_hearing: '聴力',
  item_urine: '尿検査',
  item_x_ray: 'レントゲン',
  item_ecg: '心電図',
  item_blood: '採血',
  item_hba1c: 'HbA1c',
  item_endoscopy: '胃内視鏡',
  item_echo: '腹部エコー',
  item_manganese: 'マンガン',
  item_cotinine: 'コチニン',
  item_stool: '便潜血',
  item_norovirus: 'ノロウイルス',
  item_bacteria3: '3菌種',
  item_bacteria5: '5菌種',
  item_paratyphoid: 'パラチフス・腸チフス',
  item_methanol: 'メタノール',
  item_hexane: 'ノルマルヘキサン',
  item_methyl_hippuric: 'メチル馬尿酸',
  item_psa: 'PSA',
  item_hbs_ag: 'HBs抗原',
  item_hbs_ab: 'HBs抗体',
  item_hcv_ab: 'HCV抗体',
  item_syphilis: '梅毒STS',
  item_mrsa: 'MRSA・黄色ブドウ球菌',
  updated_at: '更新日時',
};

const SUMMARY_FIELDS = ['date', 'patient_id', 'patient_name', 'company_name', 'purpose', 'staff_name', 'payment_type', 'fee', 'others'];
const HIDDEN_CHANGE_FIELDS = new Set(['id', 'created_at', 'updated_at', 'user_id']);

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const formatValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'あり' : 'なし';
  if (key === 'fee' && Number.isFinite(Number(value))) return `¥${Number(value).toLocaleString()}`;
  if (key.endsWith('_at')) return formatDateTime(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const getReservationData = (log) => log.new_data || log.old_data || {};

const getChangeRows = (log) => {
  const oldData = log.old_data || {};
  const newData = log.new_data || {};
  const fields = log.operation === 'UPDATE'
    ? (log.changed_fields || []).filter(field => !HIDDEN_CHANGE_FIELDS.has(field))
    : SUMMARY_FIELDS.filter(field => oldData[field] !== undefined || newData[field] !== undefined);

  return fields.map(field => ({
    field,
    label: FIELD_LABELS[field] || field,
    before: formatValue(field, oldData[field]),
    after: formatValue(field, newData[field]),
  }));
};

export default function ReservationAuditLogPanel({
  logs,
  loading,
  error,
  query,
  operation,
  onQueryChange,
  onOperationChange,
  onSearch,
  onRefresh,
}) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <form
        onSubmit={(event) => { event.preventDefault(); onSearch(); }}
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-8 py-4"
      >
        <div className="relative min-w-[260px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="患者名・患者ID・予約IDで検索"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />
        </div>
        <select
          value={operation}
          onChange={event => onOperationChange(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-purple-400"
        >
          <option value="">すべての操作</option>
          <option value="INSERT">新規登録</option>
          <option value="UPDATE">修正</option>
          <option value="DELETE">削除</option>
        </select>
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700">
          <Search size={15} /> 検索
        </button>
        <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> 更新
        </button>
      </form>

      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-2.5 text-xs font-bold text-slate-500">
        <span>最新300件まで表示</span>
        <span>{logs.length}件</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-8 py-5">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        {loading && <div className="py-16 text-center text-sm font-bold text-slate-400">監査ログを読み込み中...</div>}
        {!loading && !error && logs.length === 0 && (
          <div className="py-16 text-center">
            <History size={30} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-400">該当する監査ログはありません</p>
          </div>
        )}
        {!loading && logs.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="grid min-w-[900px] grid-cols-[160px_90px_minmax(250px,1fr)_160px_130px_34px] gap-3 bg-slate-100 px-4 py-2.5 text-[11px] font-black text-slate-500">
              <div>操作日時</div><div>操作</div><div>予約</div><div>操作担当者</div><div>変更項目</div><div />
            </div>
            <div className="divide-y divide-slate-100">
              {logs.map(log => {
                const data = getReservationData(log);
                const meta = OPERATION_META[log.operation] || { label: log.operation, className: 'border-slate-200 bg-slate-50 text-slate-600' };
                const rows = getChangeRows(log);
                const expanded = expandedId === log.id;
                return (
                  <div key={log.id} className="min-w-[900px]">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : log.id)}
                      className="grid w-full grid-cols-[160px_90px_minmax(250px,1fr)_160px_130px_34px] items-center gap-3 px-4 py-3 text-left hover:bg-purple-50/40"
                    >
                      <div className="font-mono text-xs font-bold text-slate-600">{formatDateTime(log.occurred_at)}</div>
                      <div><span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-black ${meta.className}`}>{meta.label}</span></div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-sm font-black text-slate-800">{data.patient_name || '氏名不明'}</span>
                          {data.patient_id && <span className="shrink-0 text-[11px] font-bold text-emerald-600">ID: {data.patient_id}</span>}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] font-bold text-slate-400">
                          {data.date || '健診日不明'}　{data.company_name || '団体名なし'}　予約ID: {log.reservation_id}
                        </div>
                      </div>
                      <div className="truncate text-xs font-bold text-slate-700">{log.actor_staff_name || '不明'}</div>
                      <div className="text-xs font-bold text-slate-500">{log.operation === 'UPDATE' ? `${rows.length}項目` : meta.label}</div>
                      <div className="text-slate-400">{expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</div>
                    </button>
                    {expanded && (
                      <div className="border-t border-purple-100 bg-purple-50/30 px-6 py-4">
                        <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                          <span>{log.operation === 'UPDATE' ? '変更内容' : `${meta.label}時の予約概要`}</span>
                          <span>操作元: {log.source === 'reservation_form' ? '予約画面' : '保守・直接操作'}</span>
                        </div>
                        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                          <div className="grid grid-cols-[180px_1fr_1fr] bg-slate-100 text-xs font-black text-slate-500">
                            <div className="border-r border-slate-200 px-3 py-2">項目</div>
                            <div className="border-r border-slate-200 px-3 py-2">変更前</div>
                            <div className="px-3 py-2">変更後</div>
                          </div>
                          {rows.map(row => (
                            <div key={row.field} className="grid grid-cols-[180px_1fr_1fr] border-t border-slate-100 text-xs">
                              <div className="border-r border-slate-100 px-3 py-2 font-bold text-slate-600">{row.label}</div>
                              <div className="whitespace-pre-wrap break-words border-r border-slate-100 px-3 py-2 text-slate-500">{row.before}</div>
                              <div className="whitespace-pre-wrap break-words px-3 py-2 font-bold text-slate-700">{row.after}</div>
                            </div>
                          ))}
                          {rows.length === 0 && (
                            <div className="border-t border-slate-100 px-3 py-4 text-center text-xs font-bold text-slate-400">
                              表示対象の変更項目はありません
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
