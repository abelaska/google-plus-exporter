const { join } = require('path');
const { readFileSync, writeFileSync } = require('fs');

const { version } = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), { encoding: 'utf8' }));

writeFileSync(join(__dirname, '..', 'main', 'version.js'), `module.exports = '${version}';`, { encoding: 'utf8' });
