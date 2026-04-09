/**
 * CloudMail Pro 认证中间件
 */
import type { Context, Next } from 'hono'
import { sign, verify } from 'hono/jwt'
import { generateSessionId } from '../utils/helpers'
import type { Env, UserInfo } from '../utils/types'

const JWT_EXPIRES = 7 * 24 * 60 * 60 // 7天
const REFRESH_EXPIRES = 30 * 24 * 60 * 60 // 30天

// ============ JWT 令牌生成 ============
export async function generateToken(payload: { userId: string; role: string }, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return await sign(
    {
      ...payload,
      iat: now,
      exp: now + JWT_EXPIRES,
      type: 'access',
    },
    secret
  )
}

export async function generateRefreshToken(payload: { userId: string; role: string }, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return await sign(
    {
      ...payload,
      iat: now,
      exp: now + REFRESH_EXPIRES,
      type: 'refresh',
    },
    secret
  )
}

// ============ JWT 令牌验证 ============
export async function verifyToken(token: string, secret: string): Promise<{ userId: string; role: string; type: string }> {
  try {
    const payload = await verify(token, secret)
    return payload as unknown as { userId: string; role: string; type: string }
  } catch {
    throw new Error('Invalid token')
  }
}

// ============ 认证中间件 ============
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ code: 401, message: '未授权，请登录' }, 401)
  }
  
  const token = authHeader.slice(7)
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET)
    if (payload.type !== 'access') {
      return c.json({ code: 401, message: '无效的令牌类型' }, 401)
    }
    
    // 将用户信息存入上下文
    c.set('userId', payload.userId)
    c.set('userRole', payload.role)
    c.set('tokenPayload', payload)
    
    await next()
  } catch {
    return c.json({ code: 401, message: '令牌已过期或无效' }, 401)
  }
}

// ============ 管理员权限中间件 ============
export async function adminMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const userRole = c.get('userRole') as string
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return c.json({ code: 403, message: '需要管理员权限' }, 403)
  }
  await next()
}

// ============ 超级管理员权限中间件 ============
export async function superAdminMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const userRole = c.get('userRole') as string
  if (userRole !== 'super_admin') {
    return c.json({ code: 403, message: '需要超级管理员权限' }, 403)
  }
  await next()
}

// ============ 可选认证中间件（不强制） ============
export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const payload = await verifyToken(token, c.env.JWT_SECRET)
      c.set('userId', payload.userId)
      c.set('userRole', payload.role)
    } catch {
      // 令牌无效，但不阻止请求
    }
  }
  await next()
}