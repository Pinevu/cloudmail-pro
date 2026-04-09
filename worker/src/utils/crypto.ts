/**
 * CloudMail Pro 加密工具
 */

// ============ SHA256 哈希 ============
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============ HMAC-SHA256 ============
export async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const messageData = encoder.encode(message)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============ 令牌生成 ============
export function generateRandomToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length]
  }
  return token
}

// ============ AES-GCM 加密/解密 ============
export async function encrypt(plaintext: string, key: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = await deriveKey(key)
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(plaintext)
  )
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(ciphertext: string, key: string): Promise<string> {
  const keyData = await deriveKey(key)
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt'])
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, data)
  
  return new TextDecoder().decode(decrypted)
}

async function deriveKey(password: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('cloudmail-pro'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  ).then(k => crypto.subtle.exportKey('raw', k))
}

// ============ 敏感数据掩码 ============
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain || local.length <= 2) return email
  return local[0] + '***' + local[local.length - 1] + '@' + domain
}