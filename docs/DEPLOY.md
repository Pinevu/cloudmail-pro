# CloudMail Pro 部署指南

## 前置要求

1. 一个域名（已托管在 Cloudflare）
2. Cloudflare 账号
3. Resend 账号（免费额度：100封邮件/天）
4. Node.js 18+ 和 npm

## 一、Cloudflare 资源准备

### 1. 创建 D1 数据库

```bash
# 登录 Cloudflare
npx wrangler login

# 创建数据库
npx wrangler d1 create cloudmail-pro-db

# 记录返回的 database_id，填入 worker/wrangler.toml
```

### 2. 创建 KV 命名空间

```bash
npx wrangler kv:namespace create KV
# 记录返回的 id，填入 wrangler.toml
```

### 3. 创建 R2 存储桶

```bash
npx wrangler r2 bucket create cloudmail-attachments
```

### 4. 设置环境变量

在 Cloudflare Dashboard > Workers & Pages > Settings > Environment Variables 添加：

| 变量名 | 说明 |
|--------|------|
| JWT_SECRET | JWT 签名密钥（随机字符串，至少32位） |
| RESEND_API_KEY | Resend API Key（从 resend.com 获取） |
| RESEND_FROM_EMAIL | 发件邮箱（如 `noreply@yourdomain.com`） |
| RESEND_FROM_NAME | 发件人名称（如 `CloudMail Pro`） |
| DOMAIN | 你的域名 |
| TURNSTILE_SITE_KEY | Turnstile 公钥（可选） |
| TURNSTILE_SECRET_KEY | Turnstile 私钥（可选） |
| TG_BOT_TOKEN | Telegram Bot Token（可选） |
| TG_CHAT_ID | Telegram Chat ID（可选） |

## 二、后端部署

```bash
cd worker

# 安装依赖
npm install

# 生成数据库迁移
npx drizzle-kit generate

# 运行迁移
npx wrangler d1 migrations apply cloudmail-pro-db

# 创建 .env 文件（本地开发）
cp .env.example .env

# 本地开发
npm run dev

# 部署
npm run deploy
```

## 三、前端部署

### 方式一：Cloudflare Pages

```bash
cd frontend
npm install
npm run build

# 通过 Dashboard 创建 Pages 项目并连接 GitHub
# 或手动上传 dist 目录
```

### 方式二：其他平台（Vercel）

```bash
npm run build
# 上传 dist 目录到 Vercel
```

## 四、域名配置

### 1. 配置 Email Routing

在 Cloudflare Dashboard > Email Routing：

1. 启用 Email Routing
2. 添加 DNS 记录（自动）
3. 设置 Routing rules：Catch-all → Send to a Worker → 选择 `cloudmail-pro`

### 2. 配置 Resend 发件域名

1. 登录 Resend Dashboard
2. 添加域名
3. 添加 DNS 记录（MX、SPF、DKIM、DMARC）
4. 等待验证通过

## 五、初始化管理员

首次部署会自动创建超级管理员账号。

或者在 Cloudflare Dashboard > D1 > Console 执行：

```sql
INSERT INTO users (id, email, username, password, role, status, created_at, updated_at)
VALUES ('admin_001', 'admin@yourdomain.com', 'admin', '<hashed_password>', 'super_admin', 'active', unixepoch(), unixepoch());
```

## 六、故障排查

### 邮件发送失败

- 检查 Resend API Key 是否正确
- 确认发件域名已验证通过
- 查看 Resend Dashboard 的发送日志

### 邮件接收失败

- 确认 Email Routing 已启用
- 检查 Catch-all 规则是否指向 Worker
- 查看 Worker 日志

### 登录失败

- 检查 JWT_SECRET 是否设置
- 确认数据库连接正常
- 查看 Worker 日志

## 架构图

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│   用户浏览器   │◄──►│  Cloudflare CDN │◄──►│   Frontend   │
└──────────────┘    └──────────────────┘    │ (Vue3 SPA)  │
                    │                        └──────┬───────┘
                    │                               │
                    ▼                               ▼
            ┌──────────────────┐          ┌─────────────────┐
            │ Cloudflare Worker│◄─────────►│ Cloudflare D1  │
            │   (后端 API)      │          │   (SQLite DB)  │
            └────────┬─────────┘          └─────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Resend   │ │ Cloudflare│ │  R2      │
  │ (发送)   │ │ Email DK   │ │ (附件)   │
  └──────────┘ └──────────┘ └──────────┘
```

## 费用估算（月）

| 服务 | 免费额度 | 预估费用 |
|------|----------|----------|
| Cloudflare Workers | 100k 请求/天 | 免费 |
| Cloudflare D1 | 5GB 存储，500k 行读/天 | 免费 |
| Cloudflare R2 | 10GB 存储 | 免费 |
| Resend | 100 封邮件/天 | 免费 |
| **总计** | - | **$0/月** |

## 技术支持

- GitHub Issues: [提交问题](https://github.com/your-repo/issues)
- Telegram: [@cloudmail_pro](https://t.me/cloudmail_pro)