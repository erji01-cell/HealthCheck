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

const reservationSummaryFields = [
  { label: '健診日', getValue: (row) => formatDate(row?.date) },
  { label: '氏名', getValue: (row) => String(row?.patient_name || '-') },
  { label: '団体名', getValue: (row) => String(row?.company_name || '団体名なし') },
  { label: '健診目的', getValue: (row) => String(row?.purpose || '-') },
  { label: '担当者', getValue: (row) => String(row?.staff_name || '-') },
];

function buildReservationSummaryTable(eventType, record, oldRecord) {
  const tableStyle = 'border-collapse:collapse;width:100%;max-width:720px';
  const headerStyle = 'background:#f1f5f9;border:1px solid #cbd5e1;padding:8px 12px;text-align:left';
  const cellStyle = 'border:1px solid #cbd5e1;padding:8px 12px';

  if (eventType === 'UPDATE' && oldRecord) {
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
      <p style="margin:8px 0 0;color:#92400e;font-size:12px">変更された項目を薄い黄色で表示しています。</p>
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

  if (
    payload?.schema !== 'public'
    || payload?.table !== 'health_reserv'
    || !['INSERT', 'UPDATE'].includes(eventType)
    || !record?.id
  ) {
    return jsonResponse({ error: '予約Webhookのデータ形式が正しくありません。' }, 400);
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

  const eventLabel = eventType === 'INSERT' ? '新規予約' : '予約修正';
  const reservationDate = formatDate(record.date);
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
          ${reservationSummaryTable}
          <p style="margin-top:16px;color:#64748b;font-size:12px">検査内容や備考はメールに記載していません。詳細は健診システムで確認してください。</p>
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
