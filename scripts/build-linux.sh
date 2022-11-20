#!/bin/bash
#
# -ti
env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS_TAG|TRAVIS|TRAVIS_REPO_|TRAVIS_BUILD_|TRAVIS_BRANCH|TRAVIS_PULL_REQUEST_|APPVEYOR_|CSC_|GH_|GITHUB_|BT_|AWS_|STRIP|BUILD_' > /tmp/envfile

#  -v ${PWD##*/}-node-modules:/project/node_modules \
#  -v /usr/local/Cellar/node:/usr/local/Cellar/node:ro \
#  -v ~/.cache/electron:/root/.cache/electron \
#  -v ~/.cache/electron-builder:/root/.cache/electron-builder \

docker run --rm -t \
 --env-file /tmp/envfile \
 --env ELECTRON_CACHE="/root/.cache/electron" \
 --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
 -v "`pwd`:/project" \
 electronuserland/builder:wine /bin/bash -c 'apt-get update -y && apt-get install --no-install-recommends -y -q libxss-dev && rm -rf node_modules yarn.lock && yarn && yarn build:linux'
rm -f /tmp/envfile
# rm -rf /tmp/envfile node_modules yarn.lock
# yarn
# yarn rebuild