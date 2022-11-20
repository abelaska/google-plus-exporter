const mkdirp = require('mkdirp');
const { join } = require('path');
const { readFileSync, writeFileSync } = require('fs');

const distDir = join(__dirname, '..', 'dist');

const { version } = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), { encoding: 'utf8' }));

mkdirp.sync(distDir);

writeFileSync(join(distDir, 'latest.txt'), version, { encoding: 'utf8' });
