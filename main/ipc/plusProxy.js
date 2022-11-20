const Sema = require('async-sema');
const Agent = require('socks5-https-client/lib/Agent');
const Bottleneck = require('bottleneck');
const isString = require('lodash/isString');
const { request } = require('./request');
const { Tor, isTorEnabled } = require('./Tor');
const logger = require('../logger');

const maxTors = 1;
const maxReqsPerSec = 0.3;
const maxConcurrentReqs = 1;

let torIndex = 0;
const tors = [];
const torSem = new Sema(1);

const timeout = 4 * 60 * 1000;

const headers = {
  Accept: '*/*',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0.3 Safari/605.1.15'
};

const limiter = new Bottleneck({
  minTime: Math.ceil(1000 / maxReqsPerSec),
  maxConcurrent: maxConcurrentReqs
});

limiter.on('error', error => logger.error('limiter error', error.stack || error));

limiter.on('failed', (error, jobInfo) => logger.error('limiter failed', error.stack || error, 'jobInfo', jobInfo));

limiter.on('retry', (error, jobInfo) => logger.error('limiter retry', error.stack || error, 'jobInfo', jobInfo));

// limiter.on('empty', () => logger.log('limiter empty'));

// limiter.on('idle', () => logger.log('limiter idle'));

limiter.on('dropped', dropped => logger.warn('limiter dropped', dropped));

// limiter.on('depleted', empty => logger.log('limiter depleted', empty));

// limiter.on('debug', (message, data) => logger.log('limiter debug', message, data));

const val = (...args) => {
  // var args = Array.prototype.slice.call(arguments);
  if (!args || args.length < 2) {
    return null;
  }
  let idx;
  let arr = args.shift();
  if (!arr || !arr.length) {
    return null;
  }
  do {
    idx = args.shift();
    if (arr && (isString(idx) || arr.length > idx)) {
      arr = arr[idx];
    } else {
      return null;
    }
  } while (args.length);
  return arr;
};

const checkInvalidReply = async (input, tor) => {
  if (!input || input.indexOf('https://www.google.com/sorry/index?') === -1) {
    return;
  }
  if (tor && tor.isReady) {
    await tor.renewSession();
    // wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10 * 1000));
  }

  throw Object.assign(
    new Error(
      'Unexpected Google+ response. We suggest to try again later or try from a different IP address (use a VPN or torproject.org).'
    ),
    {
      code: 'invalid_reply'
    }
  );
};

const responseParser = async (input, tor) => {
  if (!input || input.length < 10) {
    return null;
  }
  // eslint-disable-next-line
  const match = input.match(/^\)\]\}\'\n\n(\d+)\n/);
  if (match) {
    const prefixLen = match[0].length;
    const bodyLen = parseInt(match[1], 10);
    const body = input.substring(prefixLen, prefixLen + bodyLen - 1);
    try {
      return JSON.parse(body);
    } catch (e) {
      logger.error('Failed to parse G+ response', e);
    }
  } else {
    logger.error('Invalid G+ response', input);
    await checkInvalidReply(input, tor);
  }
  return null;
};

const responseParserAdvanced = async (input, { tor, fullBlocks } = {}) => {
  // eslint-disable-next-line
  if (!input || input.length < 10 || !/^\)\]\}\'\n\n(\d+)\n/.test(input)) {
    await checkInvalidReply(input, tor);
    return null;
  }

  let offs = 6;

  const readLen = () => {
    let ch;
    let len = '';
    while (offs < input.length) {
      ch = input.charAt(offs++);
      if (ch === '\n') {
        return parseInt(len, 10) - 1;
      }
      if (/[0-9]+/.test(ch)) {
        len += ch;
      } else {
        throw new Error('Invalid format');
      }
    }
    return 0;
  };

  const readBlock = () => {
    const len = readLen();
    if (len < 1) {
      return null;
    }
    const block = input.substring(offs, offs + len);
    offs += len;
    return block;
  };

  const extractBlock = block => {
    const type = val(block, 0, 0);
    if (['af.adr', 'af.mdr'].indexOf(type) > -1) {
      const o = type === 'af.adr' ? val(block, 0, 2) : val(block, 0, 1);
      if (o) {
        const k = Object.keys(o);
        if (k.length) {
          return { blockId: k[0], blockObj: o };
        }
      }
    }
    return null;
  };

  let blocks = {};
  const multiBlocks = {};
  let block;
  let notFound = false;
  do {
    block = readBlock();
    if (!block) {
      break;
    }
    try {
      block = JSON.parse(block);
    } catch (e) {
      console.error('Failed to parse response block', e);
    }
    const { blockId, blockObj } = extractBlock(block) || {};
    if (blockId) {
      if (fullBlocks) {
        blocks[blockId] = block;
      } else {
        blocks = Object.assign(blocks, blockObj);
      }
      multiBlocks[blockId] = multiBlocks[blockId] || [];
      multiBlocks[blockId].push(blockObj[blockId]);
    } else if (val(block, 0, 0) === 'er' && val(block, 0, 5) === 404) {
      notFound = true;
    }
  } while (block);

  return { blocks, multiBlocks, notFound };
};

const getTor = async () => {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }
  if (!(await Tor.isAvailable())) {
    return null;
  }
  await torSem.acquire();
  try {
    let tor;
    if (tors.length < maxTors) {
      tor = await Tor.start();
      if (tor) {
        await tor.waitForReady();
        tors.push(tor);
        logger.log(`Started tor ${tors.length}. ${tor.id}`);
      }
    } else {
      torIndex = (torIndex + 1) % tors.length;
      tor = tors[torIndex];
      logger.log(`Using tor ${torIndex} ${tor.id}`);
    }
    return tor;
  } finally {
    torSem.release();
  }
};

const useProxy = async () => {
  const tor = isTorEnabled() && (await getTor());
  const proxy = tor && {
    agentClass: Agent,
    agentOptions: {
      socksHost: tor.socksHost,
      socksPort: tor.socksPort
    }
  };
  return { tor, proxy };
};

const plusCall = async ({ advanced, fullBlocks, ...options }) => {
  let tries = 3;
  let error;
  do {
    try {
      const { tor, proxy } = await useProxy(); //eslint-disable-line
      //eslint-disable-next-line
      const body = await request({
        ...options,
        headers: {
          ...(options.headers || null),
          ...headers
        },
        timeout,
        ...proxy
      });
      //eslint-disable-next-line
      return advanced ? await responseParserAdvanced(body, { tor, fullBlocks }) : await responseParser(body, tor);
    } catch (e) {
      error = e;
      if (e.code !== 'invalid_reply') {
        break;
      }
    }
  } while (--tries > 0);
  throw error || new Error('Plus call failure');
};

const rateLimitedPlusCall = limiter.wrap(plusCall);

const plusProxy = async options => rateLimitedPlusCall(options);

exports.plusProxy = plusProxy;
exports.val = val;
