# 予約の監査ログ

## 導入順序

1. Supabase SQL Editorで `supabase_health_reservation_audit.sql` を実行する。
2. 成功後に更新版アプリを公開する。SQL未実行では修正・削除はエラーとなり、従来処理へは戻さない。
3. テスト用予約を登録し、修正担当者を選択して腹部エコーを変更する。次に削除担当者を選択して削除し、下記SQLで3操作の記録を確認する。

```sql
select reservation_id, operation, occurred_at at time zone 'Asia/Tokyo' as operated_at_jst,
       actor_staff_name, actor_user_id, source, changed_fields,
       old_data -> 'item_echo' as previous_echo,
       new_data -> 'item_echo' as current_echo
from public.health_reservation_audit_logs
order by occurred_at desc, id desc
limit 100;
```

## 記録範囲と権限

- 対象は予約 `health_reserv` の登録・更新・削除。診断結果 `health_data` は対象外。
- 修正・削除時は毎回担当者を選択する。担当者一覧の有効性をDBでも検証する。
- 修正時は元の登録担当者、登録ユーザー、作成日時を保持する。
- 変更とログは同一トランザクション。ログ記録に失敗した変更は取り消される。
- 通常画面の修正・削除は `reservation_form`。直接操作、自動削除、バックアップ復元などは `direct_or_maintenance` とし、修正・削除担当者は不明として残す。
- 新規登録ログの職員名は登録内容から記録する。復元によるINSERTの場合、元の担当者であり、復元した職員を示さない。
- 共通ログインで選択された担当者名は自己申告。ログインユーザーIDも併記するが、本人確認には個別アカウント等が必要。
- アプリの既存RLSを使って予約操作を認可する。監査ログはアプリから閲覧・追加・更新・削除できず、当面はSQL Editorで管理者が確認する。
- 監査ログは通常のバックアップ完全置換・3年経過予約削除の対象外。自動削除は設定していない。保持期間と別途バックアップ運用は今後決定する。
- 導入前の履歴は復元できない。アプリ外の更新を禁止する仕組みや同時編集の競合防止は今回の対象外。

## 導入後の検証

- 担当者未選択では修正・削除確認ボタンを押せないこと。
- 無効な担当者IDでRPCを呼ぶと失敗し、予約が変化しないこと。
- 同日・同患者の上書き確認後も修正担当者が必要なこと。
- 編集前の登録担当者が残り、ログには選択した修正担当者が残ること。
- 匿名アクセス、ログ直接書込、既存RLSで権限のない予約操作が拒否されること。
- 新規・修正登録メールが従来どおり送信されること。
