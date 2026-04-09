/**
 * CloudMail Pro 邮件 API
 */
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { generateMailId, generateAddressId, now, safeJsonParse, paginate, success, error } from '../utils/helpers'
import { QuotaExceededError, NotFoundError, ValidationError } from '../middleware/error-handler'
import { mails, mailAddresses, attachments, users } from '../entity'
import { eq, and, or, like, desc, asc, sql, count } from 'drizzle-orm'
import type { Env, SendMailRequest, MailQueryParams, MailDetail, CreateAddressRequest, AddressInfo, AttachmentInfo } from '../utils/types'

export const mailRoutes = new Hono<{ Bindings: Env }>()

// 所有邮件路由需要认证
mailRoutes.use('*', authMiddleware)

// ============ 获取邮箱地址列表 ============
mailRoutes.get('/addresses', async (c) => {
  const userId = c.get('userId') as string
  const db = c.env.DB

  const list = await db.select().from(mailAddresses)
    .where(and(eq(mailAddresses.userId, userId), eq(mailAddresses.isDeleted, 0)))
    .orderBy(desc(mailAddresses.createdAt))

  const addresses: AddressInfo[] = list.map(a => ({
    id: a.id,
    address: a.address,
    alias: a.alias,
    isDefault: !!a.isDefault,
    status: a.status as 'active' | 'disabled',
    forwardingEnabled: !!a.forwardingEnabled,
    forwardingTo: a.forwardingTo,
    telegramNotify: !!a.telegramNotify,
    createdAt: a.createdAt,
  }))

  return c.json(success(addresses))
})

// ============ 创建邮箱地址 ============
mailRoutes.post('/addresses', async (c) => {
  const userId = c.get('userId') as string
  const body = await c.req.json<CreateAddressRequest>()
  const db = c.env.DB

  // 检查地址格式
  if (!body.address || !body.address.includes('@')) {
    throw new ValidationError('邮箱地址格式不正确')
  }

  // 检查是否已有地址
  const existing = await db.select().from(mailAddresses)
    .where(eq(mailAddresses.address, body.address)).get()
  if (existing) {
    return c.json(error(409, '该邮箱地址已存在'), 409)
  }

  // 检查用户地址数量限制
  const userAddresses = await db.select().from(mailAddresses)
    .where(and(eq(mailAddresses.userId, userId), eq(mailAddresses.isDeleted, 0)))
  if (userAddresses.length >= 5) { // 默认每用户最多5个地址
    throw new QuotaExceededError('每用户最多5个邮箱地址')
  }

  const addressId = generateAddressId()
  const ts = now()

  await db.insert(mailAddresses).values({
    id: addressId,
    userId,
    address: body.address,
    alias: body.alias || null,
    isDefault: userAddresses.length === 0 ? 1 : (body.isDefault ? 1 : 0),
    status: 'active',
    forwardingEnabled: body.forwardingTo ? 1 : 0,
    forwardingTo: body.forwardingTo || null,
    telegramNotify: body.telegramNotify ? 1 : 0,
    createdAt: ts,
    updatedAt: ts,
  })

  return c.json(success({ id: addressId, address: body.address }, '创建成功'))
})

// ============ 删除邮箱地址 ============
mailRoutes.delete('/addresses/:id', async (c) => {
  const userId = c.get('userId') as string
  const addressId = c.req.param('id')
  const db = c.env.DB

  const address = await db.select().from(mailAddresses)
    .where(and(eq(mailAddresses.id, addressId), eq(mailAddresses.userId, userId))).get()

  if (!address) {
    throw new NotFoundError('邮箱地址不存在')
  }

  await db.delete(mailAddresses).where(eq(mailAddresses.id, addressId))

  return c.json(success(null, '删除成功'))
})

// ============ 获取邮件列表 ============
mailRoutes.get('/list', async (c) => {
  const userId = c.get('userId') as string
  const db = c.env.DB

  const query: MailQueryParams = {
    page: Number(c.req.query('page') || 1),
    pageSize: Number(c.req.query('pageSize') || 20),
    direction: c.req.query('direction') as MailQueryParams['direction'],
    addressId: c.req.query('addressId'),
    status: c.req.query('status'),
    search: c.req.query('search'),
    label: c.req.query('label'),
    isRead: c.req.query('isRead') === 'true' ? true : c.req.query('isRead') === 'false' ? false : undefined,
    isStarred: c.req.query('isStarred') === 'true' ? true : undefined,
  }

  const { offset, limit, page, pageSize } = parsePagination(query)

  // 构建查询条件
  const conditions = [eq(mails.userId, userId), eq(mails.isDeleted, 0)]
  
  if (query.direction) conditions.push(eq(mails.direction, query.direction))
  if (query.addressId) conditions.push(eq(mails.addressId, query.addressId))
  if (query.status) conditions.push(eq(mails.status, query.status))
  if (query.isRead !== undefined) conditions.push(eq(mails.isRead, query.isRead ? 1 : 0))
  if (query.isStarred) conditions.push(eq(mails.isStarred, 1))
  if (query.search) conditions.push(like(mails.subject, `%${query.search}%`))

  const [list, totalResult] = await Promise.all([
    db.select().from(mails)
      .where(and(...conditions))
      .orderBy(desc(mails.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(mails)
      .where(and(...conditions)),
  ])

  const total = totalResult[0]?.count || 0

  return c.json(paginate(list, total, page, pageSize))
})

// ============ 获取邮件详情 ============
mailRoutes.get('/:id', async (c) => {
  const userId = c.get('userId') as string
  const mailId = c.req.param('id')
  const db = c.env.DB

  const mail = await db.select().from(mails)
    .where(and(eq(mails.id, mailId), eq(mails.userId, userId))).get()

  if (!mail) {
    throw new NotFoundError('邮件不存在')
  }

  // 获取附件
  const attachList = await db.select().from(attachments)
    .where(eq(attachments.mailId, mailId))

  const mailDetail: MailDetail = {
    id: mail.id,
    messageId: mail.messageId,
    direction: mail.direction as 'inbound' | 'outbound',
    from: { address: mail.fromAddress, name: mail.fromName },
    to: safeJsonParse(mail.toAddresses, []),
    cc: safeJsonParse(mail.ccAddresses, []),
    subject: mail.subject,
    contentPlain: mail.contentPlain,
    contentHtml: mail.contentHtml,
    hasAttachments: !!mail.hasAttachments,
    attachments: attachList.map(a => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      isInline: !!a.isInline,
      downloadUrl: `/api/mail/attachments/${a.id}/download`,
    })),
    status: mail.status,
    isRead: !!mail.isRead,
    isStarred: !!mail.isStarred,
    labels: safeJsonParse(mail.labels, []),
    createdAt: mail.createdAt,
  }

  // 标记为已读
  if (!mail.isRead) {
    await db.update(mails).set({ isRead: 1, updatedAt: now() }).where(eq(mails.id, mailId))
  }

  return c.json(success(mailDetail))
})

// ============ 发送邮件 ============
mailRoutes.post('/send', async (c) => {
  const userId = c.get('userId') as string
  const body = await c.req.json<SendMailRequest>()
  const db = c.env.DB

  // 参数验证
  if (!body.to || body.to.length === 0) {
    throw new ValidationError('收件人不能为空')
  }
  if (!body.subject) {
    throw new ValidationError('主题不能为空')
  }
  if (!body.content) {
    throw new ValidationError('内容不能为空')
  }

  // 检查发送额度
  const user = await db.select().from(users).where(eq(users.id, userId)).get()
  if (!user) throw new NotFoundError('用户不存在')

  // 调用 Resend API 发送邮件
  const fromAddress = body.fromAddressId 
    ? (await db.select().from(mailAddresses).where(eq(mailAddresses.id, body.fromAddressId)).get())?.address
    : `${user.username}@${c.env.DOMAIN}`

  if (!fromAddress) {
    throw new ValidationError('发送地址不存在')
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${c.env.RESEND_FROM_NAME || 'CloudMail Pro'} <${fromAddress}>`,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      [body.contentType === 'plain' ? 'text' : 'html']: body.content,
    }),
  })

  const resendData = await resendResponse.json() as { id?: string; error?: { message: string } }

  if (!resendResponse.ok || resendData.error) {
    // 保存为失败记录
    const mailId = generateMailId()
    await db.insert(mails).values({
      id: mailId,
      userId,
      addressId: body.fromAddressId || '',
      messageId: resendData.id || '',
      direction: 'outbound',
      fromAddress: fromAddress,
      fromName: user.nickname || user.username,
      toAddresses: JSON.stringify(body.to),
      ccAddresses: body.cc ? JSON.stringify(body.cc) : null,
      bccAddresses: body.bcc ? JSON.stringify(body.bcc) : null,
      subject: body.subject,
      contentPlain: body.contentType === 'plain' ? body.content : null,
      contentHtml: body.contentType === 'html' ? body.content : null,
      hasAttachments: 0,
      status: 'failed',
      errorMessage: resendData.error?.message || '发送失败',
      createdAt: now(),
      updatedAt: now(),
    })

    return c.json(error(502, `邮件发送失败: ${resendData.error?.message || '未知错误'}`), 502)
  }

  // 保存为成功记录
  const mailId = generateMailId()
  await db.insert(mails).values({
    id: mailId,
    userId,
    addressId: body.fromAddressId || '',
    messageId: resendData.id || '',
    direction: 'outbound',
    fromAddress: fromAddress,
    fromName: user.nickname || user.username,
    toAddresses: JSON.stringify(body.to),
    ccAddresses: body.cc ? JSON.stringify(body.cc) : null,
    bccAddresses: body.bcc ? JSON.stringify(body.bcc) : null,
    subject: body.subject,
    contentPlain: body.contentType === 'plain' ? body.content : null,
    contentHtml: body.contentType === 'html' ? body.content : null,
    hasAttachments: 0,
    status: 'sent',
    sentAt: now(),
    createdAt: now(),
    updatedAt: now(),
  })

  return c.json(success({ id: mailId, resendId: resendData.id }, '发送成功'))
})

// ============ 标记邮件 ============
mailRoutes.patch('/:id/star', async (c) => {
  const userId = c.get('userId') as string
  const mailId = c.req.param('id')
  const db = c.env.DB

  const mail = await db.select().from(mails)
    .where(and(eq(mails.id, mailId), eq(mails.userId, userId))).get()
  if (!mail) throw new NotFoundError('邮件不存在')

  const { starred } = await c.req.json<{ starred: boolean }>()
  await db.update(mails).set({ isStarred: starred ? 1 : 0, updatedAt: now() }).where(eq(mails.id, mailId))

  return c.json(success(null, starred ? '已星标' : '已取消星标'))
})

mailRoutes.patch('/:id/read', async (c) => {
  const userId = c.get('userId') as string
  const mailId = c.req.param('id')
  const db = c.env.DB

  const mail = await db.select().from(mails)
    .where(and(eq(mails.id, mailId), eq(mails.userId, userId))).get()
  if (!mail) throw new NotFoundError('邮件不存在')

  const { read } = await c.req.json<{ read: boolean }>()
  await db.update(mails).set({ isRead: read ? 1 : 0, updatedAt: now() }).where(eq(mails.id, mailId))

  return c.json(success(null, read ? '已标为已读' : '已标为未读'))
})

// ============ 删除邮件（软删除） ============
mailRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId') as string
  const mailId = c.req.param('id')
  const db = c.env.DB

  const mail = await db.select().from(mails)
    .where(and(eq(mails.id, mailId), eq(mails.userId, userId))).get()
  if (!mail) throw new NotFoundError('邮件不存在')

  await db.update(mails).set({ isDeleted: 1, deletedAt: now(), updatedAt: now() }).where(eq(mails.id, mailId))

  return c.json(success(null, '删除成功'))
})

// ============ 批量操作 ============
mailRoutes.post('/batch/read', async (c) => {
  const userId = c.get('userId') as string
  const { ids } = await c.req.json<{ ids: string[] }>()
  const db = c.env.DB

  for (const id of ids) {
    await db.update(mails).set({ isRead: 1, updatedAt: now() })
      .where(and(eq(mails.id, id), eq(mails.userId, userId)))
  }

  return c.json(success(null, '批量已读成功'))
})

mailRoutes.post('/batch/delete', async (c) => {
  const userId = c.get('userId') as string
  const { ids } = await c.req.json<{ ids: string[] }>()
  const db = c.env.DB

  const ts = now()
  for (const id of ids) {
    await db.update(mails).set({ isDeleted: 1, deletedAt: ts, updatedAt: ts })
      .where(and(eq(mails.id, id), eq(mails.userId, userId)))
  }

  return c.json(success(null, '批量删除成功'))
})

import { parsePagination } from '../utils/helpers'