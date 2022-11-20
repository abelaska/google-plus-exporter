const unhandled = require("electron-unhandled");
const Sentry = require("@sentry/electron");
const logger = require("./logger");
const isDev = require("./isDev");

if (!isDev) {
	Sentry.init({
		dsn: "https://XXX@sentry.io/XXX",
		captureUnhandledRejections: true,
		release: process.env.VERSION || "dev",
		environment: isDev ? "development" : "production",
	});
}

const captureException = (error) => {
	const errMsg = (error && error.toString().toLowerCase()) || "";
	const ignoreError =
		errMsg.indexOf("unexpected google+ response") > -1 ||
		errMsg.indexOf(`cannot read property 'length' of undefined`) > -1;
	if (isDev || ignoreError) {
		logger.error((error && error.stack) || error);
	} else {
		Sentry.captureException(error || new Error("Unknown error"));
	}
};

unhandled({ logger: captureException });

exports.captureException = captureException;
