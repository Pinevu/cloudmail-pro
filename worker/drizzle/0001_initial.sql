-- CloudMail Pro 数据库初始化
-- SQLite (Cloudflare D1)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin', 'super_admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'pending')),
  quota_email INTEGER NOT NULL DEFAULT 100,
  quota_attachments INTEGER NOT NULL DEFAULT 100,
  quota_storage_bytes INTEGER NOT NULL DEFAULT 524288000,
  timezone TEXT DEFAULT 'Asia/Shanghai',
  language TEXT DEFAULT 'zh-CN',
  theme TEXT DEFAULT 'light',
  telegram_chat_id TEXT,
  telegram_enabled INTEGER NOT NULL DEFAULT 0,
  last_login_at INTEGER,
  last_login_ip TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL UNIQUE,
  alias TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
  forwarding_enabled INTEGER NOT NULL DEFAULT 0,
  forwarding_to TEXT,
  telegram_notify INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mails (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_id TEXT NOT NULL REFERENCES mail_addresses(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_addresses TEXT NOT NULL,
  cc_addresses TEXT,
  bcc_addresses TEXT,
  subject TEXT NOT NULL,
  content_plain TEXT,
  content_html TEXT,
  has_attachments INTEGER NOT NULL DEFAULT 0,
  attachments_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  error_message TEXT,
  sent_at INTEGER,
  delivered_at INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0,
  is_starred INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  labels TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mail_id TEXT REFERENCES mails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  r2_bucket TEXT NOT NULL DEFAULT 'attachments',
  is_inline INTEGER NOT NULL DEFAULT 0,
  content_id TEXT,
  checksum_sha256 TEXT,
  virus_scanned INTEGER DEFAULT 0,
  virus_scan_result TEXT,
  expires_at INTEGER,
  downloaded_at INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device TEXT,
  ip_address TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  permissions_json TEXT NOT NULL,
  last_used_at INTEGER,
  expires_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mail_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('send', 'receive', 'forward', 'bounce')),
  status TEXT NOT NULL,
  error_message TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON mail_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_address ON mail_addresses(address);
CREATE INDEX IF NOT EXISTS idx_mails_user ON mails(user_id);
CREATE INDEX IF NOT EXISTS idx_mails_direction ON mails(direction);
CREATE INDEX IF NOT EXISTS idx_mails_status ON mails(status);
CREATE INDEX IF NOT EXISTS idx_mails_created ON mails(created_at);
CREATE INDEX IF NOT EXISTS idx_mails_user_direction ON mails(user_id, direction);
CREATE INDEX IF NOT EXISTS idx_mails_user_read ON mails(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_mails_user_starred ON mails(user_id, is_starred);
CREATE INDEX IF NOT EXISTS idx_mails_message_id ON mails(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_mail ON attachments(mail_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_logs_user ON mail_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_logs_action ON mail_logs(action);
CREATE INDEX IF NOT EXISTS idx_mail_logs_created ON mail_logs(created_at);

-- 默认设置
INSERT OR IGNORE INTO settings (key, value, is_public, description, updated_at) VALUES
  ('site_title', 'CloudMail Pro', 1, '网站标题', 1700000000),
  ('enable_registration', 'true', 1, '是否允许注册', 1700000000),
  ('enable_turnstile', 'true', 1, '是否启用 Turnstile 人机验证', 1700000000),
  ('max_addresses_per_user', '5', 1, '每用户最大邮箱地址数', 1700000000),
  ('max_quota_per_day', '100', 1, '每日邮件发送限额', 1700000000),
  ('login_bg', '', 1, '登录背景图', 1700000000),
  ('login_bg_opacity', '0.3', 1, '登录背景透明度', 1700000000);