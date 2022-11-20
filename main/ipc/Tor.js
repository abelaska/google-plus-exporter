/* eslint-disable import/no-extraneous-dependencies */
const { join, dirname } = require("path");
const { EOL, platform, arch } = require("os");
const { existsSync } = require("fs");
const net = require("net");
const EventEmitter = require("events");
const { spawn, execFile } = require("child_process");
const which = require("which");
const split = require("split");
const tmp = require("tmp");
const Store = require("electron-store");
const getPort = require("get-port");
const { ipcRenderer } = require("electron");
const isDev = require("../isDev");
const logger = require("../logger");

let globalTor;
let torBin;
let torAvailabilityChecked;

const store = new Store({
	name: "tor",
	encryptionKey: "XXX",
});

const isTorEnabled = () => store.get("isTorEnabled", "true") === "true";
const disableTor = () => store.set("isTorEnabled", "false");
const enableTor = () => store.set("isTorEnabled", "true");

const rnd = () => Math.random().toString(36).substring(2);

const whichAsync = async (app) =>
	new Promise((resolve, reject) => {
		which(app, (err, path) => {
			if (err) {
				return reject(err);
			}
			return resolve(path);
		});
	});

const whichTor = async () => {
	if (!torBin) {
		const os = platform();
		const ar = arch();
		const baseDir = join(isDev ? join(__dirname, "..") : __dirname, "tor");
		const osSuffix =
			os === "linux" || os === "win32"
				? (["ia32", "arm", "x32"].indexOf(ar) === -1 && "-64") || "-32"
				: "";
		const dir = join(baseDir, `tor.${os}${osSuffix}`);
		const tor = join(dir, os === "win32" ? "tor.exe" : "tor");
		torBin = existsSync(tor) ? tor : await whichAsync("tor");
	}
	return torBin;
};

const torExecOpts = () => {
	const libPath = dirname(torBin);
	return {
		cwd: libPath,
		env: Object.assign({}, process.env, {
			LD_LIBRARY_PATH: [process.env.LD_LIBRARY_PATH || "", libPath].join(":"),
			DYLD_LIBRARY_PATH: [process.env.DYLD_LIBRARY_PATH || "", libPath].join(
				":",
			),
		}),
	};
};

const hashPassword = async (pwd) =>
	new Promise((resolve, reject) => {
		execFile(
			torBin,
			["--hash-password", pwd],
			torExecOpts(),
			(err, stdout, stderr) => {
				if (err) {
					logger.error("Failed to hash Tor password", stderr);
					return reject(err);
				}
				resolve(stdout.split(EOL).find((l) => /^16:/.test(l)));
			},
		);
	});

const onceEvent = (ee, name) => {
	return new Promise((resolve) => {
		ee.once(name, resolve);
	});
};

const send = async (commands, port, host) =>
	new Promise((resolve, reject) => {
		let data = "";
		let socket = net.connect({ host, port }, () =>
			socket.write(`${commands.join("\n")}\n`),
		);

		const destroy = () => {
			try {
				if (socket) {
					socket.destroy();
				}
			} catch (ignore) {
				//
			} finally {
				socket = null;
			}
		};

		socket.on("data", (chunk) => {
			data += chunk.toString();
		});

		socket.on("error", (error) => {
			destroy();
			reject(error || "ControlPort communication error");
		});

		socket.on("end", () => {
			destroy();
			resolve(data);
		});
	});

class Tor extends EventEmitter {
	constructor({
		ps,
		socksHost = "127.0.0.1",
		socksPort,
		controlHost = "127.0.0.1",
		controlPort,
		controlPassword,
		dataDir,
	}) {
		super();
		this.id = `${socksHost}:${socksPort}`;
		this.isReady = false;
		this.isClosed = false;
		this.ps = ps;
		this.dataDir = dataDir;
		this.socksHost = socksHost;
		this.socksPort = socksPort;
		this.controlHost = controlHost;
		this.controlPort = controlPort;
		this.controlPassword = controlPassword;

		if (ipcRenderer) {
			ipcRenderer.send("renderer", {
				channel: "tor",
				message: { available: true, ready: false, enabled: isTorEnabled() },
			});
			ipcRenderer.send("message", { event: "spawn", pid: ps.pid });
		}

		ps.stderr
			.pipe(split())
			.on("data", (line) => logger.log(`Tor:${this.id}:ERROR`, line));

		ps.stdout.pipe(split()).on("data", (line) => {
			const match = line.match(/\[(.+)\] (.+)/);
			if (!match) {
				return;
			}
			const level = match[1];
			const msg = match[2];
			this.emit("log", { level, msg });
			this.emit(level, msg);

			logger.log(`Tor:${this.id}:${level} "${msg}"`);
		});

		/**
		 * Look for ready message
		 */
		this.on("notice", (msg) => {
			if (msg === "Bootstrapped 100%: Done") {
				this.isReady = true;
				this.emit("ready");

				if (ipcRenderer) {
					ipcRenderer.send("renderer", {
						channel: "tor",
						message: { available: true, ready: true, enabled: isTorEnabled() },
					});
				}
			}
		});

		ps.once("close", () => {
			this.isReady = false;
			this.isClosed = true;
		});
	}

	async waitForReady() {
		logger.log(`Tor ${this.id} waiting for ready...`);
		if (!this.isReady) {
			await onceEvent(this, "ready");
		}
		logger.log(`Tor ${this.id} is ready`);
		return true;
	}

	async close() {
		logger.log(`Closing Tor ${this.id} session...`);

		if (!this.isClosed) {
			this.ps.kill();
			await onceEvent(this.ps, "close");
			this.dataDir.removeCallback();
		}

		logger.log(`Tor ${this.id} session closed`);

		return true;
	}

	async sendControl(commands) {
		return send(commands, this.controlPort, this.controlHost);
	}

	async renewSession() {
		logger.log(`Renewing Tor ${this.id} session...`);

		const data = await this.sendControl([
			`authenticate "${this.controlPassword}"`, // authenticate the connection
			"signal newnym", // send the signal (renew Tor session)
			"quit", // close the connection
		]);

		const lines = data.split(EOL).slice(0, -1);
		// each response from the ControlPort should start with 250 (OK STATUS)
		const success = lines.every(
			(val) => val.length <= 0 || val.indexOf("250") >= 0,
		);

		if (!success) {
			logger.error(`Failed to renew Tor ${this.id} session... ${data}`);
			throw new Error(`Error communicating with Tor ControlPort\n${data}`);
		} else {
			logger.log(`Tor ${this.id} session renewed`);
		}
	}

	static async isAvailable() {
		if (!torAvailabilityChecked) {
			await whichTor();
			torAvailabilityChecked = true;
		}
		return !!torBin;
	}

	static async start() {
		if (!(await Tor.isAvailable())) {
			logger.warn("Tor application not found");
			return null;
		}

		const socksPort = await getPort();
		const controlPort = await getPort();
		const controlPassword = [rnd(), rnd()].join("");
		const dataDir = tmp.dirSync();

		const controlPasswordHash = await hashPassword(controlPassword);

		const ps = spawn(
			torBin,
			[
				"--SocksPort",
				socksPort,
				"--ControlPort",
				controlPort,
				"--DataDirectory",
				dataDir.name,
				"--HashedControlPassword",
				controlPasswordHash,
			],
			{ detached: false, ...torExecOpts() },
		);

		return new Tor({ ps, socksPort, controlPort, controlPassword, dataDir });
	}

	static async global() {
		if (!(await Tor.isAvailable())) {
			return null;
		}
		if (!globalTor) {
			globalTor = await Tor.start();
			await globalTor.waitForReady();
		}
		return globalTor;
	}
}

// const { request } = require('./request');
// const Agent = require('socks5-https-client/lib/Agent');
// (async () => {
// yarn electron main/ipc/Tor.js
// await whichTor();
// console.log(await hashPassword('heslo'));
//   // 0E6F584E-7D80-426A-8D30-A28B154C99A4 => 16:25B332348D045E6E60BE8794DE38D4D75B45745A859C7D98CEA48607A8
//   // console.log(`hash "${await hashPassword('0E6F584E-7D80-426A-8D30-A28B154C99A4')}"`);
//   const tor = await Tor.start();
//   tor.on('log', ({ level, msg }) => console.log(`TOR:${level}: ${msg}`));
//   tor.on('ready', () => console.log(`TOR:ready`));
//   tor.on('close', () => console.log(`TOR:close`));
//   await tor.waitForReady();
//   console.log('tor is ready');
//   await tor.waitForReady();
//   console.log('tor is ready2');
//   console.log(
//     await request({
//       url: 'https://api.ipify.org?format=json',
//       method: 'GET',
//       agentClass: Agent,
//       agentOptions: {
//         socksHost: tor.socksHost,
//         socksPort: tor.socksPort
//       }
//     })
//   );
//   await tor.renewSession();
//   console.log('tor session renewed');
//   console.log(
//     await request({
//       url: 'https://api.ipify.org?format=json',
//       method: 'GET',
//       agentClass: Agent,
//       agentOptions: {
//         socksHost: tor.socksHost,
//         socksPort: tor.socksPort
//       }
//     })
//   );
// })().catch(e => {
//   console.error(e);
// });

exports.Tor = Tor;
exports.disableTor = disableTor;
exports.enableTor = enableTor;
exports.isTorEnabled = isTorEnabled;
