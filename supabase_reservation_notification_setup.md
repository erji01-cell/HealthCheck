# 健診予約メール通知のSupabase設定

この通知はフロント画面から起動しません。`health_reserv` の `INSERT` / `UPDATE` を
Supabase Database Webhookが検知し、Edge FunctionからResendを使って送信します。
職員画面には送信中・送信済み・送信失敗を表示しません。

## 1. 監査ログテーブル

SupabaseのSQL Editorで `supabase_reservation_notification_log.sql` を実行します。
このテーブルはRLSを有効化し、`anon` と `authenticated` からのアクセスを禁止しています。

## 2. Edge Functionの秘密設定

Supabase Dashboardの Edge Functions > Secrets で以下を設定します。

- `RESEND_API_KEY`: 在庫管理システムで設定済みの値をそのまま利用可能
- `HEALTH_RESERVATION_NOTIFICATION_EMAIL`: 健診専用の通知先。複数の場合はカンマ区切り
- `HEALTH_RESERVATION_NOTIFICATION_FROM`: 健診専用の送信元（例: `HealthCheck <reservation@example.jp>`）
- `RESERVATION_WEBHOOK_SECRET`: 十分に長いランダム文字列

`HEALTH_RESERVATION_NOTIFICATION_EMAIL` が未設定の場合は、在庫管理で設定済みの
`ORDER_NOTIFICATION_EMAIL` を利用します。送信元は在庫管理用の設定を流用せず、
`HEALTH_RESERVATION_NOTIFICATION_FROM` がなければ `HealthCheck <onboarding@resend.dev>` を利用します。

本番送信には、Resendで送信元ドメインの認証が必要です。
秘密情報はリポジトリやフロントエンドの環境変数へ保存しないでください。

## 3. Edge Functionのデプロイ

Supabase CLIを対象プロジェクトへリンクした状態で実行します。

```powershell
supabase functions deploy send-reservation-notification --no-verify-jwt
```

このFunctionはSupabase AuthのJWTではなく、Database Webhook専用の
`x-health-reservation-secret` ヘッダーを検証します。

## 4. Database Webhookの作成

`supabase_reservation_notification_webhook.sql` の
`REPLACE_WITH_RESERVATION_WEBHOOK_SECRET` を、手順2で設定した
`RESERVATION_WEBHOOK_SECRET` と同じ値へ置き換え、Supabase SQL Editorで実行します。

このSQLは以下を設定します。

- 非同期HTTP通信用の `pg_net`
- Webhook秘密値のSupabase Vaultへの暗号化保存
- `health_reserv` の `INSERT` / `UPDATE` トリガー
- Edge Functionへの非同期POST

秘密文字列を置き換えずに実行した場合はエラーで停止します。

## 5. 動作確認

1. 健診システムからテスト予約を新規登録します。
2. 件名が「【健診予約】新規予約 健診日」のメールを確認します。
3. 同じ予約を修正して保存します。
4. 件名が「【健診予約】予約修正 健診日」のメールを確認します。
5. SQL Editorで監査ログを確認します。

```sql
select *
from public.health_reservation_notification_log
order by created_at desc
limit 50;
```

メール送信が失敗しても予約の保存には影響しません。Functionのログと監査ログだけに
失敗内容が残り、職員画面には表示されません。

予約画面からの保存では `updated_at` が更新されます。Functionはこの値が変わらない
保守更新を通知対象外にするため、団体名の一括変更などで通知が大量発生しません。
