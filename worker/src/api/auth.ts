/**
 * CloudMail Pro 认证 API
 */
import { Hono } from 'hono'
import { body } from 'hono/body'
import { generateUserId, generateSessionId, hashPassword, verifyPassword, isValidEmail } from '../utils/helpers'
import { generateToken, generateRefreshToken, authRateLimiter } from '../middleware'
import { generateRandomToken } from '../utils/crypto'
import { users, sessions } from '../entity'
import { eq, and } from 'drizzle-orm'
import type { Env, LoginRequest, RegisterRequest, LoginResponse, UserInfo } from '../utils/types'

export const authRoutes = new Hono<{ Bindings: Env }>()

// ============ Turnstile 验证 ============
async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  if (!token) return false
  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    })
    const data = await resp.json() as { success: boolean }
    return data.success === true
  } catch {
    return false
  }
}

// ============ 注册 ============
authRoutes.post('/register', authRateLimiter, async (c) => {
  const body = await c.req.json<RegisterRequest>()
  const { email, username, password, confirmPassword, turnstileToken, inviteCode } = body

  // 参数验证
  if (!email || !username || !password) {
    return c.json({ code: 400, message: '请填写所有必填字段' }, 400)
  }

  if (!isValidEmail(email)) {
    return c.json({ code: 400, message: '邮箱格式不正确' }, 400)
  }

  if (password !== confirmPassword) {
    return c.json({ code: 400, message: '两次输入的密码不一致' }, 400)
  }

  if (password.length < 8) {
    return c.json({ code: 400, message: '密码长度至少8位' }, 400)
  }

  if (username.length < 3 || username.length > 20) {
    return c.json({ code: 400, message: '用户名长度需在3-20之间' }, 400)
  }

  // Turnstile 验证
  if (c.env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken || !(await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY))) {
      return c.json({ code: 400, message: '人机验证失败' }, 400)
    }
  }

  const db = c.env.DB

  // 检查邮箱是否已注册
  const existingEmail = await db.select().from(users).where(eq(users.email, email)).get()
  if (existingEmail) {
    return c.json({ code: 409, message: '该邮箱已被注册' }, 409)
  }

  // 检查用户名是否已存在
  const existingUsername = await db.select().from(users).where(eq(users.username, username)).get()
  if (existingUsername) {
    return c.json({ code: 409, message: '该用户名已被使用' }, 409)
  }

  // 创建用户
  const now = Math.floor(Date.now() / 1000)
  const userId = generateUserId()
  const hashedPwd = await hashPassword(password)

  // 判断是否为第一个用户（超级管理员）
  const allUsers = await db.select().from(users)
  const role = allUsers.length === 0 ? 'super_admin' : 'user'

  await db.insert(users).values({
    id: userId,
    email,
    username,
    password: hashedPwd,
    nickname: username,
    role,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  // 生成 Token
  const token = await generateToken({ userId, role }, c.env.JWT_SECRET)
  const refreshToken = await generateRefreshToken({ userId, role }, c.env.JWT_SECRET)

  const userInfo: UserInfo = {
    id: userId,
    email,
    username,
    nickname: username,
    avatar: null,
    role: role as 'user' | 'admin' | 'super_admin',
    language: 'zh-CN',
    theme: 'light',
    createdAt: now,
  }

  return c.json({
    code: 200,
    message: '注册成功',
    data: { token, refreshToken, user: userInfo },
  })
})

// ============ 登录 ============
authRoutes.post('/login', authRateLimiter, async (c) => {
  const body = await c.req.json<LoginRequest>()
  const { email, password, turnstileToken } = body

  if (!email || !password) {
    return c.json({ code: 400, message: '请填写邮箱和密码' }, 400)
  }

  // Turnstile 验证
  if (c.env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken || !(await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY))) {
      return c.json({ code: 400, message: '人机验证失败' }, 400)
    }
  }

  const db = c.env.DB

  // 查找用户
  const user = await db.select().from(users).where(eq(users.email, email)).get()
  if (!user) {
    return c.json({ code: 401, message: '邮箱或密码错误' }, 401)
  }

  // 验证密码
  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    return c.json({ code: 401, message: '邮箱或密码错误' }, 401)
  }

  // 检查状态
  if (user.status !== 'active') {
    return c.json({ code: 403, message: '账号已被禁用' }, 403)
  }

  // 更新登录信息
  const now = Math.floor(Date.now() / 1000)
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
  await db.update(users).set({
    lastLoginAt: now,
    lastLoginIp: clientIp,
    updatedAt: now,
  }).where(eq(users.id, user.id))

  // 生成 Token
  const token = await generateToken({ userId: user.id, role: user.role }, c.env.JWT_SECRET)
  const refreshToken = await generateRefreshToken({ userId: user.id, role: user.role }, c.env.JWT_SECRET)

  const userInfo: UserInfo = {
    id: user.id,
    email: user.email,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    role: user.role as 'user' | 'admin' | 'super_admin',
    language: user.language || 'zh-CN',
    theme: user.theme || 'light',
    createdAt: user.createdAt,
  }

  return c.json({
    code: 200,
    message: '登录成功',
    data: { token, refreshToken, user: userInfo },
  })
})

// ============ 刷新令牌 ============
authRoutes.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json<{ refreshToken: string }>()
  if (!refreshToken) {
    return c.json({ code: 400, message: '缺少 refresh token' }, 400)
  }

  try {
    const payload = await verifyToken(refreshToken, c.env.JWT_SECRET)
    if (payload.type !== 'refresh') {
      return c.json({ code: 401, message: '无效的令牌类型' }, 401)
    }

    const token = await generateToken({ userId: payload.userId, role: payload.role }, c.env.JWT_SECRET)
    const newRefresh = await generateRefreshToken({ userId: payload.userId, role: payload.role }, c.env.JWT_SECRET)

    return c.json({
      code: 200,
      message: '刷新成功',
      data: { token, refreshToken: newRefresh },
    })
  } catch {
    return c.json({ code: 401, message: '令牌已过期' }, 401)
  }
})

// ============ 获取当前用户信息 ============
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ code: 401, message: '未授权' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET)
    const db = c.env.DB
    const user = await db.select().from(users).where(eq(users.id, payload.userId)).get()

    if (!user || user.status !== 'active') {
      return c.json({ code: 404, message: '用户不存在或已禁用' }, 404)
    }

    const userInfo: UserInfo = {
      id: user.id,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role as 'user' | 'admin' | 'super_admin',
      language: user.language || 'zh-CN',
      theme: user.theme || 'light',
      createdAt: user.createdAt,
    }

    return c.json({ code: 200, message: 'ok', data: userInfo })
  } catch {
    return c.json({ code: 401, message: '令牌无效' }, 401)
  }
})

import { verifyToken } from '../middleware/auth'