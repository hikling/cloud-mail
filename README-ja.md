<p align="center">
    <img src="doc/demo/logo.png" width="80px" alt="Cloud Mail" />
    <h1 align="center">Cloud Mail</h1>
    <p align="center"><strong>Cloudflare Workers 上で動作する軽量・モダンな個人向けクラウドメール</strong></p>
    <p align="center">
        <a href="https://www.cloudflare.com/" target="_blank">
            <img src="https://img.shields.io/badge/Cloudflare-F38020?labelColor=F38020&amp;color=F38020&amp;logo=cloudflare&amp;logoColor=white" alt="Cloudflare" />
        </a>
        <a href="https://github.com/hikling/cloud-mail" target="_blank">
            <img src="https://img.shields.io/badge/GitHub-hikling%2Fcloud--mail-181717?logo=github&amp;logoColor=white" alt="GitHub" />
        </a>
        <a href="LICENSE" target="_blank">
            <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
        </a>
    </p>
    <p align="center">
        <a href="README-en.md">English</a> | <a href="README.md">简体中文</a> | 日本語
    </p>
</p>

## 概要

Cloud Mail は、Cloudflare エッジネットワーク上で完結する**個人利用向けのクラウドメールシステム**です。専用サーバーを用意することなく、独自ドメインと Cloudflare Workers / D1 / KV を組み合わせて複数ドメインのメールエイリアス管理、リアルタイム送受信、各種通知・転送ルールを運用できます。

本リポジトリは個人用途に合わせて構成を最適化しており、複数ユーザー管理・登録キー・RBAC 権限管理機能を取り除き、初回セットアップ時のみ管理者アカウントを作成できるシンプルな運用モデルを採用しています。

## 主な機能

- **個人・単一管理者モード**：初回起動時（ユーザーが存在しない状態）のみ管理者アカウントを登録でき、以降の公開登録は無効化されます。
- **複数ドメイン＆キャッチオール受信**：1 つまたは複数のドメインでメールエイリアスを作成・切替でき、未登録アドレス宛ての Catch-All メールも一覧表示できます。
- **WebSocket リアルタイム通知**：Durable Objects（`MailHub`）による `/realtime` 接続で新着メールを即時通知します。
- **デュアル送信エンジン**：Cloudflare Email Sending と Resend API の両方に対応し、下書き・スター・全メール検索を備えています。
- **添付ファイル＆エッジキャッシュ**：Cloudflare R2 / S3 互換ストレージ / KV に添付ファイルを保存し、公開静的アセットには Edge Cache と `ETag` / `304` 検証を適用します。
- **セキュリティ＆プライバシー保護**：HTML メールの XSS サニタイズ、サンドボックス表示、トラッキングピクセル除去、署名付き外部画像プロキシ（`/proxy`）、GitHub / Google / Linux.do OAuth2 ログインに対応しています。
- **AI 解析・通知連携**：Workers AI による認証コード自動抽出、Telegram Bot プレビュー通知、Webhook 送信、条件付きメール転送、ブロックリスト、定期自動削除を利用できます。
- **モダン UI とカスタマイズ**：Vue 3 + Element Plus ベースで、ライト/ダークモード、6 種類のオーロラ背景テーマ、パネル透明度調整、カスタム背景画像、レスポンシブ表示、日本語/英語/中国語 README に対応（アプリ UI は中国語・英語）。
- **統計ダッシュボード**：ECharts による送受信トレンド表示とオプションの KV キャッシュ（`analysis_cache`）を備えています。

## 技術スタック

- **ランタイム**: [Cloudflare Workers](https://developers.cloudflare.com/workers/) & [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- **バックエンド / ORM**: [Hono](https://hono.dev/) + [Drizzle ORM](https://orm.drizzle.team/)
- **フロントエンド / UI**: [Vue 3](https://vuejs.org/) + [Element Plus](https://element-plus.org/) + [Pinia](https://pinia.vuejs.org/) + [ECharts](https://echarts.apache.org/)
- **データ・ストレージ**: [Cloudflare D1](https://developers.cloudflare.com/d1/)、[Cloudflare KV](https://developers.cloudflare.com/kv/)、[Cloudflare R2](https://developers.cloudflare.com/r2/) / S3
- **メール・AI**: [Cloudflare Email](https://developers.cloudflare.com/email-service/)、[Resend](https://resend.com/)、[Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)

---

## Cloudflare デプロイ手順

### 事前準備

1. Cloudflare アカウントを用意し、メールで使用するドメインの DNS を Cloudflare で管理します。
2. ドメインの **メール（Email）→ Email Routing** を有効化し、Cloudflare 側で必要な MX / TXT レコードを設定します。

### 方法 1：Cloudflare ダッシュボードの Git 連携デプロイ（推奨）

Cloudflare ダッシュボードからフォークした GitHub リポジトリを直接接続して自動ビルド・デプロイできます：

1. 本リポジトリを自分の GitHub アカウントへ **Fork** します。
2. Cloudflare ダッシュボード → **Workers & Pages → 作成 → Git リポジトリを接続** を開き、以下を設定します：
   - **プロジェクト名**：`cloud-mail`
   - **ビルドコマンド**：**空欄のまま**（`mail-worker/wrangler.toml` 内の `[build]` が `../mail-vue` を自動ビルドします）
   - **デプロイコマンド**：`npx wrangler deploy`
   - **詳細設定 → 非本番ブランチのデプロイコマンド**：`npx wrangler versions upload`
   - **詳細設定 → パス（Root directory）**：**`/mail-worker`**（⚠️ **必須**：`wrangler.toml` は `mail-worker/` 配下にあります）
3. 初回デプロイ後、Worker の **設定 → バインディング** で `db`（D1）・`kv`（KV）・任意の `r2`（R2）・任意の `email`（Send Email）を追加し、**変数とシークレット** に `domain`（例: `["example.com"]`）・`admin`・`jwt_secret`（`? % # / \` は不可）・任意の `password` を設定します（`keep_vars = true` により再デプロイ時も上書きされません）。
4. ブラウザで `https://<ドメイン>/api/init/<jwt_secret>` に一度アクセスし、`success` が返れば初期化完了です。

---

### 方法 2：GitHub Actions 自動デプロイ

同梱のワークフロー（[.github/workflows/deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml)）により、ビルド・D1/KV 準備・Worker デプロイ・DB 初期化まで自動実行できます。

1. 本リポジトリを自分の GitHub アカウントへ **Fork** します。
2. Cloudflare ダッシュボードから **Account ID** を控え、**Edit Cloudflare Workers** テンプレートを使って **API Token**（Workers Scripts / KV / D1 / R2 / Workers Routes 編集権限付き）を作成します。
3. GitHub リポジトリの **Settings → Secrets and variables → Actions** に以下を設定します：

   **必須項目**：
   | 変数名 | 内容 | 例 |
   |---|---|---|
   | `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン | `cfut_xxxx...` |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID | `32文字のHex文字列` |
   | `DOMAIN` | 利用するドメイン（JSON 配列形式） | `["example.com"]` |
   | `ADMIN` | 管理者メールアドレス | `admin@example.com` |
   | `JWT_SECRET` | JWT/初期化用シークレット（`? % # / \` は使用不可） | `my_random_secret_string_2026` |

   **任意項目**：
   - `CUSTOM_DOMAIN`（Web UI 用の独自ドメイン。自動初期化にも利用）、`PASSWORD`（初期パスワード。未設定時はログイン画面で初回のみ登録可能）、`NAME`（既定 `cloud-mail`）、`D1_DATABASE_ID`、`KV_NAMESPACE_ID`（未設定時は自動作成）、`R2_BUCKET_NAME`、`AI_MODEL`、`ANALYSIS_CACHE`、`EMAIL`、`PROJECT_LINK`。

4. **Actions → 🚀 Deploy cloud-mail to Cloudflare Workers → Run workflow** を実行すると、デプロイと `/api/init/<JWT_SECRET>` の呼び出しが自動完了します。

### 方法 3：Wrangler CLI による手動デプロイ

```bash
git clone https://github.com/hikling/cloud-mail.git
cd cloud-mail
corepack enable
pnpm --prefix mail-vue install
pnpm --prefix mail-vue run build
pnpm --prefix mail-worker install

cd mail-worker
npx wrangler login
npx wrangler d1 create cloud-mail
npx wrangler kv namespace create cloud-mail
```

[mail-worker/wrangler.toml](mail-worker/wrangler.toml) に作成した `db`（D1）・`kv`（KV）および `[vars]`（`domain`、`admin`、`jwt_secret`、任意の `password`）を設定し、以下を実行したあとブラウザで `https://<ドメイン>/api/init/<jwt_secret>` にアクセスして `success` を確認してください：

```bash
npx wrangler deploy
```

### デプロイ後の必須設定

1. **Email Routing（受信設定）**：Cloudflare ダッシュボード → ドメイン → **Email → Email Routing → Routing rules** で **Catch-all address** を有効化し、アクションを **Send to a Worker** → `cloud-mail` に設定します。
2. **独自ドメイン設定**：**Workers & Pages → `cloud-mail` → Settings → Domains & Routes** からアクセス用ドメインを追加します。
3. **初回ログイン**：`PASSWORD` を指定した場合はそのままログイン、未指定の場合は `/login` の管理者登録タブから初回アカウントを作成してください（登録後は公開新規登録が自動で閉じられます）。

---

## ディレクトリ構成

```
cloud-mail
├── mail-worker                    # Cloudflare Workers バックエンド
│   ├── src
│   │   ├── api                    # API ルーティング
│   │   ├── const                  # 定数・Enum
│   │   ├── dao                    # 分析集計データアクセス
│   │   ├── email                  # 受信メール解析・処理
│   │   ├── entity                 # Drizzle スキーマ定義
│   │   ├── error                  # 例外定義
│   │   ├── hono                   # Hono アプリ設定・エラーハンドラ
│   │   ├── i18n                   # サーバー側多言語対応
│   │   ├── init                   # DB 初期化・マイグレーション
│   │   ├── model                  # レスポンスモデル
│   │   ├── security               # JWT 認証・アクセス制御
│   │   ├── service                # ビジネスロジック層
│   │   ├── template               # メール本文・通知テンプレート
│   │   ├── utils                  # 暗号化・JWT・Edge Cache・ヘッダーユーティリティ
│   │   ├── websocket              # Durable Object WebSocket ハブ (MailHub)
│   │   └── index.js               # エントリーポイント（HTTP / Email / Cron）
│   ├── package.json               # 依存関係とスクリプト
│   ├── wrangler.toml              # Wrangler デプロイ設定
│   └── wrangler-action.toml       # GitHub Actions 用テンプレート
│
├── mail-vue                       # Vue 3 フロントエンド
│   ├── public                     # アイコン・TinyMCE 静的ファイル
│   ├── src
│   │   ├── axios                  # Axios 設定・インターセプター
│   │   ├── components             # 共通コンポーネント
│   │   ├── db                     # Dexie ローカル DB キャッシュ
│   │   ├── echarts                # ECharts 読み込み設定
│   │   ├── enums                  # ステータス Enum
│   │   ├── i18n                   # フロントエンド翻訳（zh / en）
│   │   ├── icons                  # 最適化済みオフライン Iconify アイコン集
│   │   ├── init                   # 初期化処理
│   │   ├── layout                 # ヘッダー・アカウント一覧・作成モーダル
│   │   ├── perm                   # 動的ルーティング制御
│   │   ├── request                # API リクエスト関数
│   │   ├── router                 # Vue Router 設定
│   │   ├── store                  # Pinia ストア
│   │   ├── utils                  # セッション・日時・ファイル・オーロラテーマ処理
│   │   ├── views                  # 各画面コンポーネント
│   │   ├── websocket              # WebSocket クライアント管理
│   │   ├── App.vue                # ルートコンポーネント
│   │   ├── main.js                # エントリーポイント
│   │   └── style.css              # グローバルスタイルシステム
│   ├── package.json               # 依存関係とビルドスクリプト
│   ├── .env.release               # 本番ビルド環境変数
│   └── vite.config.js             # Vite & PWA 設定
```

## ライセンス

[MIT](LICENSE) ライセンスのもとで公開されています。
