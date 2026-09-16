CREATE TABLE opinions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL
    CHECK (length(trim(nickname)) BETWEEN 1 AND 20),
  content TEXT NOT NULL
    CHECK (length(trim(content)) BETWEEN 1 AND 300),
  status TEXT NOT NULL DEFAULT 'visible'
    CHECK (status IN ('visible', 'hidden')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_opinions_status_created_at
ON opinions(status, created_at DESC);
