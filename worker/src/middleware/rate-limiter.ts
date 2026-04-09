/**
 * CloudMail Pro 限流中间件
 * 基于 Cloudflare KV 的 IP 限流
 */
import type { Context, Next } from 'hono'
import { error } from '../utils/helpers'

interface RateLimitOptions {
  windowMs: number  // 时间窗口（毫秒）
  max: number       // 窗口内最大请求数
  keyPrefix?: string // KV 键前缀
}

export function rateLimiter(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = 'rl:' } = options

  return async (c: Context, next: Next) => {
    const kv = c.env?.KV
    if (!kv) {
      await next()
      return
    }

    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    const key = `${keyPrefix}${clientIp}`
    
    const now = Date.now()
    const windowStart = now - windowMs

    // 获取当前窗口的请求记录
    const record = await kv.get(key, 'json') as { timestamps: number[] } | null
    const timestamps = record?.timestamps || []
    
    // 过滤掉窗口外的请求
    const validTimestamps = timestamps.filter((ts: number) => ts > windowStart)

    if (validTimestamps.length >= max) {
      // 设置速率限制头
      c.header('X-RateLimit-Limit', max.toString())
      c.header('X-RateLimit-Remaining', '0')
      c.header('X-RateLimit-Reset', String(Math.ceil(windowStart / 1000 + windowMs / 1000)))
      c.header('Retry-After', Math.ceil(windowMs / 1000).toString())
      
      return c.json(error(429, '请求过于频繁，请稍后再试'), 429)
    }

    // 添加当前请求时间戳
    validTimestamps.push(now)
    
    // 存储回 KV，设置 TTL 为窗口时间
    await kv.put(key, JSON.stringify({ timestamps: validTimestamps }), {
      expirationTtl: Math.ceil(windowMs / 1000) + 1,
    })

    // 设置速率限制头
    c.header('X-RateLimit-Limit', max.toString())
    c.header('X-RateLimit-Remaining', String(max - validTimestamps.length))

    await next()
  }
}

// ============ 预置限流器 ============
export const authRateLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'rl:auth:' })    // 登录/注册：15分钟10次
export const apiRateLimiter = rateLimiter({ windowMs: 60 * 1000, max: 100, keyPrefix: 'rl:api:' })            // 普通API：1分钟100次
export const mailSendRateLimiter = rateLimiter({ windowMs: 60 * 1000, max: 5, keyPrefix: 'rl:mail:send:' })   // 发送邮件：1分钟5次