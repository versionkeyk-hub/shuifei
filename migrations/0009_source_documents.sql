CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_path TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  original_html TEXT NOT NULL DEFAULT '',
  node_count INTEGER NOT NULL DEFAULT 0,
  image_count INTEGER NOT NULL DEFAULT 0,
  imported_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_document_nodes (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  parent_id TEXT,
  depth INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  node_type TEXT NOT NULL DEFAULT 'text',
  text_content TEXT NOT NULL DEFAULT '',
  image_urls_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_source_document_nodes_document ON source_document_nodes(document_id, depth, sort_order);
CREATE INDEX IF NOT EXISTS idx_source_document_nodes_parent ON source_document_nodes(parent_id, sort_order);

CREATE TABLE IF NOT EXISTS source_document_assets (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  asset_key TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'external',
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(document_id, source_url)
);

CREATE INDEX IF NOT EXISTS idx_source_document_assets_document ON source_document_assets(document_id, sort_order);

CREATE TABLE IF NOT EXISTS source_document_fragments (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  content TEXT NOT NULL,
  UNIQUE(document_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_source_document_fragments_document ON source_document_fragments(document_id, sort_order);

INSERT OR IGNORE INTO navigation_items (id, tab, label, group_name, sort_order, enabled, admin_only, updated_at)
VALUES ('nav-source-documents', 'source_documents', '作物病虫害解决方案资料', '农药与产品资料', 55, 1, 0, '2026-08-24T00:00:00.000Z');
