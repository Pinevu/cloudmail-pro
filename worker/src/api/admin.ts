/**
 * CloudMail Pro 管理员 API
 */
import { Hono } from 'hono'
import { adminMiddleware } from '../middleware/auth'
import { success, paginate, now, error } from '../utils/helpers'
import { users, mails, mailAddresses, mailLogs } from '../entity'
import { eq, and, like, desc, count, sql as sqlOp } from 'drizzle-orm'
import type { Env, AdminUserListParams, AdminMailListParams, AdminStats } from '../utils/types'

export const adminRoutes = new Hono<{ Bindings: Env }>()

// 所有管理员路由需要管理员权限
adminRoutes.use('*', adminMiddleware)

// ============ 仪表盘统计 ============
adminRoutes.get('/stats', async (c) => {
  const db = c.env.DB
  const ts = now()
  const todayStart = ts - (ts % 86400) // 今天 0 点

  const [
    totalUsersResult,
    activeUsersResult,
    totalMailsResult,
    todayMailsResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(eq(users.status, 'active')),
    db.select({ count: count() }).from(mails),
    db.select({ count: count() }).from(mails).where(sqlOp`created_at >= ${todayStart}`),
  ])

  // 最近30天邮件趋势
  const thirtyDaysAgo = ts - 30 * 86400
  const dailyTrend = await db.select({
    date: sqlOp`date(created_at, 'unixepoch', '+8 hours')`,
    inbound: count(),
    outbound: count(),
  }).from(mails)
    .where(sqlOp`created_at >= ${thirtyDaysAgo}`)
    .groupBy(sqlOp`date(created_at, 'unixepoch', '+8 hours')`)
    .orderBy(sqlOp`date(created_at, 'unixepoch', '+8 hours') DESC`)

  // 最近30天用户趋势
  const userTrend = await db.select({
    date: sqlOp`date(created_at, 'unixepoch', '+8 hours')`,
    count: count(),
  }).from(users)
    .where(sqlOp`created_at >= ${thirtyDaysAgo}`)
    .groupBy(sqlOp`date(created_at, 'unixepoch', '+8 hours')`)
    .orderBy(sqlOp`date(created_at, 'unixepoch', '+8 hours') DESC`)

  const stats: AdminStats = {
    totalUsers: totalUsersResult[0]?.count || 0,
    activeUsers: activeUsersResult[0]?.count || 0,
    totalMails: totalMailsResult[0]?.count || 0,
    todayMails: todayMailsResult[0]?.count || 0,
    totalAttachments: 0,
    storageUsedBytes: 0,
    dailyMailTrend: dailyTrend.map(t => ({
      date: t.date as string,
      inbound: (t as any).inbound || 0,
      outbound: (t as any).outbound || 0,
    })),
    dailyUserTrend: userTrend.map(u => ({
      date: u.date as string,
      count: u.count,
    })),
  }

  return c.json(success(stats))
})

// ============ 用户管理 ============
adminRoutes.get('/users', async (c) => {
  const db = c.env.DB
  const page = Number(c.req.query('page') || 1)
  const pageSize = Number(c.req.query('pageSize') || 20)
  const search = c.req.query('search')
  const role = c.req.query('role')
  const status = c.req.query('status')

  const conditions = []
  if (search) {
    conditions.push(
      sqlOp`(${users.email} LIKE ${'%' + search + '%'} OR ${users.username} LIKE ${'%' + search + '%'} OR ${users.nickname} LIKE ${'%' + search + '%'})`
    )
  }
  if (role) conditions.push(eq(users.role, role))
  if (status) conditions.push(eq(users.status, status))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [list, totalResult] = await Promise.all([
    db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      nickname: users.nickname,
      role: users.role,
      status: users.status,
      quotaEmail: users.quotaEmail,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    }).from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: count() }).from(users).where(where),
  ])

  return c.json(paginate(list, totalResult[0]?.count || 0, page, pageSize))
})

// 更新用户状态
adminRoutes.patch('/users/:id/status', async (c) => {
  const userId = c.req.param('id')
  const { status } = await c.req.json<{ status: string }>()
  const db = c.env.DB

  if (!['active', 'suspended', 'pending'].includes(status)) {
    return c.json(error(400, '无效的状态'), 400)
  }

  await db.update(users).set({ status, updatedAt: now() }).where(eq(users.id, userId))
  return c.json(success(null, '状态更新成功'))
})

// 更新用户角色
adminRoutes.patch('/users/:id/role', async (c) => {
  const userId = c.req.param('id')
  const { role } = await c.req.json<{ role: string }>()
  const db = c.env.DB

  if (!['user', 'admin', 'super_admin'].includes(role)) {
    return c.json(error(400, '无效的角色'), 400)
  }

  await db.update(users).set({ role, updatedAt: now() }).where(eq(users.id, userId))
  return c.json(success(null, '角色更新成功'))
})

// 更新用户配额
adminRoutes.patch('/users/:id/quota', async (c) => {
  const userId = c.req.param('id')
  const { quotaEmail, quotaAttachments } = await c.req.json<{
    quotaEmail?: number
    quotaAttachments?: number
  }>()
  const db = c.env.DB

  const updates: Record<string, unknown> = { updatedAt: now() }
  if (quotaEmail !== undefined) updates['quotaEmail'] = quotaEmail
  if (quotaAttachments !== undefined) updates['quotaAttachments'] = quotaAttachments

  await db.update(users).set(updates).where(eq(users.id, userId))
  return c.json(success(null, '配额更新成功'))
})

// ============ 邮件管理 ============
adminRoutes.get('/mails', async (c) => {
  const db = c.env.DB
  const page = Number(c.req.query('page') || 1)
  const pageSize = Number(c.req.query('pageSize') || 20)
  const userId = c.req.query('userId')
  const direction = c.req.query('direction')
  const status = c.req.query('status')

  const conditions = []
  if (userId) conditions.push(eq(mails.userId, userId))
  if (direction) conditions.push(eq(mails.direction, direction))
  if (status) conditions.push(eq(mails.status, status))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [list, totalResult] = await Promise.all([
    db.select().from(mails)
      .where(where)
      .orderBy(desc(mails.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: count() }).from(mails).where(where),
  ])

  return c.json(paginate(list, totalResult[0]?.count || 0, page, pageSize))
})

// 删除邮件
adminRoutes.delete('/mails/:id', async (c) => {
  const mailId = c.req.param('id')
  const db = c.env.DB

  await db.delete(mails).where(eq(mails.id, mailId))
  return c.json(success(null, '删除成功'))
})

// ============ 批量创建用户（开放 API） ============
adminRoutes.post('/users/batch', async (c) => {
  const { users: userList } = await c.req.json<{
    users: Array<{
      email: string
      username: string
      password: string
      role?: string
    }>
  }>()
  const db = c.env.DB
  const results = []

  for (const u of userList) {
    try {
      const userId = generateUserId()
      const hashedPwd = await hashPassword(u.password)
      const ts = now()

      await db.insert(users).values({
        id: userId,
        email: u.email,
        username: u.username,
        password: hashedPwd,
        nickname: u.username,
        role: u.role || 'user',
        status: 'active',
        createdAt: ts,
        updatedAt: ts,
      })

      results.push({ email: u.email, id: userId, status: 'created' })
    } catch (e: any) {
      results.push({ email: u.email, status: 'failed', error: e.message })
    }
  }

  return c.json(success(results, '批量创建完成'))
})

import { generateUserId, hashPassword } from '../utils/helpers'