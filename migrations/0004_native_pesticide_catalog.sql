CREATE TABLE IF NOT EXISTS legacy_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_legacy_products_name ON legacy_products(name);
CREATE INDEX IF NOT EXISTS idx_legacy_products_category ON legacy_products(category);

CREATE TABLE IF NOT EXISTS legacy_product_specs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES legacy_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  capacity TEXT NOT NULL DEFAULT '',
  form TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_legacy_product_specs_product ON legacy_product_specs(product_id, sort_order);

CREATE TABLE IF NOT EXISTS legacy_product_compatibility (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES legacy_products(id) ON DELETE CASCADE,
  pesticide_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_legacy_product_compatibility_product ON legacy_product_compatibility(product_id);
CREATE INDEX IF NOT EXISTS idx_legacy_product_compatibility_pesticide ON legacy_product_compatibility(pesticide_name);

CREATE TABLE IF NOT EXISTS legacy_pesticides (
  component TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_legacy_pesticides_component ON legacy_pesticides(component);

CREATE TABLE IF NOT EXISTS legacy_pesticide_extras (
  component TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS navigation_items (
  id TEXT PRIMARY KEY,
  tab TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT '核心功能智库',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  admin_only INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_navigation_items_order ON navigation_items(group_name, sort_order);
