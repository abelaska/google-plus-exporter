https://docs.google.com/document/d/1gOYJe61sI1GbO9qpFZJtwY3vdsZalsxtPgUnB2cvzAw/edit

https://www.laurivan.com/make-electron-work-with-sqlite3/
https://hackernoon.com/how-to-compile-node-js-code-using-bytenode-11dcba856fa9
https://medium.com/@annexare/bundle-es6-backend-for-electron-app-with-webpack-obfuscation-c1b77930c2d1

/usr/local/opt/sqlite/bin/sqlite3 "/Users/abelaska/Library/Application Support/Google+ Exporter/google-plus-exporter.db"

## Windows build of better-sqlite3

https://github.com/felixrieseberg/windows-build-tools
https://github.com/JoshuaWise/better-sqlite3/blob/HEAD/docs/troubleshooting.md
https://github.com/JoshuaWise/better-sqlite3/issues/170
https://github.com/JoshuaWise/better-sqlite3/issues/126

c:\...> npm install --global --production --add-python-to-path --vs2015 windows-build-tools
c:\...> npm install --global yarn
c:\...> yarn build:win

## Remove column from db table

-- CREATE TABLE new_post(
-- id TEXT NOT NULL,
-- feedId TEXT NOT NULL,
-- downloadedAt TEXT NOT NULL,
-- createdAt TEXT NOT NULL,
-- isPublic INTEGER NOT NULL,
-- json TEXT NOT NULL,
-- PRIMARY KEY(id, feedId),
-- FOREIGN KEY(feedId) REFERENCES feed
-- );
-- INSERT INTO new_post(id,feedId,downloadedAt,createdAt,isPublic,json) SELECT id,feedId,downloadedAt,createdAt,isPublic,json FROM post;
-- DROP INDEX idx_post_feedIdisPublic;
-- DROP TABLE post;
-- ALTER TABLE new_post RENAME TO post;
-- CREATE INDEX IF NOT EXISTS idx_post_feedIdisPublic ON post(feedId, isPublic);

## Windows Build

1. start virtualbox machine "MSEdge - Win10"
2. run these command on command line:
   c:\> cd y:
   y:\> rm -rf yarn.lock node_modules
   y:\> yarn
   y:\> yarn build:win

You can manually download the electron distribution zip file to %APPLOCALDATA%/Local/electron/Cache

## Linux Build

```
$ sh scripts/build-linux.sh
```

## Tor Test

```
docker run --rm -ti \
 --env ELECTRON_CACHE="/root/.cache/electron" \
 --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
 -v ${PWD}:/project \
 electronuserland/builder:wine /bin/bash

# apt-get update -y && apt-get install --no-install-recommends -y -q libxss-dev && rm -rf node_modules yarn.lock && yarn && yarn electron main/ipc/Tor.js
```
