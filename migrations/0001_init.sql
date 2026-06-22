-- Timmies Passport — schema
-- The app is fully local-first; these tables back optional accounts,
-- cloud sync, global check-in counts, and leaderboards.

CREATE TABLE IF NOT EXISTS locations (
  id            TEXT PRIMARY KEY,        -- e.g. "n10057137320"
  osm_id        TEXT,
  name          TEXT NOT NULL,
  lat           REAL NOT NULL,
  lng           REAL NOT NULL,
  address       TEXT DEFAULT '',
  city          TEXT DEFAULT '',
  region        TEXT DEFAULT '',
  country       TEXT DEFAULT '',
  country_code  TEXT DEFAULT '',
  check_in_count INTEGER NOT NULL DEFAULT 0  -- distinct authenticated check-ins
);
CREATE INDEX IF NOT EXISTS idx_locations_cc ON locations(country_code);
CREATE INDEX IF NOT EXISTS idx_locations_count ON locations(check_in_count DESC);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- "salt:hash" PBKDF2 (Web Crypto)
  display_name  TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,           -- opaque session token
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS visits (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  visited_at  TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',  -- private to the user
  PRIMARY KEY (user_id, location_id)
);
CREATE INDEX IF NOT EXISTS idx_visits_user ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_location ON visits(location_id);
