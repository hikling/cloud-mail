<p align="center">
    <img src="doc/demo/logo.png" width="80px" alt="Cloud Mail" />
    <h1 align="center">Cloud Mail</h1>
    <p align="center"><strong>Lightweight, refined personal cloud webmail built on Cloudflare Workers</strong></p>
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
        English | <a href="README.md">简体中文</a> | <a href="README-ja.md">日本語</a>
    </p>
</p>

## Overview

Cloud Mail is a **personal serverless webmail system** running end-to-end on the Cloudflare edge network. Without maintaining traditional mail servers, you can bind your own domain(s) with Cloudflare Workers, D1, and KV to manage multiple personal mailbox aliases, send and receive email in real time, and automate forwarding or notifications.

This edition is streamlined specifically for **personal use**: multi-user administration, registration keys, and RBAC management have been removed. Account registration is enabled only once during initial setup (when no user exists yet), focusing on personal productivity, refined glass/aurora UI, and edge security.

## Features

- **Personal Single-Admin Mode**: Allows initial admin registration only on a fresh setup with zero users, then automatically locks public registration.
- **Multi-Domain & Catch-All Inbox**: Create multiple mailbox aliases across one or more domains, switch primary mailboxes, and inspect Catch-All messages sent to unregistered addresses.
- **Real-Time WebSocket Delivery**: Uses Cloudflare Durable Objects (`MailHub`) on `/realtime` to push incoming mail updates immediately.
- **Dual Outbound Engines**: Supports sending emails via Cloudflare Email Sending and Resend API, with drafts, starred mail, all-mail views, and search filters.
- **Attachments & Edge Caching**: Store attachments in Cloudflare R2, S3-compatible storage, or KV; serves public assets via Edge Cache with `ETag` / `304` validation to minimize origin reads.
- **Security & Privacy Hardening**:
  - HTML email sanitization, sandboxed rendering, and tracking pixel removal.
  - HMAC-signed external image proxy (`/proxy` + Edge Cache) to prevent leaking client IP addresses.
  - Optional GitHub / Google / Linux.do OAuth2 login binding.
- **AI & Multi-Channel Notifications**: Extracts verification codes automatically with Cloudflare Workers AI; supports Telegram Bot preview alerts, Webhook delivery, rule-based email forwarding, blocklists, and scheduled auto-cleanup.
- **Modern Adaptive UI**: Vue 3 + Element Plus workspace with Light/Dark themes, 6 Aurora dynamic backdrops, adjustable panel opacity, custom wallpapers, mobile responsiveness, and Chinese/English UI switching.
- **Analytics**: Built-in ECharts traffic overview with optional KV caching (`analysis_cache`).

## Tech Stack

- **Edge Runtime**: [Cloudflare Workers](https://developers.cloudflare.com/workers/) & [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- **Backend / ORM**: [Hono](https://hono.dev/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Frontend / UI**: [Vue 3](https://vuejs.org/) + [Element Plus](https://element-plus.org/) + [Pinia](https://pinia.vuejs.org/) + [ECharts](https://echarts.apache.org/)
- **Storage & Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/), [Cloudflare KV](https://developers.cloudflare.com/kv/), [Cloudflare R2](https://developers.cloudflare.com/r2/) / S3
- **Mail & AI**: [Cloudflare Email](https://developers.cloudflare.com/email-service/), [Resend](https://resend.com/), [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)

---

## Cloudflare Deployment Guide

### Prerequisites

1. A Cloudflare account with at least one domain managed by Cloudflare DNS.
2. Enable **Email Routing** under your domain (`Domain` → **Email** → **Email Routing**) so Cloudflare configures the MX/TXT records required for inbound delivery.

### Option 1: Cloudflare Dashboard Git Integration (Recommended, Zero Local Setup)

Connect your forked GitHub repository directly inside the Cloudflare Dashboard:

1. **Fork this repository** to your GitHub account.
2. Open Cloudflare Dashboard → **Workers & Pages** → **Create** → **Connect to Git**, select your `cloud-mail` fork, and configure:
   - **Project name**: `cloud-mail` (or any name)
   - **Build command**: **Leave empty** (`mail-worker/wrangler.toml` already runs the `../mail-vue` build command automatically)
   - **Deploy command**: `npx wrangler deploy`
   - **Advanced settings → Non-production branch deploy command**: `npx wrangler versions upload`
   - **Advanced settings → Root directory / Path**: **`/mail-worker`** (⚠️ **Required**, because `wrangler.toml` resides inside `mail-worker/`)
3. Click **Save and Deploy** to run the initial deployment.
4. **Add Bindings and Environment Variables in the Worker Dashboard**:
   - Create a **D1 Database** and a **KV Namespace** (plus an optional **R2 Bucket**).
   - Open your deployed Worker → **Settings → Bindings** and add:
     | Type | Variable Name (exact) | Notes |
     |---|---|---|
     | D1 Database | `db` | Required |
     | KV Namespace | `kv` | Required |
     | R2 Bucket | `r2` | Optional; falls back to KV (or S3 in System Settings) if omitted |
     | Send Email | `email` | Optional; enables Cloudflare Email Sending outbound delivery |
   - Open **Settings → Variables and Secrets** and add (`keep_vars = true` in `wrangler.toml` preserves Dashboard variables across future Git deploys):
     | Name | Description | Example |
     |---|---|---|
     | `domain` | Allowed mail domains (JSON array) | `["example.com"]` |
     | `admin` | Admin email address (under `domain`) | `admin@example.com` |
     | `jwt_secret` | Random secret for JWT & init (**avoid** `? % # / \`) | `my_random_secret_string_2026` |
     | `password` | Optional; auto-creates admin on init (omit to register via `/login`) | `StrongPass123!` |
     | `analysis_cache` | Optional; cache ECharts analytics in KV (`true` / `false`) | `false` |
5. **Attach Custom Domain & Initialize Database (Required)**:
   - Under **Settings → Domains & Routes**, add your custom domain (e.g. `mail.example.com`).
   - Open the initialization URL once in your browser (returns `success`):
     ```text
     https://<your-worker-or-custom-domain>/api/init/<your-jwt_secret>
     ```

---

### Option 2: GitHub Actions One-Click Deployment

The built-in workflow ([.github/workflows/deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml)) builds the frontend, provisions or binds KV/D1 resources, deploys the Worker + `MailHub` Durable Object, and initializes the database schema automatically.

1. **Fork this repository** to your GitHub account.
2. **Collect Cloudflare credentials**:
   - Copy your **Account ID** from the Cloudflare Dashboard sidebar.
   - Create an API token (**My Profile → API Tokens → Create Token** using the **Edit Cloudflare Workers** template) with edit access for Workers Scripts, KV Storage, D1, R2 (if used), and Workers Routes.
3. **Configure GitHub Actions Secrets / Variables** (`Settings → Secrets and variables → Actions`):

   **Required**:
   | Name | Description | Example |
   |---|---|---|
   | `CLOUDFLARE_API_TOKEN` | Cloudflare API token | `cfut_xxxx...` |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | `32-char hex string` |
   | `DOMAIN` | Allowed mail domains (must be a JSON array) | `["example.com"]` or `["a.com","b.com"]` |
   | `ADMIN` | Administrator email address (under `DOMAIN`) | `admin@example.com` |
   | `JWT_SECRET` | Random secret for JWT & init (**avoid** `? % # / \`) | `my_random_secret_string_2026` |

   **Optional**:
   | Name | Description | Default / Example |
   |---|---|---|
   | `CUSTOM_DOMAIN` | Custom domain for your webmail UI (recommended so Actions can run `/api/init/...`) | `mail.example.com` |
   | `PASSWORD` | Initial admin password; if omitted, register the sole admin once on `/login` | `StrongPass123!` |
   | `NAME` | Worker service name (also used for auto-created D1/KV) | `cloud-mail` |
   | `D1_DATABASE_ID` | Existing D1 UUID (auto-created if omitted) | `xxxxxxxx-xxxx-...` |
   | `KV_NAMESPACE_ID` | Existing KV Namespace ID (auto-created if omitted) | `32-char KV ID` |
   | `R2_BUCKET_NAME` | Existing R2 bucket name (falls back to KV/S3 if omitted) | `cloud-mail` |
   | `AI_MODEL` | Workers AI model for code extraction | `@cf/meta/llama-3.1-8b-instruct-fast` |
   | `ANALYSIS_CACHE` | Cache ECharts analytics in KV (`true` / `false`) | `false` |
   | `EMAIL` | Set `true` if Cloudflare Email Sending binding is enabled | `true` |
   | `PROJECT_LINK` | Show GitHub link icon on the login page | `true` |

4. **Run Deployment**:
   Open **Actions → 🚀 Deploy cloud-mail to Cloudflare Workers → Run workflow** (or push to `main`). The workflow deploys everything and invokes `/api/init/<JWT_SECRET>` automatically.

---

### Option 3: Manual Deployment via Wrangler CLI

1. **Clone & build frontend**:
   ```bash
   git clone https://github.com/hikling/cloud-mail.git
   cd cloud-mail
   corepack enable
   pnpm --prefix mail-vue install
   pnpm --prefix mail-vue run build
   pnpm --prefix mail-worker install
   ```

2. **Create Cloudflare D1 / KV (and optional R2)**:
   ```bash
   cd mail-worker
   npx wrangler login
   npx wrangler d1 create cloud-mail
   npx wrangler kv namespace create cloud-mail
   # Optional:
   # npx wrangler r2 bucket create cloud-mail
   ```

3. **Update [mail-worker/wrangler.toml](mail-worker/wrangler.toml)**:
   - Uncomment and populate `[[d1_databases]]` (`binding = "db"`) and `[[kv_namespaces]]` (`binding = "kv"`), plus optional `[[r2_buckets]]` (`binding = "r2"`) and `[[send_email]]` (`name = "email"`).
   - Set `[vars]`:
     ```toml
     domain = ["example.com"]
     admin = "admin@example.com"
     jwt_secret = "your-random-secret-without-special-url-chars"
     # Optional: omit to register admin via the UI on first visit
     # password = "your-initial-password"
     ```
   - Keep `[[durable_objects.bindings]]` (`ws` / `MailHub`), `[[migrations]]`, `[ai]`, `[assets]`, and `[triggers]` unchanged.

4. **Deploy & initialize**:
   ```bash
   npx wrangler deploy
   ```
   Then visit `https://<your-worker-or-custom-domain>/api/init/<your-jwt_secret>` in your browser (wait for `success`).

---

### Post-Deploy Setup (Inbound Mail & Custom Domain)

1. **Configure Inbound Email Routing (Required)**:
   - In Cloudflare Dashboard → your domain → **Email → Email Routing → Routing rules**;
   - Edit **Catch-all address**: enable it and set Action to **Send to a Worker** → choose your `cloud-mail` Worker.
2. **Attach a Custom Domain (Recommended)**:
   - Under **Workers & Pages → `cloud-mail` → Settings → Domains & Routes**, add your custom domain (e.g. `mail.example.com`).
3. **Initial Admin Sign-In**:
   - If `PASSWORD` was set before init, sign in at `/login` right away; otherwise switch to **Init Admin** on `/login` to create the sole admin account (public signup disables permanently once created).
4. **Outbound Mail & Integrations**:
   - Configure **Resend API tokens** (or use Cloudflare Email Sending if bound), **Workers AI** code extraction (with automatic rule fallback), **Telegram Bot**, **Webhook**, or **OAuth2** directly inside **System Settings**.

---

## Project Structure

```
cloud-mail
├── mail-worker                    # Cloudflare Workers backend
│   ├── src
│   │   ├── api                    # API routes
│   │   ├── const                  # Constants and entity enums
│   │   ├── dao                    # Analytics query layer
│   │   ├── email                  # Inbound email parsing and handling
│   │   ├── entity                 # Drizzle schema entities
│   │   ├── error                  # Custom business error types
│   │   ├── hono                   # Hono instance and global error handling
│   │   ├── i18n                   # Server-side i18n
│   │   ├── init                   # Database bootstrap and migrations
│   │   ├── model                  # Response wrappers
│   │   ├── security               # Auth middleware and route guards
│   │   ├── service                # Core business logic, proxy, and push services
│   │   ├── template               # HTML/text rendering and alert templates
│   │   ├── utils                  # Crypto, JWT, Edge Cache, and header utilities
│   │   ├── websocket              # Durable Object WebSocket hub (MailHub)
│   │   └── index.js               # Worker entry point (HTTP / Email / Cron)
│   ├── package.json               # Backend dependencies and scripts
│   ├── wrangler.toml              # Wrangler configuration
│   └── wrangler-action.toml       # GitHub Actions deployment config template
│
├── mail-vue                       # Vue 3 frontend app
│   ├── public                     # Static icons and TinyMCE assets
│   ├── src
│   │   ├── axios                  # Axios client and interceptors
│   │   ├── components             # Shared components (Aurora backdrop, virtual list, sandbox, etc.)
│   │   ├── db                     # Dexie IndexedDB local storage
│   │   ├── echarts                # On-demand ECharts setup
│   │   ├── enums                  # Frontend status enums
│   │   ├── i18n                   # Frontend translations (zh / en)
│   │   ├── icons                  # Pruned offline Iconify icon bundle
│   │   ├── init                   # App bootstrap logic
│   │   ├── layout                 # Top bar, mailbox rail, and compose modal
│   │   ├── perm                   # Dynamic route registration
│   │   ├── request                # API request helpers
│   │   ├── router                 # Vue Router configuration
│   │   ├── store                  # Pinia stores
│   │   ├── utils                  # Session, date, file, and Aurora theme helpers
│   │   ├── views                  # Pages (Login, Inbox, Starred, Content, Analytics, Settings)
│   │   ├── websocket              # WebSocket client manager
│   │   ├── App.vue                # Root component
│   │   ├── main.js                # Entry point
│   │   └── style.css              # Global design system and CSS tokens
│   ├── package.json               # Frontend dependencies and build scripts
│   ├── .env.release               # Production build env (outputs to mail-worker/dist)
│   └── vite.config.js             # Vite & PWA configuration
```

## License

Licensed under the [MIT](LICENSE) License.
