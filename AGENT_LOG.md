# Agent Handover Log

## 共通記録ルール

- 変更作業ごとに日時、作業場所、使用ツール、変更内容・ファイル、検証結果、残タスクを記録する。既存の追記順を維持する。
- 端末名 `DESKTOP-P1TKLAH` は自宅、`DESKTOP-22CKAVI` は職場。未登録の端末は推測せず「未確認」と記録する。
- 作業後は関連する変更と本ログをコミットし、追跡先にpushする。無関係な差分は含めず、pushできなければ理由を記録する。
- 適用記録: 2026-09-24 22:22（自宅）Codex / GPT-6 が本ルールを `AGENT_LOG.md` に追加。差分チェック済み。残タスクなし。


複数のAIコーディングツール（Claude Code, Codex, Cursor など）でこのプロジェクトを触る際の引き継ぎメモ。セッション終了時に自動追記される運用（`~/.claude/hooks/agent-log-stop.sh`）。

## 運用ルール

- AIツールはファイルを変更したセッションの終了時に、指示がなくても今回の変更点・残タスク・使用ツール名を AGENT_LOG.md に追記する。関連する変更とこのログを同じコミットに含めてpushする。
- 新しいエントリは**先頭**に追加する（最新が一番上）。
- 1エントリの粒度は「1セッション分」でOK。細かいコミット単位に分ける必要はない。
- 見出しには日時と作業場所（職場/自宅、ホスト名から自動判定）を含める。
- フォーマットは下記テンプレートに従う。

### テンプレート

```
## YYYY-MM-DD HH:MM(職場/自宅) ツール名 / モデル名
- **作業内容**: 何をしたか（簡潔に）
- **変更ファイル**: 主な変更ファイル/ディレクトリ
- **次の課題 / 残タスク**: 未完了・持ち越しの項目（なければ「なし」）
```

---

## 2026-10-01 16:21(職場) Claude Code / Claude Opus 5.5
- **作業内容**: 診断書の別紙（追加検査項目）で、↑↓矢印付きの値がある行だけ項目の高さがずれる不具合を修正。矢印が大きい文字で行の高さを広げ、上揃えのため文字位置がずれていた。別紙の全12行をベースライン揃え（`items-baseline`）にし、矢印8か所に `leading-none` を付けた。1ページ目は変更なし。
- **変更ファイル**: components/KenshinCertificate.jsx、AGENT_LOG.md
- **検証結果**: `npm run build` 成功。実コンポーネントを検証用データで描画し実測。修正前は肝機能・酵素／電解質で4pxずれ・行高40px、修正後は全行ずれ0px・行高34pxで統一。実機での印刷は未確認。
- **次の課題 / 残タスク**: 実際に別紙を印刷して揃っていることを確認する。

## 2026-10-01 16:17(職場) Claude Code / Claude Sonnet 5.5
- **作業内容**: `git pull origin main` でリポジトリを最新化（すでに最新）。コード変更・調査作業はなし。
- **変更ファイル**: AGENT_LOG.md のみ
- **次の課題 / 残タスク**: なし

## 2026-09-29 17:27(職場) Codex / GPT-5
- **作業内容**: 予約カレンダーの絞り込み欄について、直前の配置から団体の選択枠をさらに5mm広げ、目的の選択枠を5mm狭めた。全体幅は維持している。
- **変更ファイル**: HealthCheck.jsx、AGENT_LOG.md
- **検証結果**: `npm run build`、`git diff --check`成功。
- **次の課題 / 残タスク**: なし

## 2026-09-29 17:02(職場) Codex / GPT-5
- **作業内容**: 予約カレンダーの絞り込み欄について、全体幅を維持したまま団体の選択枠を1cm広げ、目的の選択枠を1cm狭めた。
- **変更ファイル**: HealthCheck.jsx、AGENT_LOG.md
- **検証結果**: `npm run build`、`git diff --check`成功。
- **次の課題 / 残タスク**: なし

## 2026-09-29 12:03(職場) Claude Code / Claude Sonnet 5.5
- **作業内容**: ヘッダーのバージョン表示を ver.2026.09.09 → ver.2026.09.29 に更新（東振協追加のリリース分）。
- **変更ファイル**: HealthCheck.jsx、AGENT_LOG.md
- **検証結果**: `npm run build` 成功。
- **次の課題 / 残タスク**: なし

## 2026-09-29 12:00(職場) Claude Code / Claude Opus 5.5
- **作業内容**: 東振協の料金・請求と採血内訳を設定。料金は受診者ごとに異なるため自動計算せず空欄とし、支払い区分を「東振協（自動入金）」に固定（請求不要・自動入金のため）。東振協基本ｾｯﾄの内訳（GOT、GPT、γ-GTP、LDL-Cho、HDL-Cho、TG、血糖、HbA1c）を備考へ自動記載するようにした。前回入れた料金計算の採血判定への追加は不要になったため削除。
- **変更ファイル**: lib/healthCheckConfig.js、HealthCheck.jsx、AGENT_LOG.md
- **検証結果**: `npm run build` 成功。Nodeで料金（null）・請求ラベル・備考の自動記載と、手入力備考が消えないことを確認。画面での動作は未確認。
- **次の課題 / 残タスク**: 本番で東振協の予約を登録し、料金欄・支払い区分・備考・予約用紙の表示を確認する。

## 2026-09-29 11:53(職場) Claude Code / Claude Opus 5.5
- **作業内容**: 特定企業に健診目的「東振協」を追加。選択時は身長体重・腹囲・血圧・尿検査・採血「東振協基本ｾｯﾄ」をロック付きで設定し、血圧は1回に設定（固定はしない）。新フラグ `bloodToshinkyoBasic`（列 `item_blood_toshinkyo_basic`）を保存・読込・カレンダー詳細・予約用紙・医師所見記入用紙・料金計算の採血判定に反映。
- **変更ファイル**: HealthCheck.jsx、lib/healthCheckConfig.js、components/RecordSheetPreview.jsx、components/DoctorFindingsSheet.jsx、supabase_add_health_reserv_toshinkyo_blood.sql、AGENT_LOG.md
- **検証結果**: `npm run build` 成功（既存のチャンクサイズ警告のみ）。SQLはユーザーが実行済み。ログインが必要なため画面での動作は未確認。
- **次の課題 / 残タスク**: 本番で東振協の予約登録・保存・再読込・印刷を確認する。東振協の専用料金・請求区分（現在は通常料金表で採血あり ¥7,900）、東振協基本ｾｯﾄの検査項目内訳（備考への自動記載）は未設定。

## 2026-09-29 11:33(職場) Claude Code / Claude Sonnet 5
- **作業内容**: `git pull origin main` でリポジトリを最新化（複数回）。コード変更・調査作業はなし。
- **変更ファイル**: AGENT_LOG.md のみ
- **次の課題 / 残タスク**: なし

## 2026-09-27 20:26(自宅) Claude Code / Claude Opus 5.5
- **作業内容**: VaxCheck と団体マスタ（`health_companies`）を共用するのに合わせて、団体管理を2点変更。
  - 「団体管理」ボタン（予約・健診結果の2か所）を押すと、パスワード（0125）を求めるようにした。団体名欄の一覧から選ぶだけなら不要。
  - 団体の追加時、全角半角・半角カナ・かっこ・スペースの有無・「株式会社／(株)／㈱」などの表記揺れを同じとみなすゆるい比較（`getCompanyLooseKey`、VaxCheck と同じ規則）で既存団体と照合。有効な団体に似たものがあれば追加しない。削除済み（`is_active=false`）に似たものがあれば復活させるか確認する。保存する `name_key` の規則は変えていない。
  - 既存の不具合を修正: 削除済みの団体と同じ名前で追加すると、`ensureHealthCompany` が復活させずに返し「保存しました」と出ていた。削除済みは明示的に `is_active=true` に戻すようにした（VaxCheck から団体を削除できるようになったため表面化）。
- **変更ファイル**: HealthCheck.jsx、AGENT_LOG.md
- **検証結果**: `npm run build` 成功（既存のチャンクサイズ警告のみ）。ログインが必要なため画面での動作は未確認。
- **次の課題 / 残タスク**: 本番で、団体管理のパスワード・表記揺れの追加拒否・削除済み団体の復活を確認する。団体の削除は VaxCheck の団体管理から行う（健康診断システムには削除ボタンなし）。

## 2026-09-26 10:29(職場) Codex / GPT-5
- **作業内容**: 予約修正・削除メールに、今回の操作担当者とは別に「新規登録時の予約担当者」を表示するよう変更。修正時は変更前レコード、削除時は削除前レコードの予約担当者を使用する。
- **変更ファイル**: supabase/functions/send-reservation-notification/index.ts、supabase_reservation_notification_setup.md、AGENT_LOG.md
- **検証結果**: `npm run build`、`git diff --check`成功。`send-reservation-notification` Edge FunctionをSupabaseプロジェクトへ再デプロイした。
- **次の課題 / 残タスク**: 実際の予約修正・削除通知で「新規登録時の予約担当者」が正しく表示されることを確認する。

## 2026-09-25 19:01(自宅) Codex / GPT-6
- **作業内容**: 健診予約の画面削除をメール通知対象へ追加。削除前の予約概要、削除日時、選択した削除担当者名を通知し、自動削除・SQL直接削除・バックアップ復元は通知対象外とした。新規・修正通知も操作担当者を独立表示する形式へ統一。追加SQLはユーザーが実行し、更新版Edge FunctionをSupabaseプロジェクトへデプロイした。
- **変更ファイル**: supabase/functions/send-reservation-notification/index.ts、supabase_add_reservation_delete_notification.sql、supabase_reservation_notification_setup.md、CLAUDE.md、AGENT_LOG.md
- **検証結果**: Edge Function構文チェック、削除Webhookの模擬送信テスト、npm run build、git diff --check成功。模擬メールに予約削除の件名、削除担当者名、患者名、団体名が含まれることを確認。`send-reservation-notification` の本番デプロイ成功。
- **次の課題 / 残タスク**: テスト予約を画面から削除し、削除メールと通知ログを実環境で確認する。

## 2026-09-25 16:24(職場) Codex / GPT-6
- **作業内容**: ユーザーより予約監査ログSQL実行済みの報告を受領。SQL導入待ちのpush保留を解除し、監査ログ実装（17c0636）と本記録を公開対象とした。
- **変更ファイル**: AGENT_LOG.md
- **検証結果**: 作業ツリーに未コミット変更がないことを確認。実装のビルドは前回成功。SQL実行完了はユーザー報告に基づき、DB上の動作をこちらでは未検証。
- **次の課題 / 残タスク**: 公開後にテスト用予約で修正・削除担当者の選択、監査ログへの記録、権限制御を手順書に沿って確認する。

## 2026-09-25 15:54(職場) Codex / GPT-6
- **作業内容**: 予約の修正・削除時に操作担当者を必須選択する画面を追加。RLSを維持するRPCとDBトリガーで登録・更新・削除の変更前後、変更項目、日時、選択担当者、認証ユーザーを記録するSQLを作成。元の登録担当者を修正時に保持する。監査ログのアプリ直接アクセスは禁止。
- **変更ファイル**: HealthCheck.jsx、supabase_health_reservation_audit.sql、supabase_health_reservation_audit_setup.md、AGENT_LOG.md
- **検証結果**: npm run build・git diff --check成功。DB実行検証は未実施。SQL導入前の自動公開で修正・削除が失敗するため、pushはSQL実行後まで保留。
- **次の課題 / 残タスク**: アプリ公開前にSupabaseでSQLを実行し、手順書の登録・修正・削除・権限テストを行う。監査対象は予約のみ。履歴画面、診断結果監査、保持期間・監査ログバックアップ運用は未実装。

## 2026-09-24 18:14(自宅) Codex
- **作業内容**: 日本ニュートリション株式会社の予約データ消失について調査。現在の予約13件はSupabase Storageの確認可能な7世代（2026-09-14〜2026-09-24）のバックアップすべてで維持され、団体変更・削除の形跡はなかった。期間フィルターの「当月」選択時には9月30日以降の6件が非表示になるため、表示上の減少が主な可能性と判断。将来の原因特定策として、予約のINSERT・UPDATE・DELETEごとに操作種別、予約ID、操作日時、操作者、変更前後データ、操作元、削除理由を別テーブルへ保存するSupabase監査ログを提案した。
- **変更ファイル**: AGENT_LOG.md
- **次の課題 / 残タスク**: 監査ログは未実装。実装時はデータベーストリガー、監査ログを変更・削除できないRLS、バックアップ復元などの操作元記録、管理者向け履歴表示を検討する。

## 2026-09-24 16:54(自宅) Codex
- **作業内容**: 健診予約の新規登録メールに登録日時、修正登録メールに修正登録日時を日本時間（秒単位）で表示するようEdge Functionを変更。
- **変更ファイル**: supabase/functions/send-reservation-notification/index.ts、supabase_reservation_notification_setup.md、AGENT_LOG.md
- **次の課題 / 残タスク**: Edge Functionを再デプロイし、新規登録・修正登録メールの日時表示を実メールで確認する。

## [2026-09-18] Codex
- **作業内容**: BNPを腫瘍マーカーからその他採血項目へ移動し、CA125・CA15-3・AFPを腫瘍マーカーの入力、保存・再読込、診断書別紙表示に追加。新項目の高低判定は基準範囲未確認のため未設定。
- **変更ファイル**: HealthCheck.jsx、components/KenshinCertificate.jsx、lib/kenshinUtils.js、supabase_add_health_data_tumor_markers.sql、AGENT_LOG.md
- **次の課題 / 残タスク**: Supabase SQLはユーザーが実行済み。実データで保存・再読込と印刷プレビューを確認する。

## [2026-09-17] Codex
- **作業内容**: 健診予約の受付停止日をSupabaseで管理し、カレンダー表示・日付入力・保存時の制限を実装。停止日のみ鍵を表示するよう変更し、予約期間フィルタに前月・当月ボタンを追加（ba2f6fe、56a1b6c、44caa79）。
- **変更ファイル**: HealthCheck.jsx、lib/backup.js、supabase_health_reservation_closed_dates.sql
- **次の課題 / 残タスク**: Supabase SQLはユーザーが実行済み。実データでの受付停止・再開と予約保存の動作確認は未実施。

## [2026-09-11] Claude Code
- **作業内容**: 引き継ぎ用の AGENT_LOG.md を新規作成
- **変更ファイル**: AGENT_LOG.md
- **次の課題 / 残タスク**: なし
