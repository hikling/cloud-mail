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
  - Optional Cloudflare Turnstile verification and GitHub / Google / Linux.do OAuth2 login binding.
- **AI & Multi-Channel Notifications**: Extracts verification codes automatically with Cloudflare Workers AI; supports Telegram Bot preview alerts, Webhook delivery, rule-based email forwarding, blocklists, and scheduled auto-cleanup.
- **Modern Adaptive UI**: Vue 3 + Element Plus workspace with Light/Dark themes, 6 Aurora dynamic backdrops, adjustable panel opacity, custom wallpapers, mobile responsiveness, and Chinese/English UI switching.
- **Analytics**: Built-in ECharts traffic overview with optional KV caching (`analysis_cache`).

## Tech Stack

- **Edge Runtime**: [Cloudflare Workers](https://developers.cloudflare.com/workers/) & [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- **Backend / ORM**: [Hono](https://hono.dev/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Frontend / UI**: [Vue 3](https://vuejs.org/) + [Element Plus](https://element-plus.org/) + [Pinia](https://pinia.vuejs.org/) + [ECharts](https://echarts.apache.org/)
- **Storage & Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/), [Cloudflare KV](https://developers.cloudflare.com/kv/), [Cloudflare R2](https://developers.cloudflare.com/r2/) / S3
- **Mail & AI**: [Cloudflare Email](https://developers.cloudflare.com/email-service/), [Resend](https://resend.com/), [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)

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

## Deployment Notes

This repository includes a GitHub Actions workflow ([deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml)) that builds `mail-vue` and deploys the Worker automatically on pushes to `main` or manual dispatch.

- **Required Variables / Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `D1_DATABASE_ID`, `KV_NAMESPACE_ID`, `DOMAIN` (JSON array, e.g. `["example.com"]`), `ADMIN`, `JWT_SECRET`
- **Optional Variables**: `PASSWORD`, `CUSTOM_DOMAIN`, `R2_BUCKET_NAME`, `AI_MODEL`, `EMAIL`, `ANALYSIS_CACHE`, `PROJECT_LINK`
- **Local Frontend Build**:
  ```bash
  pnpm --prefix mail-vue install
  pnpm --prefix mail-vue run build
  ```

## License

Licensed under the [MIT](LICENSE) License.
