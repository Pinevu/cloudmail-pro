# ☁️ CloudMail Pro

<div align="center">

![CloudMail Pro](https://img.shields.io/badge/CloudMail-Pro-blue?style=for-the-badge&logo=cloudflare&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

**基于 Cloudflare 的全功能邮件服务平台**

[ English ](./README_EN.md) | 简体中文

</div>

---

## ✨ 特性

- 💰 **零服务器成本** — 完全部署在 Cloudflare Workers / Pages 上
- 📧 **邮件收发** — 支持 Resend 发送邮件 + Cloudflare Email Routing 接收邮件
- 📎 **附件支持** — 基于 Cloudflare R2 的附件存储与下载
- 👥 **多用户系统** — 注册、登录、角色权限管理 (RBAC)
- 🔔 **邮件推送** — 收到邮件后自动转发到 Telegram Bot
- 📊 **数据可视化** — 管理员仪表盘，邮件/用户增长统计
- 🎨 **个性化主题** — 支持自定义网站标题、Logo、登录背景
- 🤖 **Turnstile 人机验证** — 防止暴力注册
- 📡 **开放 API** — 批量创建用户、多条件查询邮件
- 📱 **响应式设计** — 自适应 PC 与移动端
- 🌍 **国际化** — 支持中文 / 英文
- 🌙 **暗黑模式** — 护眼夜间主题

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 平台 | Cloudflare Workers + Pages |
| 后端框架 | Hono |
| 数据库 | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| 缓存 | Cloudflare KV |
| 文件存储 | Cloudflare R2 |
| 邮件发送 | Resend |
| 邮件接收 | Cloudflare Email Routing |
| 人机验证 | Cloudflare Turnstile |
| 前端框架 | Vue 3 + Vite |
| UI 框架 | Naive UI |
| CSS | TailwindCSS |
| 图表 | ECharts |
| 状态管理 | Pinia |

## 📁 项目结构

```
cloudmail-pro/
├── worker/                  # 后端 Worker 项目
│   ├── src/
│   │   ├── api/             # API 路由层
│   │   ├── dao/             # 数据访问层
│   │   ├── email/           # 邮件处理（发送/接收/转发）
│   │   ├── entity/          # 数据库实体定义
│   │   ├── middleware/       # 中间件（认证/限流/日志）
│   │   ├── model/           # 请求/响应模型
│   │   ├── service/         # 业务逻辑层
│   │   ├── utils/           # 工具类
│   │   └── index.ts         # 入口
│   ├── drizzle/             # 数据库迁移文件
│   ├── wrangler.toml        # CF Workers 配置
│   └── package.json
├── frontend/                # 前端 Vue 项目
│   ├── src/
│   │   ├── api/             # API 请求
│   │   ├── components/      # 公共组件
│   │   ├── composables/     # 组合式函数
│   │   ├── i18n/            # 国际化
│   │   ├── layouts/         # 布局组件
│   │   ├── pages/           # 页面组件
│   │   ├── router/          # 路由配置
│   │   ├── stores/          # Pinia 状态
│   │   └── utils/           # 工具类
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── docs/                    # 文档
│   ├── DEPLOY.md            # 部署指南
│   └── API.md               # API 文档
└── README.md
```

## 🚀 快速开始

详见 [部署文档](./docs/DEPLOY.md)

## 📜 许可证

MIT License