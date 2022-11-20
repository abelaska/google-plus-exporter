const requestretry = require('requestretry');

// set delay of retry to a random number between 2000 and 10000 ms
const randomDelayStrategy = () => Math.floor(Math.random() * (10000 - 2000 + 1) + 2000);

exports.request = opts =>
  requestretry({
    fullResponse: false,
    maxAttempts: 10,
    retryStrategy: requestretry.RetryStrategies.HTTPOrNetworkError,
    delayStrategy: randomDelayStrategy,
    ...opts
  });
