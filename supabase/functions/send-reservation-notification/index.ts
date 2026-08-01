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
  const notificationEmail = Deno.env.get('RESERVATION_NOTIFICATION_EMAIL')
    || Deno.env.get('ORDER_NOTIFICATION_EMAIL');
  const from = Deno.env.get('RESERVATION_NOTIFICATION_FROM')
    || Deno.env.get('ORDER_NOTIFICATION_FROM')
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
          <table style="border-collapse: collapse; width: 100%; max-width: 640px">
            <tbody>
              <tr><th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:8px 12px;text-align:left">健診日</th><td style="border:1px solid #cbd5e1;padding:8px 12px">${escapeHtml(reservationDate)}</td></tr>
              <tr><th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:8px 12px;text-align:left">氏名</th><td style="border:1px solid #cbd5e1;padding:8px 12px">${escapeHtml(record.patient_name || '-')}</td></tr>
              <tr><th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:8px 12px;text-align:left">団体名</th><td style="border:1px solid #cbd5e1;padding:8px 12px">${escapeHtml(record.company_name || '団体名なし')}</td></tr>
              <tr><th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:8px 12px;text-align:left">健診目的</th><td style="border:1px solid #cbd5e1;padding:8px 12px">${escapeHtml(record.purpose || '-')}</td></tr>
              <tr><th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:8px 12px;text-align:left">担当者</th><td style="border:1px solid #cbd5e1;padding:8px 12px">${escapeHtml(record.staff_name || '-')}</td></tr>
            </tbody>
          </table>
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
