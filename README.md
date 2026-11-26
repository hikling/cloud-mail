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

## 快速部署说明

仓库内置 GitHub Actions 工作流（[deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml)），可在推送 `main` 分支或手动触发时自动构建前端并部署到 Cloudflare Workers。

- **必要变量 / Secrets**：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`D1_DATABASE_ID`、`KV_NAMESPACE_ID`、`DOMAIN`（JSON 数组，如 `["example.com"]`）、`ADMIN`、`JWT_SECRET`
- **常用可选变量**：`PASSWORD`、`CUSTOM_DOMAIN`、`R2_BUCKET_NAME`、`AI_MODEL`、`EMAIL`、`ANALYSIS_CACHE`、`PROJECT_LINK`
- **本地构建命令**：
  ```bash
  pnpm --prefix mail-vue install
  pnpm --prefix mail-vue run build
  ```

## 许可证

本项目基于 [MIT](LICENSE) 许可证开源。
