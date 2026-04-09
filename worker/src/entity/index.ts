/**
 * CloudMail Pro 数据库实体定义
 * 使用 Drizzle ORM + Cloudflare D1 (SQLite)
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// ============ 用户表 ============
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  nickname: text('nickname'),
  avatar: text('avatar'),
  role: text('role').notNull().default('user'), // user, admin, super_admin
  status: text('status').notNull().default('active'), // active, suspended, pending
  quotaEmail: integer('quota_email').notNull().default(100), // 每日发送额度
  quotaAttachments: integer('quota_attachments').notNull().default(100), // 附件上传额度 MB
  quotaStorageBytes: integer('quota_storage_bytes').notNull().default(1024 * 1024 * 500), // 存储空间
  timezone: text('timezone').default('Asia/Shanghai'),
  language: text('language').default('zh-CN'),
  theme: text('theme').default('light'),
  telegramChatId: text('telegram_chat_id'),
  telegramEnabled: integer('telegram_enabled').notNull().default(0),
  lastLoginAt: integer('last_login_at'), // Unix timestamp
  lastLoginIp: text('last_login_ip'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// ============ 邮箱地址表 ============
export const mailAddresses = sqliteTable('mail_addresses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  address: text('address').notNull().unique(), // 收件地址
  alias: text('alias'), // 别名
  isDefault: integer('is_default').notNull().default(0),
  status: text('status').notNull().default('active'), // active, disabled
  forwardingEnabled: integer('forwarding_enabled').notNull().default(0),
  forwardingTo: text('forwarding_to'), // 转发邮箱
  telegramNotify: integer('telegram_notify').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// ============ 邮件表 ============
export const mails = sqliteTable('mails', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addressId: text('address_id').notNull().references(() => mailAddresses.id, { onDelete: 'cascade' }),
  messageId: text('message_id').notNull(), // Message-ID Header
  direction: text('direction').notNull(), // inbound, outbound
  fromAddress: text('from_address').notNull(),
  fromName: text('from_name'),
  toAddresses: text('to_addresses').notNull(), // JSON Array
  ccAddresses: text('cc_addresses'), // JSON Array
  bccAddresses: text('bcc_addresses'), // JSON Array
  subject: text('subject').notNull(),
  contentPlain: text('content_plain'),
  contentHtml: text('content_html'),
  hasAttachments: integer('has_attachments').notNull().default(0),
  attachmentsJson: text('attachments_json'), // JSON Array
  status: text('status').notNull().default('pending'), // pending, sent, delivered, failed, bounced
  errorMessage: text('error_message'),
  sentAt: integer('sent_at'),
  deliveredAt: integer('delivered_at'),
  isRead: integer('is_read').notNull().default(0),
  isStarred: integer('is_starred').notNull().default(0),
  isDeleted: integer('is_deleted').notNull().default(0),
  deletedAt: integer('deleted_at'),
  labels: text('labels'), // JSON Array: ["work", "important"]
  metadata: text('metadata'), // JSON Object: 扩展字段
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

// ============ 附件表 ============
export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mailId: text('mail_id').references(() => mails.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  r2Key: text('r2_key').notNull(), // R2 对象键
  r2Bucket: text('r2_bucket').notNull().default('attachments'),
  isInline: integer('is_inline').notNull().default(0),
  contentId: text('content_id'), // 内嵌资源的 Content-ID
  checksumSha256: text('checksum_sha256'),
  virusScanned: integer('virus_scanned').default(0),
  virusScanResult: text('virus_scan_result'),
  expiresAt: integer('expires_at'),
  downloadedAt: integer('downloaded_at'),
  downloadCount: integer('download_count').notNull().default(0),
  createdAt: integer('created_at').notNull(),
})

// ============ 会话表（JWT Token 管理） ============
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  device: text('device'), // User-Agent
  ipAddress: text('ip_address'),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
})

// ============ 系统设置表 ============
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  isPublic: integer('is_public').notNull().default(0), // 是否公开（无需登录）
  description: text('description'),
  updatedAt: integer('updated_at').notNull(),
})

// ============ API Token 表 ============
export const apiTokens = sqliteTable('api_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  permissionsJson: text('permissions_json').notNull(), // JSON Array
  lastUsedAt: integer('last_used_at'),
  expiresAt: integer('expires_at'),
  createdAt: integer('created_at').notNull(),
})

// ============ 邮件日志表（用于统计） ============
export const mailLogs = sqliteTable('mail_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  mailId: text('mail_id'),
  action: text('action').notNull(), // send, receive, forward, bounce
  status: text('status').notNull(),
  errorMessage: text('error_message'),
  metadata: text('metadata'),
  createdAt: integer('created_at').notNull(),
})

// ============ 关系定义 ============
export const usersRelations = relations(users, ({ many }) => ({
  mailAddresses: many(mailAddresses),
  mails: many(mails),
  attachments: many(attachments),
  sessions: many(sessions),
  apiTokens: many(apiTokens),
}))

export const mailAddressesRelations = relations(mailAddresses, ({ one, many }) => ({
  user: one(users, {
    fields: [mailAddresses.userId],
    references: [users.id],
  }),
  mails: many(mails),
}))

export const mailsRelations = relations(mails, ({ one, many }) => ({
  user: one(users, {
    fields: [mails.userId],
    references: [users.id],
  }),
  address: one(mailAddresses, {
    fields: [mails.addressId],
    references: [mailAddresses.id],
  }),
  attachments: many(attachments),
}))

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  user: one(users, {
    fields: [attachments.userId],
    references: [users.id],
  }),
  mail: one(mails, {
    fields: [attachments.mailId],
    references: [mails.id],
  }),
}))

// ============ 类型导出 ============
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type MailAddress = typeof mailAddresses.$inferSelect
export type NewMailAddress = typeof mailAddresses.$inferInsert
export type Mail = typeof mails.$inferSelect
export type NewMail = typeof mails.$inferInsert
export type Attachment = typeof attachments.$inferSelect
export type NewAttachment = typeof attachments.$inferInsert
export type Session = typeof sessions.$inferSelect
export type Setting = typeof settings.$inferSelect
export type ApiToken = typeof apiTokens.$inferSelect
export type MailLog = typeof mailLogs.$inferSelect