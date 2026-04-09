/**
 * CloudMail Pro 错误处理中间件
 */
import type { Context } from 'hono'
import { HTTPException } from 'hono/types'
import { error } from '../utils/helpers'

export async function errorHandler(c: Context, err: Error | HTTPException): Promise<Response> {
  console.error('[Error]', err.message, err.stack)
  
  if (err instanceof HTTPException) {
    return c.json(error(err.statusCode, err.message), err.statusCode as 400 | 401 | 403 | 404 | 500)
  }
  
  const customErrors: Record<string, { code: number; message: string }> = {
    UnauthorizedError: { code: 401, message: '未授权，请登录' },
    ForbiddenError: { code: 403, message: '禁止访问' },
    NotFoundError: { code: 404, message: '资源不存在' },
    ValidationError: { code: 400, message: '参数验证失败' },
    RateLimitError: { code: 429, message: '请求过于频繁' },
    QuotaExceededError: { code: 402, message: '额度不足' },
    ConflictError: { code: 409, message: '资源冲突' },
  }
  
  const errorType = err.name
  if (customErrors[errorType]) {
    const { code, message } = customErrors[errorType]
    return c.json(error(code, message), code as number)
  }
  
  const isDev = c.env?.ENV === 'development'
  if (isDev) {
    return c.json(error(500, err.message), 500)
  }
  
  return c.json(error(500, '服务器内部错误'), 500)
}

// ============ 自定义错误类 ============
export class UnauthorizedError extends Error { constructor(m = '未授权') { super(m); this.name = 'UnauthorizedError' } }
export class ForbiddenError extends Error { constructor(m = '禁止访问') { super(m); this.name = 'ForbiddenError' } }
export class NotFoundError extends Error { constructor(m = '资源不存在') { super(m); this.name = 'NotFoundError' } }
export class ValidationError extends Error { constructor(m = '参数验证失败') { super(m); this.name = 'ValidationError' } }
export class RateLimitError extends Error { constructor(m = '请求过于频繁') { super(m); this.name = 'RateLimitError' } }
export class QuotaExceededError extends Error { constructor(m = '额度不足') { super(m); this.name = 'QuotaExceededError' } }
export class ConflictError extends Error { constructor(m = '资源冲突') { super(m); this.name = 'ConflictError' } }