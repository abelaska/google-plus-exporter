const unix = (d = new Date()) => Math.floor(d.valueOf() / 1000);

exports.unix = unix;
