import React, { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

export default function ReservationDateSettingsModal({
  initialDate, today, settings, capacityAvailable, saving, error, onClose, onSave,
}) {
  const [date, setDate] = useState(initialDate);
  const [mode, setMode] = useState('unlimited');
  const [maxReservations, setMaxReservations] = useState('');
  const setting = settings[date];

  useEffect(() => {
    setMode(!setting ? 'unlimited' : setting.maxReservations === null ? 'closed' : 'limited');
    setMaxReservations(setting?.maxReservations == null ? '' : String(setting.maxReservations));
  }, [date, setting?.maxReservations, !!setting]);

  const validLimit = /^[1-9]\d*$/.test(maxReservations)
    && Number(maxReservations) <= 2147483647;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-date-settings-title"
        onSubmit={e => {
          e.preventDefault();
          if (saving || error || capacityAvailable === null || !date || date < today || (mode === 'limited' && (!validLimit || !capacityAvailable))) return;
          onSave(date, mode, mode === 'limited' ? Number(maxReservations) : null);
        }}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-lg bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id="reservation-date-settings-title" className="text-base font-bold text-slate-800">健診予約の受付設定</h2>
          <button type="button" title="閉じる" aria-label="閉じる" disabled={saving} onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={18} /></button>
        </div>
        <label htmlFor="closed-reservation-date" className="mb-1 block text-xs font-bold text-slate-600">日付</label>
        <input id="closed-reservation-date" type="date" required min={today} value={date} disabled={saving} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800" />
        <fieldset className="mt-4 space-y-3" disabled={saving}>
          <legend className="mb-2 text-xs font-bold text-slate-600">受付方法</legend>
          {[
            ['unlimited', '制限なし'], ['limited', '人数上限'], ['closed', '受付停止'],
          ].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-slate-800">
              <input type="radio" name="reservation-date-mode" value={value} checked={mode === value} disabled={value === 'limited' && !capacityAvailable} onChange={() => setMode(value)} className="accent-teal-600" />
              {label}
            </label>
          ))}
          {mode === 'limited' && (
            <div>
              <label htmlFor="reservation-date-limit" className="mb-1 block text-xs font-bold text-slate-600">上限人数（全団体の合計）</label>
              <div className="flex items-center gap-2">
                <input id="reservation-date-limit" type="number" min="1" max="2147483647" step="1" required value={maxReservations} onChange={e => setMaxReservations(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800" />
                <span className="text-sm text-slate-700">人</span>
              </div>
              {setting && <p className="mt-2 text-xs text-slate-600">現在の予約：{setting.reservationCount}人</p>}
              {setting && validLimit && setting.reservationCount > Number(maxReservations) && (
                <p className="mt-2 text-xs font-bold text-rose-700">現在の予約人数を下回ります。既存予約は保持され、空きが出るまで新しい予約を受け付けません。</p>
              )}
            </div>
          )}
        </fieldset>
        {capacityAvailable === null && <p role="status" className="mt-4 text-xs text-slate-600">受付設定を読み込み中...</p>}
        {capacityAvailable === false && <p role="status" className="mt-4 text-xs text-amber-800">人数上限はSupabaseの追加SQL適用後に利用できます。</p>}
        {error && <p role="alert" className="mt-4 text-xs font-bold text-rose-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">キャンセル</button>
          <button type="submit" disabled={saving || !!error || capacityAvailable === null || (mode === 'limited' && (!validLimit || !capacityAvailable))} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-40"><Save size={15} />{saving ? '保存中...' : '保存'}</button>
        </div>
      </form>
    </div>
  );
}
