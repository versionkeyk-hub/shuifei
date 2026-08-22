CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);
