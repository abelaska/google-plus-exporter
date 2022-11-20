/* eslint-disable import/no-extraneous-dependencies, global-require */
const { app } = require("electron");
const PlusSession = require("./PlusSession");
const { dbOpen } = require("./db");

dbOpen();

// const publicId = ['+EricLiensMind', 'bpXUtQFv5nJ'];
// const publicId = ['116995257251567694736', 'Zq2Cncfb6xA'];
const publicId = ["100191047182984055447", "X5xPYcBiCGa"];

app.on("ready", async () => {
	const sess = new PlusSession();
	// const r = await sess.listPostComments(publicId);
	// console.log('1comments', r.comments.length, JSON.stringify(r.comments, null, 2));

	// // const posts = [{ id: 'z12hyzdy1mrujr5ik04civ0h3kaei1qwpbw' }];
	// const posts = [{ id: 'z12xzjupwymntxvxn04celqhwlusgfawyk00k' }];
	// await sess.listPostsComments(posts);

	// console.log('2comments', posts[0].comments.length, JSON.stringify(posts[0].comments, null, 2));

	// const images = await sess.listAlbumPhotos(
	//   'https://plus.google.com/photos/105237212888595777019/album/5999658280921050609' // 500
	//   // 'https://plus.google.com/photos/107022061436866576067/album/5955148618550996593' // 443
	//   // 'https://plus.google.com/photos/104306069639654561550/album/6653378570975793089?authkey=XXX' // 30
	//   // 'https://plus.google.com/photos/109419746396071460928/album/6653675227167991793?authkey=XXX'
	//   // 'https://plus.google.com/photos/100817211548713875249/albums/6301271294115098033?authkey=XXX'
	// );
	// console.log('images', images.length, images);

	const posts = [{ id: "z12iunkwuob0zvb5504ccbypyresyv4brbs" }];
	await sess.listPostsComments(posts);
	console.log(
		"comments",
		posts[0].comments.length,
		JSON.stringify(posts[0].comments, null, 2),
	);

	// const images = await sess.listAlbumPhotos(
	//   'https://plus.google.com/photos/107157661405299127825/albums/6334719775306139201'
	// );
	// console.log('images', images.length, images);

	app.quit();
});
