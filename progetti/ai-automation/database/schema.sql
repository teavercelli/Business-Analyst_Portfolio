CREATE TABLE IF NOT EXISTS invoice_results (
  invoice_id TEXT PRIMARY KEY,
  supplier TEXT NOT NULL,
  total REAL NOT NULL,
  issue TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  processed_at TEXT DEFAULT CURRENT_TIMESTAMP
);
