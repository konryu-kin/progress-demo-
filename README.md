# progress

趣味の活動・試行錯誤・継続を記録し、共有するSNSのMVPです。

## ローカル起動

```sh
npm install
npm run dev
```

`.env` にSupabaseのURLとPublishable Keyを設定すると、クラウドの共有データを利用します。未設定の場合はブラウザー内のローカルデータで動作します。

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Supabaseのセットアップ

1. Supabase Dashboard の SQL Editor で [`supabase/schema.sql`](./supabase/schema.sql) を実行します。
2. プロジェクトの Edge Functions をデプロイします。

   ```sh
   supabase login
   supabase link --project-ref <project-ref>
   supabase functions deploy shared-api
   ```

3. Edge Function の環境に `SUPABASE_SERVICE_ROLE_KEY` があることを確認します。Supabaseの予約済み環境変数として提供されない環境では、DashboardのFunction Secretsに登録してください。**このキーを `.env`、`VITE_` 変数、フロントエンドコードに設定しないでください。**
4. `.env` にURLとPublishable Keyを設定して起動します。

読み取りは公開されたSupabaseテーブルから行い、作成・編集・削除は `shared-api` Edge Function経由で行います。画像アップロードではFunctionが発行した短時間のSigned Upload URLを使います。DB/Storageへの一般公開書き込みポリシーはありません。

いいねはブラウザーごとに作られるランダムIDで重複を防ぎ、集計数は共有表示します。ログインや通知はありません。ブラウザーのサイトデータを消すと、そのブラウザーの「いいね済み」状態は復元できません。

## 公開デモの注意

ログインを設けず全訪問者で1つのGuestデータを共有するため、**訪問者は誰でも共有データを変更・削除できます**。Edge Functionでは入力検証、画像サイズ制限、IP単位のレート制限を行いますが、本人確認や完全な不正操作防止にはなりません。公開前にデータのバックアップと、投稿・画像の監視/削除手順を用意してください。

## コマンド

```sh
npm run build
npm run lint
```
