<p align="center">
    <img src="doc/demo/logo.png" width="80px" alt="Cloud Mail" />
    <h1 align="center">Cloud Mail</h1>
    <p align="center"><strong>基于 Cloudflare Workers 的轻盈、优雅个人云端邮箱</strong></p>
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
        <a href="README-en.md">English</a> | 简体中文 | <a href="README-ja.md">日本語</a>
    </p>
</p>

## 项目简介

Cloud Mail 是一个可完整运行在 Cloudflare 边缘网络上的**个人云端邮箱系统**。无需传统服务器，只需绑定个人域名与 Cloudflare D1 / KV 等免费或按量资源，即可在同一工作台管理多个域名下的邮箱别名、实时收发邮件，并通过内置的自动化规则与推送通道处理消息。

当前版本针对**个人自用场景**进行了全面精简与重构：移除多用户管理、注册密钥与复杂 RBAC 体系，仅在首次初始化（系统尚无任何账号时）开放管理员账户注册，专注个人收发体验、UI 质感与边缘性能安全。

## 功能特性

- **个人单管理员模式**：仅首次搭建无用户时允许注册管理员账户，此后自动关闭公开注册，避免无关人员注册占用资源。
- **多域名与无人收件（Catch-All）**：支持在同一域名或多域名下创建管理多个邮箱前缀，切换主邮箱，并统一查看发往未注册前缀的 Catch-All 邮件。
- **WebSocket 实时收信**：通过 Cloudflare Durable Objects（`MailHub`）在 `/realtime` 推送新邮件通知，减少无效轮询。
- **双引擎发信**：支持 Cloudflare Email Sending 与 Resend API 发信，支持草稿箱、星标、全部邮件与条件检索。
- **附件存储与边缘缓存**：支持收发附件，可选 Cloudflare R2、兼容 S3 对象存储或 KV 存储，公共静态资源配合 Edge Cache 与 `ETag` / `304` 协商缓存降低回源消耗。
- **安全与隐私加固**：
  - 邮件正文 HTML 清洗与隔离沙箱渲染，防 XSS 与追踪像素。
  - 外链图片 HMAC 签名代理（`/proxy` + 边缘缓存），防止打开邮件暴露真实 IP。
  - 集成 Cloudflare Turnstile 人机验证与 GitHub / Google / Linux.do OAuth2 绑定登录。
- **AI 与多渠道通知**：支持 Cloudflare Workers AI 自动提取验证码，支持 Telegram Bot 预览推送、Webhook 推送、第三方邮箱规则转发、黑名单过滤与定时自动清理。
- **现代交互与个性化外观**：支持浅色 / 深色模式自适应、6 套极光动态背景、工作区透明度调节、自定义背景图，自动适配桌面端与移动端。
- **数据可视化**：内置 ECharts 收发统计分析页，支持按需开启 KV 统计缓存（`analysis_cache`）。

## 技术栈

- **边缘运行时**：[Cloudflare Workers](https://developers.cloudflare.com/workers/) & [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- **后端框架 / ORM**：[Hono](https://hono.dev/) + [Drizzle ORM](https://orm.drizzle.team/)
- **前端框架 / UI**：[Vue 3](https://vuejs.org/) + [Element Plus](https://element-plus.org/) + [Pinia](https://pinia.vuejs.org/) + [ECharts](https://echarts.apache.org/)
- **存储与数据**：[Cloudflare D1](https://developers.cloudflare.com/d1/)、[Cloudflare KV](https://developers.cloudflare.com/kv/)、[Cloudflare R2](https://developers.cloudflare.com/r2/) / S3
- **邮件与 AI**：[Cloudflare Email](https://developers.cloudflare.com/email-service/)、[Resend](https://resend.com/)、[Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)

---

## Cloudflare 搭建教程

### 准备工作

1. 拥有一个 Cloudflare 账号，并将至少一个域名托管到 Cloudflare DNS（名称服务器已切换为 Cloudflare）。
2. 进入域名控制台 → **电子邮件（Email）** → **电子邮件路由（Email Routing）**，按引导开启 Email Routing（Cloudflare 会自动添加所需 MX / TXT 解析记录）。

### 方式一：GitHub Actions 一键自动部署（推荐）

仓库内置了完整的自动化部署工作流（[.github/workflows/deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml)），会自动完成前端编译、KV / D1 资源创建或绑定、Worker 部署以及数据库表结构初始化。

1. **Fork 本仓库**到你自己的 GitHub 账号。
2. **获取 Cloudflare 凭证**：
   - 在 Cloudflare 控制台右侧栏复制 **Account ID（账户 ID）**。
   - 前往 **我的个人资料 → API 令牌 → 创建令牌**，使用 **编辑 Cloudflare Workers（Edit Cloudflare Workers）** 模板，确认账户权限包含 `Workers Scripts`、`KV Storage`、`D1`、`R2`（若使用 R2）、区域权限包含 `Workers Routes`，生成并保存 **API Token**。
3. **配置 GitHub Actions Secrets / Variables**：  
   打开你的 GitHub 仓库 → **Settings → Secrets and variables → Actions**，添加以下变量：

   **必填项**：
   | 变量名 | 说明 | 示例 |
   |---|---|---|
   | `CLOUDFLARE_API_TOKEN` | Cloudflare API 令牌 | `cfut_xxxx...` |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | `32位十六进制ID` |
   | `DOMAIN` | 允许使用的邮箱域名（必须为 JSON 数组） | `["example.com"]` 或 `["a.com","b.com"]` |
   | `ADMIN` | 管理员邮箱地址（需属于 `DOMAIN` 内域名） | `admin@example.com` |
   | `JWT_SECRET` | JWT 与初始化签名密钥（**禁止包含** `? % # / \`） | `my_random_secret_string_2026` |

   **可选项（建议按需设置）**：
   | 变量名 | 说明 | 默认值 / 示例 |
   |---|---|---|
   | `CUSTOM_DOMAIN` | 绑定自定义访问域名（未启用 `workers.dev` 时建议填写，以便自动初始化） | `mail.example.com` |
   | `PASSWORD` | 管理员初始密码；留空则首次打开网页在登录页注册管理员 | `StrongPass123!` |
   | `NAME` | Worker 服务名（同时用作自动创建的 D1/KV 名称） | `cloud-mail` |
   | `D1_DATABASE_ID` | 已有 D1 数据库 UUID；留空则自动查找或创建 | `xxxxxxxx-xxxx-...` |
   | `KV_NAMESPACE_ID` | 已有 KV 命名空间 ID；留空则自动查找或创建 | `32位KV命名空间ID` |
   | `R2_BUCKET_NAME` | R2 存储桶名；留空则回退使用 KV（或后台改用 S3） | `cloud-mail` |
   | `AI_MODEL` | Cloudflare Workers AI 验证码提取模型 | `@cf/meta/llama-3.1-8b-instruct-fast` |
   | `ANALYSIS_CACHE` | 是否将统计图表数据缓存至 KV（减少 D1 聚合扫描） | `false` |
   | `EMAIL` | 若已开通 Cloudflare Email Sending，设为 `true` 启用 `email` 发信绑定 | `true` |
   | `PROJECT_LINK` | 登录页右下角是否显示 GitHub 图标入口 | `true` |

4. **触发部署**：
   进入 GitHub 仓库的 **Actions** → 选择 **🚀 Deploy cloud-mail to Cloudflare Workers** → 点击 **Run workflow**（后续每次推送 `main` 分支也会自动触发）。工作流运行成功后即已完成部署与数据库初始化。

---

### 方式二：Wrangler CLI 本地 / 手动部署

1. **拉取代码并构建前端**：
   ```bash
   git clone https://github.com/hikling/cloud-mail.git
   cd cloud-mail
   corepack enable
   pnpm --prefix mail-vue install
   pnpm --prefix mail-vue run build
   pnpm --prefix mail-worker install
   ```

2. **创建 Cloudflare D1 / KV（及可选 R2）资源**：
   ```bash
   cd mail-worker
   npx wrangler login
   npx wrangler d1 create cloud-mail
   npx wrangler kv namespace create cloud-mail
   # 可选：若使用 R2 存储附件与背景图
   # npx wrangler r2 bucket create cloud-mail
   ```

3. **编辑 [mail-worker/wrangler.toml](mail-worker/wrangler.toml)**：
   - 取消注释并填入 `[[d1_databases]]`（`binding = "db"`、`database_name`、`database_id`）与 `[[kv_namespaces]]`（`binding = "kv"`、`id`）；
   - 如使用 R2 或 Cloudflare Email Sending，按注释取消对应 `[[r2_buckets]]`（`binding = "r2"`）或 `[[send_email]]`（`name = "email"`）；
   - 在 `[vars]` 下填写：
     ```toml
     domain = ["example.com"]
     admin = "admin@example.com"
     jwt_secret = "your-random-secret-without-special-url-chars"
     # 可选：配置后初始化将自动创建管理员；不填则在前端登录页首次注册
     # password = "your-initial-password"
     ```
   - 请保留默认的 `[[durable_objects.bindings]]`（`ws` / `MailHub`）、`[[migrations]]`、`[ai]`、`[assets]` 与 `[triggers]` 配置，不要改动绑定名称。

4. **部署 Worker 并初始化数据库**：
   ```bash
   npx wrangler deploy
   ```
   部署完成后，在浏览器访问以下地址执行初始化（返回 `success` 即成功）：
   ```text
   https://<你的Worker域名或自定义域名>/api/init/<你配置的jwt_secret>
   ```

---

### 部署后收发邮件与域名配置

1. **配置收信路由（必须）**：
   - 打开 Cloudflare 控制台 → 你的域名 → **电子邮件 → 电子邮件路由 → 路由规则**；
   - 编辑 **Catch-All 地址（全域收件）**：状态设为 **已启用**，操作选择 **发送到 Worker（Send to a Worker）** → 选择你部署的 `cloud-mail` Worker 并保存。
   - 这样发往你域名下任意邮箱别名或无人收件地址的邮件都会由 Worker 自动接收并入库推送。
2. **绑定自定义域名（建议）**：
   - 若手动部署未在配置中写死 `routes`，可在 **Workers & Pages → `cloud-mail` → 设置 → 域和路由** 添加自定义域名（例如 `mail.example.com`），避免部分地区无法直连 `*.workers.dev`。
3. **首次登录与管理员创建**：
   - 若部署时未填写 `PASSWORD`，打开登录页后点击底部的 **初始化管理员** 即可创建唯一管理员账号；管理员创建完成后，公开注册入口会自动永久关闭。
4. **发信与扩展配置**：
   - **对外发信**：可在 Worker 启用 Cloudflare Email Sending 绑定，或在系统设置中为域名配置 **Resend API Token**；
   - **其他功能**：AI 验证码提取、Telegram 推送、Webhook、第三方邮箱转发（需先在 Cloudflare Email Routing 验证目标地址）、Turnstile 人机验证与 OAuth2 登录均可在系统设置中直接配置。

---

## 目录结构

```
cloud-mail
├── mail-worker                    # Cloudflare Workers 后端
│   ├── src
│   │   ├── api                    # API 路由层
│   │   ├── const                  # 常量与枚举配置
│   │   ├── dao                    # 统计聚合数据访问层
│   │   ├── email                  # 入站邮件解析与处理
│   │   ├── entity                 # Drizzle 数据表实体
│   │   ├── error                  # 自定义业务异常
│   │   ├── hono                   # Hono 实例与全局错误处理
│   │   ├── i18n                   # 服务端国际化
│   │   ├── init                   # 数据库初始化与表结构迁移
│   │   ├── lib                    # 列表列裁剪与公共库封装
│   │   ├── model                  # 响应数据封装
│   │   ├── security               # 鉴权与接口拦截器
│   │   ├── service                # 业务逻辑层
│   │   ├── template               # 邮件正文 / 通知模板
│   │   ├── utils                  # 加密、JWT、Edge Cache 与 HTTP 头工具
│   │   ├── websocket              # Durable Object WebSocket 推送 (MailHub)
│   │   └── index.js               # Worker 入口（HTTP / Email / Cron）
│   ├── package.json               # 后端依赖与运行脚本
│   ├── wrangler.toml              # 本地/手动部署配置
│   └── wrangler-action.toml       # GitHub Actions 自动部署配置模板
│
├── mail-vue                       # Vue 3 前端应用
│   ├── public                     # 静态图标与编辑器资源
│   ├── src
│   │   ├── axios                  # Axios 请求配置与拦截器
│   │   ├── components             # 公共组件（极光背景、虚拟列表、邮件沙箱等）
│   │   ├── db                     # Dexie 本地缓存
│   │   ├── echarts                # ECharts 按需引入
│   │   ├── enums                  # 前端状态枚举
│   │   ├── i18n                   # 前端国际化（简体中文 / English）
│   │   ├── icons                  # 按需打包的 Iconify 离线图标集
│   │   ├── init                   # 启动初始化逻辑
│   │   ├── layout                 # 顶部栏、邮箱侧栏与写信弹窗布局
│   │   ├── perm                   # 动态路由注册与控制
│   │   ├── request                # API 请求封装
│   │   ├── router                 # 路由配置
│   │   ├── store                  # Pinia 状态管理
│   │   ├── utils                  # 会话、时间、文件与极光主题工具
│   │   ├── views                  # 页面视图（登录、收件箱、星标、详情、统计、设置）
│   │   ├── websocket              # WebSocket 客户端管理
│   │   ├── App.vue                # 根组件
│   │   ├── main.js                # 入口文件
│   │   └── style.css              # 全局样式系统
│   ├── package.json               # 前端依赖与构建脚本
│   ├── .env.release               # 生产构建配置（输出至 mail-worker/dist）
│   └── vite.config.js             # Vite & PWA 构建配置
```

## 许可证

本项目基于 [MIT](LICENSE) 许可证开源。
