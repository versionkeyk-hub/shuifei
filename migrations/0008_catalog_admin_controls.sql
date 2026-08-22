CREATE TABLE IF NOT EXISTS pesticide_search_stats (
  component TEXT PRIMARY KEY,
  search_count INTEGER NOT NULL DEFAULT 0,
  select_count INTEGER NOT NULL DEFAULT 0,
  last_searched_at TEXT,
  last_selected_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pesticide_search_stats_rank
  ON pesticide_search_stats(search_count DESC, select_count DESC, last_selected_at DESC);

