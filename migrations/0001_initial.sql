PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('own', 'market')),
  form TEXT NOT NULL DEFAULT '',
  usage TEXT NOT NULL DEFAULT '',
  plain_usage TEXT NOT NULL DEFAULT '',
  ingredients_json TEXT NOT NULL DEFAULT '{}',
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  legacy_details_json TEXT NOT NULL DEFAULT '{}',
  images_json TEXT NOT NULL DEFAULT '[]',
  mix_flags_json TEXT NOT NULL DEFAULT '{}',
  needs_verification INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);

CREATE TABLE IF NOT EXISTS product_skus (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL DEFAULT '',
  specification TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  inner_pack_count INTEGER,
  price REAL,
  price_tier TEXT NOT NULL DEFAULT '标准价',
  product_type TEXT NOT NULL DEFAULT '',
  source_ref_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_skus_product_id ON product_skus(product_id);
CREATE INDEX IF NOT EXISTS idx_product_skus_sku ON product_skus(sku);

CREATE TABLE IF NOT EXISTS pesticides (
  component TEXT PRIMARY KEY,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  category TEXT NOT NULL DEFAULT '',
  chemical_class TEXT NOT NULL DEFAULT '',
  problems TEXT NOT NULL DEFAULT '',
  usage TEXT NOT NULL DEFAULT '',
  precautions TEXT NOT NULL DEFAULT '',
  brands_json TEXT NOT NULL DEFAULT '[]',
  related_json TEXT NOT NULL DEFAULT '[]',
  flags_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pesticides_category ON pesticides(category);

CREATE TABLE IF NOT EXISTS pesticide_extras (
  component TEXT PRIMARY KEY REFERENCES pesticides(component) ON DELETE CASCADE,
  ph TEXT NOT NULL DEFAULT '',
  contraindications TEXT NOT NULL DEFAULT '',
  flags_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff', 'dealer', 'farmer')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'disabled')),
  password_hash TEXT NOT NULL,
  password_algorithm TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  migrated_from TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS price_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_product_prices (
  id TEXT PRIMARY KEY,
  price_profile_id TEXT NOT NULL REFERENCES price_profiles(id) ON DELETE CASCADE,
  product_sku_id TEXT NOT NULL REFERENCES product_skus(id) ON DELETE CASCADE,
  price REAL NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(price_profile_id, product_sku_id)
);

CREATE TABLE IF NOT EXISTS crops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fertilizer_plans (
  id TEXT PRIMARY KEY,
  crop_id TEXT REFERENCES crops(id) ON DELETE SET NULL,
  owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  source_plan_id TEXT REFERENCES fertilizer_plans(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  plan_type TEXT NOT NULL CHECK (plan_type IN ('full_cycle', 'target_stage', 'target_problem', 'custom')),
  tier TEXT NOT NULL DEFAULT '' CHECK (tier IN ('', 'high', 'middle', 'low')),
  is_official INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER,
  usage_interval TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  function_tags_json TEXT NOT NULL DEFAULT '[]',
  notices TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fertilizer_plan_items (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES fertilizer_plans(id) ON DELETE CASCADE,
  product_sku_id TEXT REFERENCES product_skus(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('own', 'market')),
  application_method TEXT NOT NULL DEFAULT '',
  dose_value REAL,
  dose_unit TEXT NOT NULL DEFAULT '',
  usage_count INTEGER,
  usage_interval TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS import_audits (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'partial', 'failed')),
  record_counts_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
