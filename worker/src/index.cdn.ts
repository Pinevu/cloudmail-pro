/**
 * CloudMail Pro - Cloudflare Worker (CDN版，无需构建)
 * 使用 Cloudflare 的 CDN 导入 Hono 等依赖
 */

// 基础路由
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  const path = url.pathname
  
  // 健康检查
  if (path === '/' || path === '/health') {
    return jsonResponse({
      name: 'CloudMail Pro',
      version: '1.0.0',
      status: 'running',
      message: 'Worker 运行中！请通过 API 使用完整功能。',
      timestamp: new Date().toISOString(),
    }, corsHeaders)
  }
  
  // API 路由
  if (path.startsWith('/api/')) {
    return handleApi(request, url, path, corsHeaders)
  }
  
  // 404
  return jsonResponse({
    code: 404,
    message: 'Not Found',
  }, { ...corsHeaders, 'Content-Type': 'application/json' }, 404)
}

async function handleApi(request, url, path, corsHeaders) {
  const method = request.method
  const env = request.env || {}
  
  // 解析 token
  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  
  // 解析 body
  let body = null
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try { body = await request.json() } catch {}
  }
  
  // 路由匹配
  if (path === '/api/auth/login' && method === 'POST') {
    return handleLogin(body, env, corsHeaders)
  }
  
  if (path === '/api/auth/register' && method === 'POST') {
    return handleRegister(body, env, corsHeaders)
  }
  
  if (path === '/api/settings/public' && method === 'GET') {
    return handlePublicSettings(env, corsHeaders)
  }
  
  if (path.startsWith('/api/mail') && token) {
    return handleMail(path, method, body, env, corsHeaders)
  }
  
  if (path === '/api/auth/me' && token) {
    return handleGetMe(token, env, corsHeaders)
  }
  
  return jsonResponse({
    code: 404,
    message: 'API endpoint not found',
  }, { ...corsHeaders, 'Content-Type': 'application/json' }, 404)
}

async function handleLogin(body, env, corsHeaders) {
  if (!body?.email || !body?.password) {
    return jsonResponse({ code: 400, message: '请填写邮箱和密码' }, corsHeaders, 400)
  }
  
  const db = env.DB
  if (!db) {
    return jsonResponse({ code: 500, message: '数据库未配置' }, corsHeaders, 500)
  }
  
  try {
    // 查询用户
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? LIMIT 1')
    const user = await stmt.bind(body.email).first()
    
    if (!user) {
      return jsonResponse({ code: 401, message: '邮箱或密码错误' }, corsHeaders, 401)
    }
    
    // 简单验证密码
    const valid = await verifyPassword(body.password, user.password)
    if (!valid) {
      return jsonResponse({ code: 401, message: '邮箱或密码错误' }, corsHeaders, 401)
    }
    
    if (user.status !== 'active') {
      return jsonResponse({ code: 403, message: '账号已被禁用' }, corsHeaders, 403)
    }
    
    // 生成 JWT
    const secret = env.JWT_SECRET || 'default-secret'
    const token = await generateJWT({
      userId: user.id,
      role: user.role,
      email: user.email,
    }, secret)
    
    const refreshToken = await generateJWT({
      userId: user.id,
      role: user.role,
      type: 'refresh',
    }, secret)
    
    return jsonResponse({
      code: 200,
      message: '登录成功',
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          nickname: user.nickname,
          role: user.role,
          language: user.language || 'zh-CN',
          theme: user.theme || 'light',
        }
      }
    }, corsHeaders)
  } catch (err) {
    console.error('Login error:', err)
    return jsonResponse({ code: 500, message: '服务器错误' }, corsHeaders, 500)
  }
}

async function handleRegister(body, env, corsHeaders) {
  if (!body?.email || !body?.username || !body?.password) {
    return jsonResponse({ code: 400, message: '请填写所有必填字段' }, corsHeaders, 400)
  }
  
  if (!isValidEmail(body.email)) {
    return jsonResponse({ code: 400, message: '邮箱格式不正确' }, corsHeaders, 400)
  }
  
  if (body.password.length < 8) {
    return jsonResponse({ code: 400, message: '密码长度至少8位' }, corsHeaders, 400)
  }
  
  const db = env.DB
  if (!db) {
    return jsonResponse({ code: 500, message: '数据库未配置' }, corsHeaders, 500)
  }
  
  try {
    // 检查邮箱
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(body.email).first()
    if (existing) {
      return jsonResponse({ code: 409, message: '该邮箱已被注册' }, corsHeaders, 409)
    }
    
    // 检查用户名
    const existingUser = await db.prepare('SELECT id FROM users WHERE username = ?').bind(body.username).first()
    if (existingUser) {
      return jsonResponse({ code: 409, message: '该用户名已被使用' }, corsHeaders, 409)
    }
    
    // 创建用户
    const userId = 'user_' + randomId()
    const password = await hashPassword(body.password)
    const now = Math.floor(Date.now() / 1000)
    
    // 检查是否第一个用户（超级管理员）
    const count = await db.prepare('SELECT COUNT(*) as c FROM users').first()
    const role = count?.c === 0 ? 'super_admin' : 'user'
    
    await db.prepare(`
      INSERT INTO users (id, email, username, password, nickname, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(userId, body.email, body.username, password, body.username, role, now, now).run()
    
    // 生成 Token
    const secret = env.JWT_SECRET || 'default-secret'
    const token = await generateJWT({ userId, role, email: body.email }, secret)
    const refreshToken = await generateJWT({ userId, role, type: 'refresh' }, secret)
    
    return jsonResponse({
      code: 200,
      message: '注册成功',
      data: {
        token,
        refreshToken,
        user: {
          id: userId,
          email: body.email,
          username: body.username,
          nickname: body.username,
          role,
          language: 'zh-CN',
          theme: 'light',
        }
      }
    }, corsHeaders)
  } catch (err) {
    console.error('Register error:', err)
    return jsonResponse({ code: 500, message: '服务器错误' }, corsHeaders, 500)
  }
}

async function handleMail(path, method, body, env, corsHeaders) {
  const db = env.DB
  if (!db) {
    return jsonResponse({ code: 500, message: '数据库未配置' }, corsHeaders, 500)
  }
  
  // 发送邮件
  if (path === '/api/mail/send' && method === 'POST') {
    if (!body?.to?.length || !body?.subject || !body?.content) {
      return jsonResponse({ code: 400, message: '请填写收件人、主题和内容' }, corsHeaders, 400)
    }
    
    try {
      const now = Math.floor(Date.now() / 1000)
      const mailId = 'mail_' + randomId()
      
      // 通过 Resend 发送
      if (env.RESEND_API_KEY) {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL || 'noreply@nooh.cc',
            to: body.to,
            cc: body.cc,
            subject: body.subject,
            html: body.content,
          })
        })
        
        const resendData = await resendRes.json()
        
        if (!resendRes.ok) {
          return jsonResponse({
            code: 502,
            message: `发送失败: ${resendData?.error?.message || '未知错误'}`,
          }, corsHeaders, 502)
        }
        
        return jsonResponse({
          code: 200,
          message: '发送成功',
          data: { id: mailId, resendId: resendData.id },
        }, corsHeaders)
      }
      
      return jsonResponse({ code: 200, message: '模拟发送成功（Resend 未配置）' }, corsHeaders)
    } catch (err) {
      return jsonResponse({ code: 500, message: '发送失败' }, corsHeaders, 500)
    }
  }
  
  // 获取邮件列表
  if (path.match(/^\/api\/mail\/list/) && method === 'GET') {
    const page = parseInt(new URL('?' + (new URL('/api/mail/list?' + (request.url.split('?')[1] || '')).searchParams.toString().replace('/api/mail/list?', ''))).searchParams.get('page') || '1')
    const pageSize = parseInt(new URL(request.url).searchParams.get('pageSize') || '20')
    const direction = new URL(request.url).searchParams.get('direction')
    
    try {
      let sql = 'SELECT * FROM mails WHERE is_deleted = 0'
      const params = []
      
      if (direction) {
        sql += ' AND direction = ?'
        params.push(direction)
      }
      
      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
      const offset = (page - 1) * pageSize
      params.push(pageSize, offset)
      
      const stmt = db.prepare(sql)
      const mails = await stmt.bind(...params).all()
      
      const countStmt = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) as count').replace(' ORDER BY created_at DESC LIMIT ? OFFSET ?', ''))
      const total = (await countStmt.all())[0]?.count || 0
      
      return jsonResponse({
        code: 200,
        message: 'ok',
        data: {
          list: mails,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        }
      }, corsHeaders)
    } catch (err) {
      console.error('List mails error:', err)
      return jsonResponse({ code: 500, message: '获取失败' }, corsHeaders, 500)
    }
  }
  
  // 获取邮箱地址
  if (path === '/api/mail/addresses' && method === 'GET') {
    try {
      const stmt = db.prepare('SELECT * FROM mail_addresses WHERE status = ? AND is_deleted = 0 ORDER BY created_at DESC')
      const addresses = await stmt.bind('active').all()
      return jsonResponse({ code: 200, data: addresses }, corsHeaders)
    } catch (err) {
      return jsonResponse({ code: 500, message: '获取失败' }, corsHeaders, 500)
    }
  }
  
  return jsonResponse({ code: 404, message: 'Not found' }, corsHeaders, 404)
}

async function handleGetMe(token, env, corsHeaders) {
  try {
    const secret = env.JWT_SECRET || 'default-secret'
    const payload = await verifyJWT(token, secret)
    
    const db = env.DB
    if (!db) return jsonResponse({ code: 500, message: '数据库未配置' }, corsHeaders, 500)
    
    const user = await db.prepare('SELECT id, email, username, nickname, role, language, theme FROM users WHERE id = ?').bind(payload.userId).first()
    
    if (!user) return jsonResponse({ code: 404, message: '用户不存在' }, corsHeaders, 404)
    
    return jsonResponse({ code: 200, data: user }, corsHeaders)
  } catch {
    return jsonResponse({ code: 401, message: '令牌无效' }, corsHeaders, 401)
  }
}

async function handlePublicSettings(env, corsHeaders) {
  return jsonResponse({
    code: 200,
    data: {
      siteTitle: 'CloudMail Pro',
      enableRegistration: true,
      enableTurnstile: false,
      turnstileSiteKey: '',
      domain: env.DOMAIN || 'nooh.cc',
      maxAddressesPerUser: 5,
      maxQuotaPerDay: 100,
    }
  }, corsHeaders)
}

// ============ 工具函数 ============

function jsonResponse(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  })
}

function randomId() {
  return Math.random().toString(36).substr(2, 21)
}

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const salt = randomId()
  const data = encoder.encode(salt + password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  return salt + ':' + hashHex
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const encoder = new TextEncoder()
  const data = encoder.encode(salt + password)
  const computed = await crypto.subtle.digest('SHA-256', data)
  const computedHex = Array.from(new Uint8Array(computed)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computedHex === hash
}

async function generateJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const data = {
    ...payload,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 days
  }
  
  const encoded = (obj) => {
    return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }
  
  const signature = await hmacSha256(secret, encoded(header) + '.' + encoded(data))
  
  return encoded(header) + '.' + encoded(data) + '.' + signature
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid token')
    
    const [headerB64, payloadB64, signatureB64] = parts
    const expectedSig = await hmacSha256(secret, headerB64 + '.' + payloadB64)
    
    if (signatureB64 !== expectedSig) throw new Error('Invalid signature')
    
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired')
    }
    
    return payload
  } catch (err) {
    throw new Error('Invalid token: ' + err.message)
  }
}

async function hmacSha256(secret, message) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}