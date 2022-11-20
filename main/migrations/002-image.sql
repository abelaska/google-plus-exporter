-- Up
CREATE TABLE IF NOT EXISTS comment(
  id TEXT NOT NULL,
  postId TEXT NOT NULL,
  feedId TEXT NOT NULL,
  downloadedAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  json TEXT NOT NULL,
  PRIMARY KEY(id, feedId),
  FOREIGN KEY(feedId) REFERENCES feed,
  FOREIGN KEY(feedId, postId) REFERENCES post(feedId, id)
);
CREATE INDEX IF NOT EXISTS idx_comment_feedId_postId_createdAtASC ON comment(feedId, postId, createdAt ASC);

CREATE TABLE IF NOT EXISTS image(
  id TEXT NOT NULL,
  url TEXT NOT NULL,
  -- 0=REGISTERED, 1=DOWNLOADED
  state INTEGER CHECK( state IN (0, 1) ) NOT NULL DEFAULT 0,
  size INTEGER NOT NULL DEFAULT 0,
  ext TEXT,
  PRIMARY KEY(id)
);
CREATE INDEX IF NOT EXISTS idx_image_state ON image(state);

-- Down
