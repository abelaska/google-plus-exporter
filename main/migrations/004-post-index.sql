-- Up
-- CREATE INDEX IF NOT EXISTS idx_post_feedIdisPublicAuthorId ON post(feedId, isPublic, authorId);
DROP INDEX IF EXISTS idx_post_feedIdisPublic;

-- Down
