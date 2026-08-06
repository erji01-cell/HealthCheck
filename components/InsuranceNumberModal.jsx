import { CreditCard, Loader2, Printer, Save, X } from 'lucide-react';

const formatDate = (value) => String(value || '').replace(/-/g, '/');

const formatPurpose = (purpose) => {
  if (purpose === '特定健診(国保)') return '特定';
  if (purpose === '長寿健診') return '長寿';
  return purpose || '';
};

export default function InsuranceNumberModal({
  patients,
  values,
  saving,
  error,
  printAfterSave,
  onValueChange,
  onClose,
  onSave,
  onPrintWithoutSaving,
}) {
  const hasInput = Object.values(values).some(value => String(value || '').trim());

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 print-hide"
      onClick={() => !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insurance-number-modal-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <CreditCard size={19} />
            </span>
            <div className="min-w-0">
              <h2 id="insurance-number-modal-title" className="text-base font-black text-slate-800">保険証番号を入力</h2>
              <p className="text-xs font-bold text-amber-700">現在の一覧で未入力の受診者 {patients.length}名</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed text-left">
                <colgroup>
                  <col className="w-[110px]" />
                  <col className="w-[100px]" />
                  <col />
                  <col className="w-[90px]" />
                  <col className="w-[240px]" />
                </colgroup>
                <thead className="bg-slate-100 text-[11px] font-black text-slate-500">
                  <tr>
                    <th className="px-3 py-2">健診日</th>
                    <th className="px-3 py-2">患者ID</th>
                    <th className="px-3 py-2">氏名</th>
                    <th className="px-3 py-2">健診種別</th>
                    <th className="px-3 py-2">保険証番号</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map(patient => (
                    <tr key={patient.patientId} className="bg-white">
                      <td className="px-3 py-2 text-xs font-bold text-slate-600">{formatDate(patient.date)}</td>
                      <td className="px-3 py-2 text-xs font-black text-emerald-600">{patient.patientId}</td>
                      <td className="px-3 py-2 text-sm font-black text-slate-800">{patient.patientName}</td>
                      <td className="px-3 py-2 text-xs font-bold text-slate-600">{formatPurpose(patient.purpose)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={values[patient.patientId] || ''}
                          onChange={event => onValueChange(patient.patientId, event.target.value)}
                          disabled={saving}
                          maxLength={50}
                          autoComplete="off"
                          className="w-full rounded-md border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
                          aria-label={`${patient.patientName}の保険証番号`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            キャンセル
          </button>
          {printAfterSave && (
            <button
              type="button"
              onClick={onPrintWithoutSaving}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <Printer size={16} /> 空欄のまま印刷
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !hasInput}
            className="flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? '保存中...' : printAfterSave ? '保存して名簿を印刷' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
