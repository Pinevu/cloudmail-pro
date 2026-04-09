/**
 * CloudMail Pro 工具函数
 */
import { nanoid } from 'nanoid'
import { sha256 } from './crypto'

// ============ ID 生成 ============
export function generateId(prefix: string = ''): `${string}${string}` {
  return `${prefix}${nanoid(21)}`
}

export function generateMailId(): string {
  return generateId('mail_')
}

export function generateUserId(): string {
  return generateId('user_')
}

export function generateAddressId(): string {
  return generateId('addr_')
}

export function generateSessionId(): string {
  return generateId('sess_')
}

export function generateTokenId(): string {
  return generateId('tok_')
}

// ============ 时间处理 ============
export function now(): number {
  return Math.floor(Date.now() / 1000)
}

export function nowMs(): number {
  return Date.now()
}

export function formatTime(ts: number, timezone: string = 'Asia/Shanghai'): string {
  return new Date(ts * 1000).toLocaleString('zh-CN', { timeZone: timezone })
}

export function isExpired(expiresAt: number): boolean {
  return expiresAt < now()
}

// ============ 字符串处理 ============
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

export function extractEmailParts(email: string): { local: string; domain: string } {
  const [local, domain] = email.split('@')
  return { local, domain }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function sanitizeSubject(subject: string): string {
  return subject.replace(/[\r\n]/g, ' ').trim()
}

// ============ JSON 安全处理 ============
export function safeJsonParse<T>(str: string | null, fallback: T): T {
  if (!str) return fallback
  try {
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}

export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj)
  } catch {
    return '{}'
  }
}

// ============ 密码处理 ============
export async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt || generateId()
  const hash = await sha256(s + password)
  return `${s}:${hash}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const computed = await sha256(salt + password)
  return computed === hash
}

// ============ 文件处理 ============
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot + 1).toLowerCase()
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename)
  const mimes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    zip: 'application/zip',
    txt: 'text/plain',
    csv: 'text/csv',
  }
  return mimes[ext] || 'application/octet-stream'
}

// ============ 分页处理 ============
export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginationResult {
  offset: number
  limit: number
  page: number
  pageSize: number
}

export function parsePagination(params: PaginationParams): PaginationResult {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20))
  return {
    offset: (page - 1) * pageSize,
    limit: pageSize,
    page,
    pageSize,
  }
}

// ============ 响应构造 ============
export function success<T>(data: T, message: string = 'ok'): { code: number; message: string; data: T } {
  return { code: 200, message, data }
}

export function error(code: number, message: string): { code: number; message: string } {
  return { code, message }
}

export function paginate<T>(list: T[], total: number, page: number, pageSize: number) {
  return {
    code: 200,
    message: 'ok',
    data: {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}