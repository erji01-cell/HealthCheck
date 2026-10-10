const WEBHOOK_SECRET_HEADER = 'x-health-reservation-secret';

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function secretsMatch(received, expected) {
  if (!received || !expected) return false;
  const [receivedHash, expectedHash] = await Promise.all([
    sha256(received),
    sha256(expected),
  ]);
  return receivedHash === expectedHash;
}

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : String(value || '-');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

const reservationSummaryFields = [
  { key: 'date', label: '健診日', getValue: (row) => formatDate(row?.date) },
  { key: 'patient_name', label: '氏名', getValue: (row) => String(row?.patient_name || '-') },
  { key: 'company_name', label: '団体名', getValue: (row) => String(row?.company_name || '団体名なし') },
  { key: 'purpose', label: '健診目的', getValue: (row) => String(row?.purpose || '-') },
];

const reservationChangeLabels = {
  day_of_week: '曜日', patient_id: '患者ID', patient_name_kana: 'ヨミガナ',
  patient_gender: '性別', birth_date: '生年月日', age: '年齢',
  contact: '連絡先', address: '住所', company_id: '団体の紐付け',
  payment_type: '支払い区分', fee: '料金', others: '備考',
  deadline_type: '提出期限の有無', deadline_date: '提出期限',
  has_dedicated_form: '専用診断用紙', bp_measure_count: '血圧測定回数',
  bp1_sys: '血圧1回目（収縮期）', bp1_dia: '血圧1回目（拡張期）',
  bp2_sys: '血圧2回目（収縮期）', bp2_dia: '血圧2回目（拡張期）',
  pulse: '脈拍', height: '身長', weight: '体重', bmi: 'BMI', waist: '腹囲',
  vision_r: '右裸眼視力', vision_l: '左裸眼視力',
  vision_r2: '右矯正視力', vision_l2: '左矯正視力',
  hearing_r: '右聴力', hearing_l: '左聴力',
  hearing_r2: '右聴力（4000Hz）', hearing_l2: '左聴力（4000Hz）',
  color_vision: '色神', staff_id: '予約担当者ID', staff_name: '予約担当者',
  item_height_weight: '身長・体重', item_abdominal_girth: '腹囲測定',
  item_blood_pressure: '血圧測定', item_vision: '視力検査',
  item_color_vision: '色神検査', item_pulse: '脈拍測定',
  item_hearing: '聴力検査', item_urine: '尿検査',
  item_x_ray: '胸部X-P', item_ecg: '心電図', item_blood: '採血',
  item_blood_kuritas_regular: 'クリタス定期採血',
  item_blood_kuritas_specific: 'クリタス特定採血',
  item_blood_hapilus_b: 'ハピラスB採血',
  item_blood_hapilus_c: 'ハピラスC採血',
  item_blood_hapilus_hire: 'ハピラス入職時採血',
  item_blood_hapilus_night: 'ハピラス深夜採血',
  item_blood_toshinkyo_basic: '東振協基本採血',
  item_blood_insurance_review: '保険診査採血',
  item_hba1c: 'HbA1c', item_endoscopy: '胃内視鏡',
  item_echo: '腹部エコー', item_manganese: 'マンガン',
  item_cotinine: 'コチニン', item_stool: '便潜血・検便',
  item_norovirus: 'ノロウイルス', item_bacteria3: '3菌種',
  item_bacteria5: '5菌種', item_paratyphoid: 'パラチフス・腸チフス',
  item_methanol: 'メタノール', item_hexane: 'ノルマルヘキサン',
  item_methyl_hippuric: 'メチル馬尿酸', item_psa: 'PSA',
  item_hbs_ag: 'HBs抗原', item_hbs_ab: 'HBs抗体',
  item_hcv_ab: 'HCV抗体', item_syphilis: '梅毒STS',
  item_mrsa: 'MRSA・黄色ブドウ球菌',
};
const privateChangeFields = new Set(['contact', 'address', 'others']);
const excludedChangeFields = new Set(['id', 'created_at', 'updated_at', 'user_id']);
const summaryChangeFields = new Set(reservationSummaryFields.map((field) => field.key));

function formatChangedValue(key, value) {
  if (privateChangeFields.has(key) || !Object.hasOwn(reservationChangeLabels, key)) return '内容非表示';
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'あり' : 'なし';
  if (key === 'fee' && Number.isFinite(Number(value))) return `¥${Number(value).toLocaleString('ja-JP')}`;
  if (key === 'birth_date' && /^\d{8}$/.test(String(value))) {
    return `${String(value).slice(0, 4)}/${String(value).slice(4, 6)}/${String(value).slice(6)}`;
  }
  if (key === 'deadline_date') return formatDate(value);
  return String(value);
}

function getChangedFields(record, oldRecord) {
  return [...new Set([...Object.keys(oldRecord), ...Object.keys(record)])].filter((key) => {
    if (excludedChangeFields.has(key)) return false;
    const before = oldRecord[key] === '' ? null : oldRecord[key] ?? null;
    const after = record[key] === '' ? null : record[key] ?? null;
    return JSON.stringify(before) !== JSON.stringify(after);
  });
}

function buildReservationSummaryTable(eventType, record, oldRecord) {
  const tableStyle = 'border-collapse:collapse;width:100%;max-width:720px';
  const headerStyle = 'background:#f1f5f9;border:1px solid #cbd5e1;padding:8px 12px;text-align:left';
  const cellStyle = 'border:1px solid #cbd5e1;padding:8px 12px';

  if (eventType === 'UPDATE' && oldRecord) {
    const changedFields = getChangedFields(record, oldRecord);
    const rows = reservationSummaryFields.map((field) => {
      const before = field.getValue(oldRecord);
      const after = field.getValue(record);
      const changedStyle = before !== after ? ';background:#fef3c7;font-weight:700' : '';
      return `
        <tr>
          <th style="${headerStyle}">${escapeHtml(field.label)}</th>
          <td style="${cellStyle}${changedStyle}">${escapeHtml(before)}</td>
          <td style="${cellStyle}${changedStyle}">${escapeHtml(after)}</td>
        </tr>
      `;
    }).join('');
    const extraRows = changedFields.filter((key) => !summaryChangeFields.has(key)).map((key) => `
      <tr>
        <th style="${headerStyle}">${escapeHtml(reservationChangeLabels[key] || `その他の予約項目 (${key})`)}</th>
        <td style="${cellStyle};background:#fef3c7;font-weight:700;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(formatChangedValue(key, oldRecord[key]))}</td>
        <td style="${cellStyle};background:#fef3c7;font-weight:700;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(formatChangedValue(key, record[key]))}</td>
      </tr>
    `).join('');

    return `
      <table style="${tableStyle}">
        <thead>
          <tr>
            <th style="${headerStyle}">項目</th>
            <th style="${headerStyle}">修正前</th>
            <th style="${headerStyle}">修正後</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${extraRows ? `
        <h3 style="margin:16px 0 8px;font-size:14px">その他の変更項目</h3>
        <table style="${tableStyle}">
          <thead><tr><th style="${headerStyle}">項目</th><th style="${headerStyle}">修正前</th><th style="${headerStyle}">修正後</th></tr></thead>
          <tbody>${extraRows}</tbody>
        </table>
      ` : ''}
      ${changedFields.length === 0
        ? '<p style="margin:12px 0 0;color:#64748b;font-size:13px">予約内容の変更はありません（再保存）。</p>'
        : '<p style="margin:8px 0 0;color:#92400e;font-size:12px">変更された項目を薄い黄色で表示しています。</p>'}
    `;
  }

  const rows = reservationSummaryFields.map((field) => `
    <tr>
      <th style="${headerStyle}">${escapeHtml(field.label)}</th>
      <td style="${cellStyle}">${escapeHtml(field.getValue(record))}</td>
    </tr>
  `).join('');

  return `<table style="${tableStyle}"><tbody>${rows}</tbody></table>`;
}

async function writeAuditLog(entry) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return false;

  const response = await fetch(`${supabaseUrl}/rest/v1/health_reservation_notification_log`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(entry),
  });
  return response.ok;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'POSTのみ利用できます。' }, 405);
  }

  const expectedSecret = Deno.env.get('RESERVATION_WEBHOOK_SECRET');
  const receivedSecret = request.headers.get(WEBHOOK_SECRET_HEADER);
  if (!(await secretsMatch(receivedSecret, expectedSecret))) {
    return jsonResponse({ error: 'Webhookを認証できません。' }, 401);
  }

  const payload = await request.json().catch(() => null);
  const eventType = String(payload?.type || '').toUpperCase();
  const record = payload?.record;
  const oldRecord = payload?.old_record;
  const actorStaffName = String(payload?.actor_staff_name || record?.staff_name || '-');
  const originalReservationStaffName = String(oldRecord?.staff_name || record?.staff_name || '-');

  if (
    payload?.schema !== 'public'
    || payload?.table !== 'health_reserv'
    || !['INSERT', 'UPDATE', 'DELETE'].includes(eventType)
    || !record?.id
  ) {
    return jsonResponse({ error: '予約Webhookのデータ形式が正しくありません。' }, 400);
  }

  if (
    eventType === 'DELETE'
    && (payload?.operation_source !== 'reservation_form' || !payload?.actor_staff_name)
  ) {
    return jsonResponse({ ok: true, skipped: 'maintenance_delete' });
  }

  // 予約画面からの保存は必ず updated_at を更新する。
  // 団体名の一括置換など、予約操作ではない保守更新では通知しない。
  if (eventType === 'UPDATE' && record.updated_at === oldRecord?.updated_at) {
    return jsonResponse({ ok: true, skipped: 'maintenance_update' });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const notificationEmail = Deno.env.get('HEALTH_RESERVATION_NOTIFICATION_EMAIL')
    || Deno.env.get('ORDER_NOTIFICATION_EMAIL');
  const from = Deno.env.get('HEALTH_RESERVATION_NOTIFICATION_FROM')
    || 'HealthCheck <onboarding@resend.dev>';

  if (!resendApiKey || !notificationEmail) {
    await writeAuditLog({
      reservation_id: String(record.id),
      event_type: eventType,
      reservation_updated_at: record.updated_at || null,
      status: 'failed',
      error_message: 'メール送信の秘密情報が未設定です。',
    });
    return jsonResponse({ error: 'メール送信の秘密情報が未設定です。' }, 500);
  }

  const eventLabel = eventType === 'INSERT'
    ? '新規予約'
    : eventType === 'UPDATE' ? '予約修正' : '予約削除';
  const reservationDate = formatDate(record.date);
  const operationDateTime = formatDateTime(
    payload?.occurred_at
      || (eventType === 'INSERT'
        ? (record.created_at || record.updated_at)
        : (record.updated_at || record.created_at)),
  );
  const operationDateTimeLabel = eventType === 'INSERT'
    ? '登録日時'
    : eventType === 'UPDATE' ? '修正登録日時' : '削除日時';
  const actorLabel = eventType === 'INSERT'
    ? '登録担当者'
    : eventType === 'UPDATE' ? '修正担当者' : '削除担当者';
  const reservationSummaryTable = buildReservationSummaryTable(eventType, record, oldRecord);
  const recipients = notificationEmail
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return jsonResponse({ error: '通知先メールアドレスが未設定です。' }, 500);
  }

  const idempotencySeed = JSON.stringify({
    eventType,
    id: record.id,
    updatedAt: record.updated_at || record.created_at || '',
    occurredAt: payload?.occurred_at || '',
    date: record.date || '',
    patientId: record.patient_id || '',
    companyId: record.company_id || '',
    purpose: record.purpose || '',
  });
  const idempotencyKey = `health-reservation-${await sha256(idempotencySeed)}`;

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: `【健診予約】${eventLabel} ${reservationDate}`,
      html: `
        <div style="font-family: sans-serif; color: #1e293b; line-height: 1.7">
          <h2 style="margin: 0 0 16px">${eventLabel}がありました</h2>
          <p style="margin:0 0 12px"><strong>${operationDateTimeLabel}:</strong> ${escapeHtml(operationDateTime)}</p>
          <p style="margin:0 0 12px"><strong>${actorLabel}:</strong> ${escapeHtml(actorStaffName)}</p>
          ${eventType !== 'INSERT'
            ? `<p style="margin:0 0 12px"><strong>新規登録時の予約担当者:</strong> ${escapeHtml(originalReservationStaffName)}</p>`
            : ''}
          ${reservationSummaryTable}
          <p style="margin-top:16px;color:#64748b;font-size:12px">${eventType === 'DELETE'
            ? '削除前の予約概要です。検査内容や備考はメールに記載していません。'
            : eventType === 'UPDATE'
              ? '住所・連絡先・備考の内容はメールに記載していません。詳細は健診システムで確認してください。'
              : '検査内容や備考はメールに記載していません。詳細は健診システムで確認してください。'}</p>
        </div>
      `,
    }),
  });

  const result = await emailResponse.json().catch(() => null);
  if (!emailResponse.ok) {
    const errorMessage = result?.message || 'メールサービスからエラーが返されました。';
    await writeAuditLog({
      reservation_id: String(record.id),
      event_type: eventType,
      reservation_updated_at: record.updated_at || null,
      status: 'failed',
      error_message: errorMessage,
    });
    return jsonResponse({ error: errorMessage }, 502);
  }

  const auditLogged = await writeAuditLog({
    reservation_id: String(record.id),
    event_type: eventType,
    reservation_updated_at: record.updated_at || null,
    status: 'sent',
    provider_message_id: result?.id || null,
    email_sent_at: new Date().toISOString(),
  });

  return jsonResponse({ ok: true, auditLogged });
});
