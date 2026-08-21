-- ============================================================
-- 农药混配查询 - 云端数据表
-- 在 Supabase SQL Editor 中执行此文件
-- 不影响已有的 app_users 表
-- ============================================================

-- 1. 产品表（替代 data/products.js 静态文件）
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 农药扩展信息表（替代 data/pesticide_extras.js + pesticides.js 中的 flags）
CREATE TABLE IF NOT EXISTS pesticide_extras (
  component TEXT PRIMARY KEY,
  ph TEXT,
  contraindications TEXT,
  flags JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 农药数据覆盖表（只存被后台修改过的农药条目，覆盖静态文件）
CREATE TABLE IF NOT EXISTS pesticide_overrides (
  component TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS 策略：允许匿名读写（与 app_users 表相同策略）
-- ============================================================

-- products 表 RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY products_select ON products FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY products_insert ON products FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY products_update ON products FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY products_delete ON products FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- pesticide_extras 表 RLS
ALTER TABLE pesticide_extras ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY extras_select ON pesticide_extras FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY extras_insert ON pesticide_extras FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY extras_update ON pesticide_extras FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY extras_delete ON pesticide_extras FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- pesticide_overrides 表 RLS
ALTER TABLE pesticide_overrides ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY overrides_select ON pesticide_overrides FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY overrides_insert ON pesticide_overrides FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY overrides_update ON pesticide_overrides FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY overrides_delete ON pesticide_overrides FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. 混配关系表（农药成分 ↔ 产品，手动指定的混配规则）
-- 双向联动：农药侧编辑和产品侧编辑读写同一张表
CREATE TABLE IF NOT EXISTS compatibility (
  pesticide_component TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'caution',  -- forbidden / caution / mixable
  reason TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (pesticide_component, product_id)
);

-- compatibility 表 RLS
ALTER TABLE compatibility ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY compat_select ON compatibility FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY compat_insert ON compatibility FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY compat_update ON compatibility FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY compat_delete ON compatibility FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 完成提示
-- 执行完毕后，运行迁移脚本上传现有数据
-- ============================================================
