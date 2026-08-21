-- ============================================================
-- 农药混配查询 - 用户注册登录系统 建表SQL
-- 在 Supabase 后台的 SQL Editor 中执行以下全部内容
-- ============================================================

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'farmer',
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users(status);
CREATE INDEX IF NOT EXISTS idx_app_users_name ON app_users(name);

-- 3. 开启 Row Level Security
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略：允许任何人插入（注册）
DROP POLICY IF EXISTS "允许匿名注册" ON app_users;
CREATE POLICY "允许匿名注册" ON app_users
  FOR INSERT WITH CHECK (true);

-- 5. RLS 策略：允许任何人查询（登录需要读用户数据）
--    注意：password_hash 会暴露，但anon key本身就是公开的，
--    安全性靠密码哈希保证，实际生产环境建议用Supabase Auth
DROP POLICY IF EXISTS "允许匿名查询" ON app_users;
CREATE POLICY "允许匿名查询" ON app_users
  FOR SELECT USING (true);

-- 6. RLS 策略：允许任何人更新（管理员审核改status）
DROP POLICY IF EXISTS "允许匿名更新" ON app_users;
CREATE POLICY "允许匿名更新" ON app_users
  FOR UPDATE USING (true);

-- 7. RLS 策略：允许任何人删除（管理员删用户）
DROP POLICY IF EXISTS "允许匿名删除" ON app_users;
CREATE POLICY "允许匿名删除" ON app_users
  FOR DELETE USING (true);

-- ============================================================
-- 执行完毕后，把以下信息发给开发者：
-- 1. Project URL（形如 https://xxxxx.supabase.co）
-- 2. anon public key（形如 eyJhbGciOi...很长一串）
-- ============================================================
