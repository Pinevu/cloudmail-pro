/**
 * CloudMail Pro Worker 入口
 * 基于 Hono 框架的 Cloudflare Worker 邮件服务
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { compress } from 'hono/compress'
import { jwt } from 'hono/jwt'
import { authRoutes } from './api/auth'
import { mailRoutes } from './api/mail'
import { userRoutes } from './api/user'
import { adminRoutes } from './api/admin'
import { settingsRoutes } from './api/settings'
import { handleEmail } from './email/receiver'
import { errorHandler } from './middleware/error-handler'
import { rateLimiter } from './middleware/rate-limiter'
import { requestLogger } from './middleware/request-logger'
import type { Env } from './utils/types'

const app = new Hono<{ Bindings: Env }>()

// ============ 全局中间件 ============
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', compress())
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
  credentials: true,
}))
app.use('*', requestLogger())
app.use('*', rateLimiter({ windowMs: 60_000, max: 100 }))

// ============ 健康检查 ============
app.get('/', (c) => c.json({
  name: 'CloudMail Pro',
  version: '1.0.0',
  status: 'running',
  timestamp: new Date().toISOString(),
}))

app.get('/health', (c) => c.json({ status: 'ok', uptime: Date.now() }))

// ============ 公开路由 ============
app.route('/api/auth', authRoutes)

// ============ 需要认证的路由 ============
const api = new Hono<{ Bindings: Env }>()
api.use('*', jwt({ secret: 'JWT_SECRET' }))
api.route('/mail', mailRoutes)
api.route('/user', userRoutes)
app.route('/api', api)

// ============ 管理员路由 ============
const admin = new Hono<{ Bindings: Env }>()
admin.use('*', jwt({ secret: 'JWT_SECRET' }))
admin.route('/', adminRoutes)
app.route('/api/admin', admin)

// ============ 系统设置 ============
app.route('/api/settings', settingsRoutes)

// ============ 错误处理 ============
app.onError(errorHandler)

// ============ 404 ============
app.notFound((c) => c.json({ code: 404, message: 'Not Found' }, 404))

// ============ Email Worker Handler ============
export default {
  fetch: app.fetch,
  email: handleEmail,
}