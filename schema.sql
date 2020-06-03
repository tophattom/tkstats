CREATE TABLE IF NOT EXISTS gyms(
  id INTEGER PRIMARY KEY ASC,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS visitor_counts(
  id INTEGER PRIMARY KEY ASC,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  count INTEGER NOT NULL,
  gym_id INTEGER,
  FOREIGN KEY(gym_id) REFERENCES gyms(id)
);

CREATE INDEX index_visitor_counts_on_gym_id ON visitor_counts(gym_id);
