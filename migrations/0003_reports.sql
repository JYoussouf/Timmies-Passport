-- Rate-limiting ledger for the in-app report form. Deliberately holds no
-- report content and no address: just a salted hash and a timestamp, which is
-- all a per-hour cap needs. The reports themselves live in GitHub issues.
CREATE TABLE IF NOT EXISTS reports (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	reporter_key TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_key_time ON reports (reporter_key, created_at);
