/* eslint-disable import/no-extraneous-dependencies */
const { existsSync, writeFileSync } = require("fs");
const { join } = require("path");
const makeDir = require("make-dir");
const { app, remote } = require("electron");
const Store = require("electron-store");

const store = new Store({
	name: "paths",
	encryptionKey: "XXX",
});

const ap = (remote && remote.app) || app;
const userDataDir = (ap && ap.getPath("userData")) || "/tmp";

const exportPath = () =>
	store.get("export-path", join(userDataDir, "google-plus-exports"));
const exportKeepFilename = () => join(exportPath(), ".keep");

const imagesPath = () =>
	store.get("images-path", join(userDataDir, "google-plus-images"));
const imagesKeepFilename = () => join(imagesPath(), ".keep");

const videosPath = () =>
	store.get("videos-path", join(userDataDir, "google-plus-videos"));
const videosKeepFilename = () => join(videosPath(), ".keep");

const createImagesPath = () => {
	const fn = imagesKeepFilename();
	const dir = imagesPath();
	if (!existsSync(fn)) {
		if (!existsSync(dir)) {
			makeDir.sync(dir);
		}
		writeFileSync(fn, "");
	}
};

const createVideosPath = () => {
	const fn = videosKeepFilename();
	const dir = videosPath();
	if (!existsSync(fn)) {
		if (!existsSync(dir)) {
			makeDir.sync(dir);
		}
		writeFileSync(fn, "");
	}
};

const createExportPath = () => {
	const fn = exportKeepFilename();
	const dir = exportPath();
	if (!existsSync(fn)) {
		if (!existsSync(dir)) {
			makeDir.sync(dir);
		}
		writeFileSync(fn, "");
	}
};

const changeImagesPath = (newPath) => {
	store.set("images-path", newPath);
	createImagesPath();
};

const changeVideosPath = (newPath) => {
	store.set("videos-path", newPath);
	createVideosPath();
};

const changeExportPath = (newPath) => {
	store.set("export-path", newPath);
	createExportPath();
};

const createPaths = () => {
	createExportPath();
	createImagesPath();
	createVideosPath();
};

const hashToDir = (h) => join(h.substr(0, 2), h.substr(2, 2), h.substr(4, 2));

exports.exportKeepFilename = exportKeepFilename;
exports.imagesKeepFilename = imagesKeepFilename;
exports.videosKeepFilename = videosKeepFilename;
exports.userDataDir = userDataDir;
exports.exportPath = exportPath;
exports.createPaths = createPaths;
exports.imagesPath = imagesPath;
exports.videosPath = videosPath;
exports.changeImagesPath = changeImagesPath;
exports.changeVideosPath = changeVideosPath;
exports.changeExportPath = changeExportPath;
exports.hashToDir = hashToDir;
