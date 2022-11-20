/* eslint-disable import/no-extraneous-dependencies, global-require */

const { join } = require("path");
const { format } = require("url");
const os = require("os").platform();
const { download } = require("electron-dl");
const { Menu, app, ipcMain, powerSaveBlocker, shell } = require("electron");
const prepareNext = require("electron-next");
const { captureException } = require("./reporting");
const {
	plusUrl,
	listenPlusDetection,
	startPlusDetection,
	plusLogout,
	closePlusWindows,
} = require("./plus");
const {
	getMainWindow,
	createMainWindow,
	sendToMainWindow,
	closeMainWindow,
} = require("./mainWindow");
const { ipc, startIpc, stopIpc } = require("./ipcProxy");
const logger = require("./logger");
const isDev = require("./isDev");

// https://blog.avocode.com/4-must-know-tips-for-building-cross-platform-electron-apps-f3ae9c2bffff

const port = 8000;
const icon = join(__dirname, "..", "icon.png");
const appUrl = isDev
	? `http://localhost:${port}/`
	: format({
			pathname: join(__dirname, "..", "renderer", "out", "index.html"),
			protocol: "file:",
			slashes: true,
	  });

// resi problem s net::ERR_INSUFFICIENT_RESOURCES kdy se nenacetli vsechny Google+ JS skripty
if (!os === "win32") {
	process.setFdLimit(8196);
}

powerSaveBlocker.start("prevent-app-suspension");

// https://github.com/electron/electron/issues/4925
app.commandLine.appendSwitch("disable-renderer-backgrounding");

const close = () => {
	logger.log("Closing application...");
	closeMainWindow();
	closePlusWindows();
	stopIpc();
	try {
		app.quit();
	} catch (ignore) {
		//
	}
};

// Quit the app once all windows are closed
app.on("window-all-closed", close);

listenPlusDetection();

const killPids = [];

process.on("exit", () => {
	logger.log("Exiting application...");
	killPids.forEach((pid) => {
		logger.log(`Killing subprocess ${pid}`);
		process.kill(pid);
	});
});

ipcMain.on("renderer", (ev, { channel, message }) =>
	sendToMainWindow(channel, message),
);
ipcMain.on("message", async (ev, message) => {
	const { event, initial } = message;
	try {
		if (event === "spawn" && message.pid) {
			killPids.push(message.pid);
		}
		if (event === "start-update-download") {
			const { updateUrl } = message;
			sendToMainWindow("app", { event: "update-download-started" });
			return download(getMainWindow(), updateUrl, {
				onProgress: (percent) =>
					sendToMainWindow("app", {
						event: "update-download-progress",
						percent: Math.ceil(percent * 100),
					}),
			})
				.then((dl) => {
					sendToMainWindow("app", { event: "update-download-finished" });
					shell.showItemInFolder(dl.getSavePath());
				})
				.catch((error) => {
					logger.error("Update download failed", error);
					sendToMainWindow("app", { event: "update-download-failed", error });
				});
		}

		if (event === "plus-logout") {
			return plusLogout();
		}

		if (event === "plus-detection-start") {
			return startPlusDetection(initial);
		}

		return await ipc.handleMessage(message);
	} catch (e) {
		logger.error("MAIN message processing failure", e.stack);
		captureException(e);
		sendToMainWindow("app", {
			event: "error",
			error: { message: e.toString() },
		});
	}
});

// Prepare the renderer once the app is ready
app.on("ready", async () => {
	try {
		// await dbSaveCollection({
		//   accountId: '103778702993142591484',
		//   id: '0effTB',
		//   url: 'https://plus.google.com/collection/0effTB',
		//   name: 'My Aviation Lifestyle Logbook',
		//   image:
		//     'https://lh3.googleusercontent.com/oo6P3Sfwvj0ZUj9XXi9UVq9tHdG4H2_vlJpMPCoihpz20IXnywFhjBe4bVzumi_gqsxs9egq=s0',
		//   type: 'PUBLIC'
		// });
		// dbBatchPosts(
		//   {
		//     accountId: '103778702993142591484'
		//     // collectionId: '4wGbV'
		//   },
		//   async ({ posts, feeds, page, pages }) => {
		//     logger.log('posts', posts.length, 'page', page, 'pages', pages);
		//     logger.log('feeds', feeds);
		//   },
		//   { batchSize: 100, exportPrivatePosts: false }
		// );
		// await exportAccountToWordPress({ accountId: '103778702993142591484' }, { exportComments: true, wpVersion: 4 });
		// await exportAccountToBlogger({ accountId: '103778702993142591484' }, { exportComments: true });
		// await exportAccountToJson({ accountId: '103778702993142591484' }, { exportComments: true });
		// logger.log('exported');
		// app.quit();

		await prepareNext("./renderer", port);
		await startIpc();

		const mainWindow = await createMainWindow({
			width: isDev ? 1600 : 1200,
			height: 800,
			icon,
			center: true,
			resizable: true,
			show: true,
			webPreferences: { webSecurity: false },
		});

		const loadAppOnGooglePlus = (event, url) => {
			const isPlusGoogle = url.indexOf(plusUrl) === 0;
			if (isPlusGoogle) {
				event.preventDefault();
				mainWindow.loadURL(appUrl);
			}
		};

		mainWindow.webContents.setBackgroundThrottling(false);
		mainWindow.webContents.on("did-navigate-in-page", loadAppOnGooglePlus);
		mainWindow.webContents.on("will-navigate", loadAppOnGooglePlus);

		const editableContextMenu = Menu.buildFromTemplate([
			{ label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
			{ label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
			{ type: "separator" },
			{ label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
			{ label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
			{ label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
			{
				label: "Select All",
				accelerator: "CmdOrCtrl+A",
				selector: "selectAll:",
			},
		]);

		mainWindow.webContents.on("context-menu", (e, props) => {
			if (props.isEditable) {
				editableContextMenu.popup(mainWindow);
			}
		});

		if (isDev) {
			mainWindow.webContents.openDevTools();
		}
		mainWindow.loadURL(appUrl);

		Menu.setApplicationMenu(
			Menu.buildFromTemplate([
				{
					label: app.getName(),
					submenu: [
						...(os === "darwin"
							? [
									{ role: "about" },
									{ type: "separator" },
									{ role: "hide" },
									{ role: "hideothers" },
									{ role: "unhide" },
									{ type: "separator" },
							  ]
							: []),
						{ role: "quit", click: close },
						// { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
					],
				},
				{
					label: "Edit",
					submenu: [
						{ label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
						{
							label: "Redo",
							accelerator: "Shift+CmdOrCtrl+Z",
							selector: "redo:",
						},
						{ type: "separator" },
						{ label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
						{ label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
						{ label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
						{
							label: "Select All",
							accelerator: "CmdOrCtrl+A",
							selector: "selectAll:",
						},
					],
				},
				{
					role: "help",
					submenu: [
						{ type: "separator" },
						{
							label: "Learn More",
							click: () =>
								shell.openExternal("https://medium.com/google-plus-exporter"),
						},
						{
							label: "Download Page",
							click: () =>
								shell.openExternal("https://gplus-exporter.friendsplus.me/"),
						},
					],
				},
			]),
		);

		if (os === "darwin") {
			app.dock.setIcon(icon);
		}
	} catch (e) {
		captureException(e);
		sendToMainWindow("app", {
			event: "error",
			error: { message: e.toString() },
		});
	}
});
