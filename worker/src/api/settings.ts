/**
 * CloudMail Pro 系统设置 API
 */
import { Hono } from 'hono'
import { success } from '../utils/helpers'
import { settings } from '../entity'
import { eq } from 'drizzle-orm'
import type { Env, SettingItem } from '../utils/types'

export const settingsRoutes = new Hono<{ Bindings: Env }>()

// ============ 获取公开设置 ============
settingsRoutes.get('/public', async (c) => {
  const db = c.env.DB
  
  const list = await db.select().from(settings).where(eq(settings.isPublic, 1))
  
  const publicSettings: Record<string, string> = {}
  for (const item of list) {
    publicSettings[item.key] = item.value
  }
  
  // 默认公开设置
  return c.json(success({
    siteTitle: publicSettings['site_title'] || 'CloudMail Pro',
    siteLogo: publicSettings['site_logo'] || '',
    loginBg: publicSettings['login_bg'] || '',
    loginBgOpacity: publicSettings['login_bg_opacity'] || '0.3',
    enableRegistration: publicSettings['enable_registration'] !== 'false',
    enableTurnstile: publicSettings['enable_turnstile'] !== 'false',
    turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || '',
    domain: c.env.DOMAIN || '',
    maxAddressesPerUser: publicSettings['max_addresses_per_user'] || '5',
    maxQuotaPerDay: publicSettings['max_quota_per_day'] || '100',
  }))
})

// ============ 获取所有设置（管理员） ============
settingsRoutes.get('/all', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) {
    return c.json({ code: 401, message: '未授权' }, 401)
  }
  
  const db = c.env.DB
  const list = await db.select().from(settings)
  
  const allSettings: Record<string, SettingItem> = {}
  for (const item of list) {
    allSettings[item.key] = {
      key: item.key,
      value: item.value,
      isPublic: !!item.isPublic,
      description: item.description,
    }
  }
  
  return c.json(success(allSettings))
})

// ============ 更新设置（管理员） ============
settingsRoutes.put('/', async (c) => {
  const body = await c.req.json<Record<string, string>>()
  const db = c.env.DB
  const ts = Math.floor(Date.now() / 1000)
  
  for (const [key, value] of Object.entries(body)) {
    const existing = await db.select().from(settings).where(eq(settings.key, key)).get()
    if (existing) {
      await db.update(settings).set({ value, updatedAt: ts }).where(eq(settings.key, key))
    } else {
      await db.insert(settings).values({ key, value, updatedAt: ts })
    }
  }
  
  return c.json(success(null, '设置已更新'))
})