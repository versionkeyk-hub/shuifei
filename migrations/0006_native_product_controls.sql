CREATE TABLE IF NOT EXISTS native_price_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS native_price_entries (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES native_price_profiles(id) ON DELETE CASCADE,
  specification_id TEXT NOT NULL REFERENCES legacy_product_specs(id) ON DELETE CASCADE,
  price REAL NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(profile_id, specification_id)
);

CREATE INDEX IF NOT EXISTS idx_native_price_profiles_user ON native_price_profiles(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_native_price_entries_profile ON native_price_entries(profile_id);
