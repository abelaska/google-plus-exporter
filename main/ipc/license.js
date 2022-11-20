const cloneDeep = require("lodash/cloneDeep");
const Store = require("electron-store");
const { machineId } = require("node-machine-id");
const { captureException } = require("../reporting");
const { request } = require("./request");
const { toRenderer } = require("./messaging");

const licenseUrl =
	"https://google-plus-exporter-license-dot-fpm-application.appspot.com";
const FREE_LICENSE_NAME = "FREE";

const store = new Store({
	name: "license",
	encryptionKey: "XXX",
});

const freeLicenceLimits = {
	postsPerFeed: 800,
};

const premiumLicenceLimits = {
	postsPerFeed: -1,
};

let detectedDeviceId;
let isLicenseVerified = false;

const getDeviceId = async () => {
	if (!detectedDeviceId) {
		detectedDeviceId = await machineId();
	}
	return detectedDeviceId;
};

const callLicense = async (op, licenseKey) =>
	request({
		method: "POST",
		url: `${licenseUrl}${op}`,
		json: true,
		timeout: 20000,
		body: { licenseKey, deviceId: await getDeviceId() },
	});

const currentLicense = () => {
	const license = isLicenseVerified
		? store.get("license", FREE_LICENSE_NAME)
		: FREE_LICENSE_NAME;
	const isLimitReached = store.get("is-limit-reached", "false") === "true";
	const isFree = license === FREE_LICENSE_NAME;
	const limits = cloneDeep(isFree ? freeLicenceLimits : premiumLicenceLimits);
	return { license, isFree, limits, isLimitReached };
};

const licenseLimitReached = () => store.set("is-limit-reached", "true");

const activateLicense = async (license) => {
	let success = false;
	let error;
	try {
		toRenderer("license", { event: "activation-begin" });

		const reply = await callLicense("/activate", license);
		// console.log('license activate reply', JSON.stringify(reply));
		error = reply.error;

		if (reply.ok) {
			store.set("license", license);
			store.set("is-limit-reached", "false");
			isLicenseVerified = true;
		}

		success = true;
	} catch (e) {
		isLicenseVerified = false;
		captureException(e);
	} finally {
		toRenderer("license", {
			event: "activation-end",
			success,
			error,
			...currentLicense(),
		});
	}
};

const verifyLicense = async () => {
	const license = store.get("license", FREE_LICENSE_NAME);
	const isFree = license === FREE_LICENSE_NAME;
	let success = false;
	let error;

	isLicenseVerified = false;

	try {
		toRenderer("license", { event: "verification-begin" });

		if (isFree) {
			isLicenseVerified = true;
		} else {
			const reply = await callLicense("/verify", license);
			// console.log('license verify reply', JSON.stringify(reply));
			if (reply.ok) {
				isLicenseVerified = true;
			}
			error = reply.error;
		}

		success = true;
	} catch (e) {
		captureException(e);
	} finally {
		toRenderer("license", {
			event: "verification-end",
			success,
			error,
			...currentLicense(),
		});
	}
};

exports.activateLicense = activateLicense;
exports.verifyLicense = verifyLicense;
exports.currentLicense = currentLicense;
exports.licenseLimitReached = licenseLimitReached;
