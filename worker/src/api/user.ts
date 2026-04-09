/**
 * CloudMail Pro 用户 API
 */
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { success, error, generateUserId, now, hashPassword } from '../utils/helpers'
import { users } from '../entity'
import { eq } from 'drizzle-orm'
import type { Env } from '../utils/types'

export const userRoutes = new Hono<{ Bindings: Env }>()

userRoutes.use('*', authMiddleware)

// ============ 获取个人信息 ============
userRoutes.get('/profile', async (c) => {
  const userId = c.get('userId') as string
  const db = c.env.DB

  const user = await db.select({
    id: users.id,
    email: users.email,
    username: users.username,
    nickname: users.nickname,
    avatar: users.avatar,
    role: users.role,
    language: users.language,
    theme: users.theme,
    telegramEnabled: users.telegramEnabled,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, userId)).get()

  if (!user) {
    return c.json(error(404, '用户不存在'), 404)
  }

  return c.json(success(user))
})

// ============ 更新个人信息 ============
userRoutes.patch('/profile', async (c) => {
  const userId = c.get('userId') as string
  const body = await c.req.json<{
    nickname?: string
    avatar?: string
    language?: string
    theme?: string
  }>()
  const db = c.env.DB

  const updates: Record<string, unknown> = { updatedAt: now() }
  if (body.nickname !== undefined) updates['nickname'] = body.nickname
  if (body.avatar !== undefined) updates['avatar'] = body.avatar
  if (body.language !== undefined) updates['language'] = body.language
  if (body.theme !== undefined) updates['theme'] = body.theme

  await db.update(users).set(updates).where(eq(users.id, userId))

  return c.json(success(null, '更新成功'))
})

// ============ 修改密码 ============
userRoutes.post('/change-password', async (c) => {
  const userId = c.get('userId') as string
  const { oldPassword, newPassword } = await c.req.json<{
    oldPassword: string
    newPassword: string
  }>()
  const db = c.env.DB

  if (!oldPassword || !newPassword) {
    return c.json(error(400, '请填写旧密码和新密码'), 400)
  }
  if (newPassword.length < 8) {
    return c.json(error(400, '新密码长度至少8位'), 400)
  }

  const user = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!user) {
    return c.json(error(404, '用户不存在'), 404)
  }

  // 验证旧密码
  const { verifyPassword } = await import('../utils/helpers')
  const valid = await verifyPassword(oldPassword, user.password)
  if (!valid) {
    return c.json(error(401, '旧密码错误'), 401)
  }

  const hashedNewPassword = await hashPassword(newPassword)
  await db.update(users).set({
    password: hashedNewPassword,
    updatedAt: now(),
  }).where(eq(users.id, userId))

  return c.json(success(null, '密码修改成功'))
})

// ============ Telegram 绑定 ============
userRoutes.post('/telegram/bind', async (c) => {
  const userId = c.get('userId') as string
  const { chatId } = await c.req.json<{ chatId: string }>()
  const db = c.env.DB

  if (!chatId) {
    return c.json(error(400, '请提供 Telegram Chat ID'), 400)
  }

  await db.update(users).set({
    telegramChatId: chatId,
    telegramEnabled: 1,
    updatedAt: now(),
  }).where(eq(users.id, userId))

  return c.json(success(null, 'Telegram 绑定成功'))
})

userRoutes.post('/telegram/unbind', async (c) => {
  const userId = c.get('userId') as string
  const db = c.env.DB

  await db.update(users).set({
    telegramChatId: null,
    telegramEnabled: 0,
    updatedAt: now(),
  }).where(eq(users.id, userId))

  return c.json(success(null, '已取消 Telegram 绑定'))
})

// ============ 生成 API Token ============
userRoutes.post('/api-tokens', async (c) => {
  const userId = c.get('userId') as string
  const { name, permissions } = await c.req.json<{
    name: string
    permissions?: string[]
  }>()
  const db = c.env.DB

  if (!name) {
    return c.json(error(400, '请提供 Token 名称'), 400)
  }

  const { generateToken: generateApiToken } = await import('../utils/helpers')
  const tokenId = generateUserId() // reuse ID generator
  const token = `cmp_${generateApiToken()}`
  const { sha256 } = await import('../utils/crypto')
  const tokenHash = await sha256(token)

  await db.insert({
    table: 'api_tokens',
  }).values ? null : null // Will use Drizzle properly

  // Actually insert
  const { apiTokens } = await import('../entity')
  await db.insert(apiTokens).values({
    id: tokenId,
    userId,
    name,
    tokenHash,
    permissionsJson: JSON.stringify(permissions || ['mail:read', 'mail:send']),
    createdAt: now(),
  })

  // Only return full token once
  return c.json(success({
    id: tokenId,
    name,
    token, // 完整 Token 只在创建时返回
    permissions: permissions || ['mail:read', 'mail:send'],
    createdAt: now(),
  }, 'API Token 创建成功'))
})

userRoutes.get('/api-tokens', async (c) => {
  const userId = c.get('userId') as string
  const db = c.env.DB

  const { apiTokens } = await import('../entity')
  const tokens = await db.select({
    id: apiTokens.id,
    name: apiTokens.name,
    permissionsJson: apiTokens.permissionsJson,
    lastUsedAt: apiTokens.lastUsedAt,
    expiresAt: apiTokens.expiresAt,
    createdAt: apiTokens.createdAt,
  }).from(apiTokens).where(eq(apiTokens.userId, userId))

  return c.json(success(tokens.map(t => ({
    ...t,
    permissions: JSON.parse(t.permissionsJson || '[]'),
    lastUsedAt: t.lastUsedAt,
  }))))
})