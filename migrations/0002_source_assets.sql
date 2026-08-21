CREATE TABLE IF NOT EXISTS source_assets (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  r2_key TEXT NOT NULL DEFAULT '',
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  import_status TEXT NOT NULL CHECK (import_status IN ('pending', 'uploaded', 'missing', 'unmatched')),
  imported_at TEXT,
  source_note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_source_assets_product_id ON source_assets(product_id);
CREATE INDEX IF NOT EXISTS idx_source_assets_status ON source_assets(import_status);
