/**
 * CloudMail Pro 类型定义
 */
export interface Env {
  // Cloudflare Bindings
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
  SEND_MAIL: SendEmail // Cloudflare Email Worker binding
  
  // Environment Variables
  JWT_SECRET: string
  RESEND_API_KEY: string
  RESEND_FROM_EMAIL: string
  RESEND_FROM_NAME: string
  TURNSTILE_SECRET_KEY: string
  TURNSTILE_SITE_KEY: string
  TG_BOT_TOKEN: string
  TG_CHAT_ID: string
  DOMAIN: string
  ADMIN_EMAIL: string
  ADMIN_PASSWORD: string
  ALLOWED_ORIGINS: string
  
  // Version
  VERSION: string
}

// ============ API 响应类型 ============
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

export interface PaginatedResponse<T = unknown> {
  code: number
  message: string
  data: {
    list: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

// ============ 认证相关 ============
export interface LoginRequest {
  email: string
  password: string
  turnstileToken?: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  confirmPassword: string
  turnstileToken?: string
  inviteCode?: string
}

export interface LoginResponse {
  token: string
  refreshToken: string
  user: UserInfo
}

export interface UserInfo {
  id: string
  email: string
  username: string
  nickname: string | null
  avatar: string | null
  role: 'user' | 'admin' | 'super_admin'
  language: string
  theme: string
  createdAt: number
}

// ============ 邮件相关 ============
export interface SendMailRequest {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  content: string
  contentType?: 'plain' | 'html'
  fromAddressId?: string
  attachmentIds?: string[]
}

export interface MailQueryParams {
  page?: number
  pageSize?: number
  direction?: 'inbound' | 'outbound'
  addressId?: string
  status?: string
  search?: string
  label?: string
  isRead?: boolean
  isStarred?: boolean
  startDate?: number
  endDate?: number
}

export interface MailDetail {
  id: string
  messageId: string
  direction: 'inbound' | 'outbound'
  from: { address: string; name: string | null }
  to: { address: string; name: string | null }[]
  cc: { address: string; name: string | null }[] | null
  subject: string
  contentPlain: string | null
  contentHtml: string | null
  hasAttachments: boolean
  attachments: AttachmentInfo[] | null
  status: string
  isRead: boolean
  isStarred: boolean
  labels: string[] | null
  createdAt: number
}

export interface AttachmentInfo {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  isInline: boolean
  downloadUrl: string
}

// ============ 邮箱地址相关 ============
export interface CreateAddressRequest {
  address: string
  alias?: string
  isDefault?: boolean
  forwardingTo?: string
  telegramNotify?: boolean
}

export interface AddressInfo {
  id: string
  address: string
  alias: string | null
  isDefault: boolean
  status: 'active' | 'disabled'
  forwardingEnabled: boolean
  forwardingTo: string | null
  telegramNotify: boolean
  createdAt: number
}

// ============ 管理员相关 ============
export interface AdminUserListParams {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  status?: string
}

export interface AdminMailListParams {
  page?: number
  pageSize?: number
  userId?: string
  direction?: string
  status?: string
  startDate?: number
  endDate?: number
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalMails: number
  todayMails: number
  totalAttachments: number
  storageUsedBytes: number
  dailyMailTrend: { date: string; inbound: number; outbound: number }[]
  dailyUserTrend: { date: string; count: number }[]
}

// ============ 设置相关 ============
export interface SettingItem {
  key: string
  value: string
  isPublic: boolean
  description: string | null
}

export interface UpdateSettingRequest {
  key: string
  value: string
}

// ============ 邮件处理相关 ============
export interface EmailMessage {
  from: string
  to: string
  subject: string
  contentPlain: string
  contentHtml: string
  attachments: EmailAttachment[]
  headers: Record<string, string>
}

export interface EmailAttachment {
  filename: string
  mimeType: string
  content: ArrayBuffer
  size: number
  contentId?: string
  isInline?: boolean
}