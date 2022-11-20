const { join } = require('path');
const v8 = require('v8');
const bytenode = require('bytenode');

v8.setFlagsFromString('--no-lazy');

bytenode.compileFile(join(__dirname, '..', 'main', 'out', 'main.js'));

process.exit(0);
