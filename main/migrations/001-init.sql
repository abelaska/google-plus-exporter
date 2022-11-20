-- Up
CREATE TABLE IF NOT EXISTS googleaccount(
  id TEXT PRIMARY KEY ASC,
  name TEXT NOT NULL,
  email TEXT,
  image TEXT
);

CREATE TABLE IF NOT EXISTS account(
  id TEXT PRIMARY KEY ASC,
  googleAccountId TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  type TEXT CHECK( type IN ('PROFILE','PAGE') ) NOT NULL,
  FOREIGN KEY(googleAccountId) REFERENCES googleaccount
);
CREATE INDEX IF NOT EXISTS idx_account_nameASC ON account(name ASC);

CREATE TABLE IF NOT EXISTS collection(
  id TEXT PRIMARY KEY ASC,
  accountId TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  type TEXT CHECK( type IN ('PUBLIC','MYCIRCLES','PRIVATE', 'UNKNOWN') ) NOT NULL,
  FOREIGN KEY(accountId) REFERENCES account
);
CREATE INDEX IF NOT EXISTS idx_collection_accountIdNameASC ON collection(accountId, name ASC);

CREATE TABLE IF NOT EXISTS community(
  id TEXT PRIMARY KEY ASC,
  accountId TEXT NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  image TEXT,
  membersCount INTEGER,
  membership TEXT CHECK( membership IN ('OWNER','MODERATOR','MEMBER','UNKNOWN') ) NOT NULL,
  FOREIGN KEY(accountId) REFERENCES account
);
CREATE INDEX IF NOT EXISTS idx_community_accountIdNameASC ON community(accountId, name ASC);

CREATE TABLE IF NOT EXISTS communitystream(
  id TEXT PRIMARY KEY ASC,
  accountId TEXT NOT NULL,
  communityId TEXT NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY(accountId) REFERENCES account,
  FOREIGN KEY(communityId) REFERENCES community
);
CREATE INDEX IF NOT EXISTS idx_communitystream_communityId ON communitystream(communityId);

CREATE TABLE IF NOT EXISTS feed(
  id TEXT PRIMARY KEY ASC,
  accountId TEXT,
  collectionId TEXT,
  communityId TEXT,
  communityStreamId TEXT,
  type TEXT CHECK( type IN ('ACCOUNT','COLLECTION','COMMUNITYSTREAM') ) NOT NULL,
  FOREIGN KEY(accountId) REFERENCES account,
  FOREIGN KEY(collectionId) REFERENCES collection,
  FOREIGN KEY(communityId) REFERENCES community,
  FOREIGN KEY(communityStreamId) REFERENCES communitystream,
  UNIQUE (accountId, collectionId, communityId, communityStreamId)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feed ON feed(accountId, collectionId, communityId, communityStreamId);
CREATE INDEX IF NOT EXISTS idx_feed_communityId ON feed(communityId);

CREATE TABLE IF NOT EXISTS post(
  id TEXT NOT NULL,
  feedId TEXT NOT NULL,
  downloadedAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  isPublic INTEGER NOT NULL,
  commentsCount INTEGER NOT NULL,
  json TEXT NOT NULL,
  PRIMARY KEY(id, feedId),
  FOREIGN KEY(feedId) REFERENCES feed
);
CREATE INDEX IF NOT EXISTS idx_post_feedIdisPublic ON post(feedId, isPublic);

-- Down
