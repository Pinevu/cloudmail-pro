/**
 * CloudMail Pro 请求日志中间件
 */
import type { Context, Next } from 'hono'

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now()
  const method = c.req.method
  const path = new URL(c.req.url).pathname
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
  
  // 静默路径跳过日志
  if (path === '/health' || path === '/') {
    await next()
    return
  }
  
  console.log(`→ ${method} ${path} [${clientIp}]`)
  
  await next()
  
  const duration = Date.now() - start
  const status = c.res?.status || 200
  
  console.log(`← ${method} ${path} ${status} ${duration}ms`)
}