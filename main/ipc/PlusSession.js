const bluebird = require("bluebird");
const urlParser = require("url");
const isFunction = require("lodash/isFunction");
const { fixImageUrl } = require("./image");
const { registerVideo } = require("./video");
const { captureException } = require("../reporting");
const { plusProxy, val } = require("./plusProxy");
// const logger = require('../logger');

const rePhotoAlbumurl =
	/https:\/\/plus\.google\.com\/photos\/([0-9]+)\/albums?\/([0-9]+)[?/]?/;
const reVideoExtensions = /\.(avi|mp4)$/i;

const CommunityMembership = {
	2: "OWNER",
	3: "MODERATOR",
	4: "MEMBER",
	//?: INVITED,
	//?: BANNED
};

const optimizeMessage = (msg) => {
	// 0 inline
	//   * bold [0, "The best use for Twitter: promoting Google+!", [true]]
	//   * italic [0, "CBS News,", [null, true]]
	//   * strikethrough? [0, "The best use for Twitter: promoting Google+!", [null,null,true]]
	// 1 new line
	// 2 is link attachment
	//   * [2, "http://www.friendsplus.me/logout", null, ["http://www.friendsplus.me/logout"]] => [2, "http://www.friendsplus.me/logout", "http://www.friendsplus.me/logout"]
	// 3 is mention
	//   *  [3, "Eli Fennell", null, null, [null, "110619855408549015935"]] => [3, "G Lensbower", "104038223546711151431"]
	// 4 is hashtag
	//   * [4, "#thanks", null, ["https://plus.google.com/s/%23thanks/posts"], null, ["thanks"]]
	return (msg || []).map((l) => {
		const t = val(l, 0);
		switch (t) {
			case 0:
				return val(l, 2)
					? [
							t,
							val(l, 1),
							{
								...(val(l, 2, 0) ? { bold: true } : null),
								...(val(l, 2, 1) ? { italic: true } : null),
								...(val(l, 2, 2) ? { strikethrough: true } : null),
							},
					  ]
					: [t, val(l, 1)];
			case 2:
			case 4:
				return [t, val(l, 1), val(l, 3, 0)];
			case 3:
				return [t, val(l, 1), val(l, 4, 1)];
			default:
				return l;
		}
	});
};

const extractPosts = async (type, rsp, { isSinglePost, plus }) => {
	const extractLink = async (p, linkType) => {
		p = val(p, 97, 8, linkType);
		const url = val(p, 0);
		const imageOriginal = await fixImageUrl(val(p, 1), "link");
		const title = val(p, 2);
		const description = val(p, 3);
		const imageProxy = await fixImageUrl(val(p, 5, 0), "link"); // prefix with https:
		return url
			? {
					url,
					title,
					description,
					...(imageOriginal || imageProxy
						? { image: { url: imageOriginal, proxy: imageProxy } }
						: null),
			  }
			: null;
	};
	const d = val(rsp, 0, 2, type, 0);
	const nextPageToken = val(d, 1);
	const postsArray = (
		isSinglePost ? [d] : (val(d, 7) || []).map((p) => val(p, 6, "33558957"))
	).filter((p) => p);
	const posts =
		(await bluebird.map(postsArray, async (p) => {
			const authorName = val(p, 3);
			const createdAt = val(p, 5);
			const id = val(p, 8);
			const authorId = val(p, 16);
			const authorImage = await fixImageUrl(val(p, 18), "user");
			// const message = val(p, 20);
			const publicId = (val(p, 21) || "").split("/posts/");
			const isPublic = val(p, 32);
			const plusses = val(p, 73, 16) || 0;
			const resharedPostId = val(p, 40);
			const resharedPostAuthorName = val(p, 44, 0);
			const resharedPostAuthorId = val(p, 44, 1);
			const resharedPostAuthorImage = await fixImageUrl(val(p, 44, 4), "user");
			const imageRawUrl = val(p, 97, 8, "40655821", 1) || undefined;
			const image = await fixImageUrl(imageRawUrl, "post");

			// community ["108569270224680870230","Friends+Me Users","Feature Requests","d46b1f87-eee3-4e56-a6d0-ebf1b5772fd1",0]
			const communityId = val(p, 108, 0);
			const communityName = val(p, 108, 1);
			const communityStreamName = val(p, 108, 2);
			const communityStreamId = val(p, 108, 3);
			const community = communityId && {
				id: communityId,
				name: communityName,
				stream: { id: communityStreamId, name: communityStreamName },
			};

			const postMessage = optimizeMessage(val(p, 137, 0));
			const resharePostMessage = optimizeMessage(val(p, 139, 0));
			const reshareMessage = resharedPostId ? postMessage : undefined;
			const message = resharedPostId
				? [].concat(
						resharePostMessage || [],
						resharePostMessage && resharePostMessage.length ? [[1], [1]] : [],
						[
							[
								0,
								`Originally shared by ${resharedPostAuthorName}`,
								{ bold: true },
							],
						],
						reshareMessage && reshareMessage.length ? [[1], [1]] : [],
						reshareMessage || [],
				  )
				: postMessage;

			const imagesField =
				val(p, 97, 8, "40842909", 41) ||
				val(p, 97, 1, "40842909", 41) ||
				undefined;
			let images =
				imagesField &&
				imagesField.length &&
				(
					await bluebird.map(imagesField, (i) =>
						fixImageUrl(
							val(i, 2, "40655821", 1) || val(i, 5, "40655821", 1),
							"post",
						),
					)
				)
					.filter((i) => i)
					.map((proxy) => ({ proxy }));

			const comments = await bluebird.map(val(p, 7) || [], async (c) => ({
				id: val(c, 4),
				createdAt: val(c, 3) && new Date(val(c, 3)).toISOString(),
				author: {
					name: val(c, 25, 0),
					id: val(c, 25, 1),
					image: await fixImageUrl(val(c, 25, 4), "user"),
				},
				plusses: val(c, 15, 16) || 0,
				message: optimizeMessage(val(c, 27, 0)),
			}));

			// 42397230 regular link
			// 41186541 same as link but for youtube video
			// 39748951 youtube, wistia, fb video, mp4 link, vimeo, soundcloud
			// 40154698 twitch
			const link =
				(await extractLink(p, "42397230")) ||
				(await extractLink(p, "41186541")) ||
				(await extractLink(p, "39748951")) ||
				(await extractLink(p, "40154698")) ||
				undefined;

			let video;
			let videos;
			const albumUrl = val(p, 97, 1);

			if (plus && link && link.url && rePhotoAlbumurl.test(link.url)) {
				const items = await plus.listAlbumItems(link.url);
				images = items
					.filter((i) => i.type === "image")
					.map(({ url: proxy }) => ({ proxy }));
				videos = items
					.filter((i) => i.type === "video")
					.map(({ url: proxy }) => ({ proxy }));
				video = (videos.length && videos[0]) || undefined;
			}

			if (plus && link && albumUrl && rePhotoAlbumurl.test(albumUrl)) {
				const items = await plus.listAlbumItems(albumUrl);
				images = items
					.filter((i) => i.type === "image")
					.map(({ url: proxy }) => ({ proxy }));
				videos = items
					.filter((i) => i.type === "video")
					.map(({ url: proxy }) => ({ proxy }));
				video = (videos.length && videos[0]) || undefined;
			}

			if (
				plus &&
				!link &&
				imageRawUrl &&
				reVideoExtensions.test(imageRawUrl.toLowerCase()) &&
				albumUrl &&
				rePhotoAlbumurl.test(albumUrl) &&
				!video
			) {
				video = await plus.listAlbumItem(albumUrl);
				if (video) {
					await registerVideo(albumUrl, video);
					video = { proxy: video };
				}
			}

			return {
				id,
				plusses,
				publicId,
				createdAt: createdAt && new Date(createdAt).toISOString(),
				isPublic,
				message,
				comments,
				community,
				link,
				...(image ? { image: { proxy: image } } : null),
				...(images ? { images } : null),
				...(video ? { video } : null),
				...(videos ? { videos } : null),
				author: {
					id: authorId,
					name: authorName,
					image: authorImage,
				},
				...(resharedPostId
					? {
							reshare: {
								id: resharedPostId,
								message: reshareMessage,
								author: {
									id: resharedPostAuthorId,
									name: resharedPostAuthorName,
									image: resharedPostAuthorImage,
								},
							},
					  }
					: null),
			};
		})) || [];

	return { nextPageToken, posts };
};

class Plus {
	constructor({ accountIdx, fsid, session, cookie } = {}, profile, page) {
		this.accountIdx = accountIdx;
		this.fsid = fsid;
		this.profile = profile;
		this.page = page;
		this.session = session;
		this.cookie = cookie;

		this.sessionReqId = 0;
		this.sessionIdBase = new Date().valueOf() % 10000000;

		this.defaultQueryStrings = {
			_reqId: this._reqId.bind(this), // eslint-disable-line
			// cid: 0,
			rt: "c",
			hl: "en",
			bl: "boq_plusappuiserver_20190314.01_p0",
			"soc-app": 199,
			"soc-device": 1,
			"soc-platform": 1,
			"f.sid": this.fsid || "",
		};

		this.headers = {
			cookie: this.cookie,
		};
	}

	_reqId() {
		return this.sessionReqId++ * 100000 + this.sessionIdBase;
	}

	uri(template) {
		let pagetoken =
			this.accountIdx !== undefined && this.accountIdx !== null
				? `/u/${this.accountIdx}`
				: "";
		if (this.page && this.page.id) {
			pagetoken = `${pagetoken}/b/${this.page.id}`;
		}
		return template.replace(/\${pagetoken}/g, pagetoken);
	}

	qsDef(qs, propName) {
		if (qs[propName]) {
			const v = this.defaultQueryStrings[propName];
			qs[propName] = (isFunction(v) ? v() : v) || "";
		}
	}

	qs(qs) {
		Object.keys(this.defaultQueryStrings).forEach((propName) =>
			this.qsDef(qs, propName),
		);
		return qs;
	}

	async plusAppUi(op, type, form, { advanced } = {}) {
		return plusProxy({
			advanced,
			method: "POST",
			uri: this.uri(`https://plus.google.com\${pagetoken}/_/PlusAppUi/${op}`),
			headers: this.headers,
			qs: this.qs({
				_reqId: true,
				rt: true,
				hl: true,
				"f.sid": true,
				"soc-app": true,
				"soc-device": true,
				"soc-platform": true,
				"ds.extension": type,
			}),
			form: Object.assign({}, this.session ? { at: this.session } : {}, form),
		});
	}

	async plusAppUiData(type, form, options) {
		return this.plusAppUi("data", type, form, options);
	}

	async listCollections() {
		const collectionType = "93434307";
		const actorId =
			(this.page && this.page.id) || (this.profile && this.profile.id);
		const rsp = await this.plusAppUiData(collectionType, {
			"f.req": `[[[${collectionType},[{"${collectionType}":[${
				(actorId && `"${actorId}"`) || ""
			}]}],null,null,0]]]`,
		});
		const d = val(rsp, 0, 2, `${collectionType}`, 0, 0);
		const collections =
			(d &&
				(await bluebird.map(d, async (e) => {
					const id = val(e, 0);
					const image = await fixImageUrl(val(e, 2), "collection");
					const name = val(e, 1);
					const url = `https://plus.google.com/collection/${id}`;
					const t = val(e, 7, 0);
					const type =
						(t === 1 && "PUBLIC") ||
						(t === 2 && "MYCIRCLES") ||
						(t === 3 && "PRIVATE") ||
						"UNKNOWN";
					return { id, url, name, image, type };
				}))) ||
			[];
		return collections;
	}

	listCommunities() {
		return this.listCommunitiesIamMemberOf();
	}

	listCommunitiesIamMemberOf() {
		return this.listCommunitiesByType("78132503");
	}

	async listCommunitiesByType(type) {
		const rsp = await this.plusAppUiData(type, {
			// 23.2.2018
			"f.req": `[[[${type},[{"${type}":[null,null,null,true]}],null,null,1]]]`,
			// legacy
			// 'f.req': `[[[${type},[{"${type}":[]}],null,null,0]]]`
		});
		const d =
			val(rsp, 0, 2, `${type}`, 1, 3) || val(rsp, 0, 2, `${type}`, 0, 3);
		const communities =
			(d &&
				(
					await bluebird.map(d, async (c) => {
						const cc = val(c, 0);
						if (!cc || !cc.length) {
							return null;
						}
						return {
							id: val(cc, 0),
							name: val(cc, 1),
							membersCount: val(cc, 5),
							image: await fixImageUrl(val(cc, 6), "community"),
							membership: CommunityMembership[val(cc, 7)] || "UNKNOWN",
							tagline: val(cc, 8),
						};
					})
				).filter((v) => v)) ||
			[];
		return communities;
	}

	listCommunityCategories(communityId) {
		const type = "79988855";
		return this.plusAppUiData(type, {
			"f.req": `[[[${type},[{"${type}":["${communityId}"]}],null,null,0]]]`,
		}).then((rsp) => {
			const d = val(rsp, 0, 2, type, 1);
			const categories =
				(d &&
					d.map((c) => ({
						id: val(c, 0),
						name: val(c, 1),
					}))) ||
				[];
			return categories;
		});
	}

	async listAlbumItems(photoAlbumUrl) {
		const u = urlParser.parse(photoAlbumUrl, true);
		const { authkey } = u.query || {};
		const m = rePhotoAlbumurl.exec(photoAlbumUrl);
		if (!m) {
			return [];
		}
		const photoId = m[1];
		const albumId = m[2];
		if (!photoId || !albumId) {
			return [];
		}
		const type = "98850950";
		const { blocks } = await this.plusAppUiData(
			type,
			{
				"f.req": `[[[${type},[{"${type}":[null,${
					authkey ? `"${authkey}"` : "null"
				},null,["${photoId}","${albumId}"],true]}],null,null,0]]]`,
			},
			{ advanced: true },
		);
		const block = blocks && blocks[type];
		if (!block) {
			return [];
		}
		return bluebird
			.map(val(block, 4, 1) || [], async (i) => {
				let url = val(i, 1) || val(i, 0, 1);
				if (!url) {
					return null;
				}
				const sizes = val(i, 23, "101997197", 4) || [];
				const isVideo = url.indexOf("video-downloads") > -1 || sizes.length > 0;
				if (isVideo) {
					let registerVideoUrl;
					let maxSize = 0;
					sizes.forEach((v) => {
						const size = (val(v, 1) || 0) * (val(v, 2) || 0);
						if (maxSize < size) {
							maxSize = size;
							if (val(v, 3)) {
								url = val(v, 3);
								registerVideoUrl = url;
							}
						}
					});
					if (registerVideoUrl) {
						await registerVideo(photoAlbumUrl, registerVideoUrl);
					}
				} else {
					url = await fixImageUrl(url, "album");
				}
				return { url, type: isVideo ? "video" : "image" };
			})
			.filter((i) => i);
	}

	async listAlbumItem(albumUrl) {
		const reVideoAlbumUrl =
			/https:\/\/plus\.google\.com\/photos\/([0-9]+)\/albums?\/([0-9]+)\/([0-9]+)[?/]?/;

		const u = urlParser.parse(albumUrl, true);
		const { authkey } = u.query || {};
		const m = reVideoAlbumUrl.exec(albumUrl);
		if (!m) {
			return [];
		}
		const photoId = m[1];
		const albumId = m[2];
		const itemId = m[3];
		if (!photoId || !albumId || !itemId) {
			return [];
		}

		// https://plus.google.com/photos/118220576483582342031/album/6625303999225340625/6625304005407458210?authkey=XXX&sqid=108524206628971601859&ssid=b7a8b239-1809-4a68-bb05-ac3bff2fe3e1
		// f.req: [[[98850950,[{"98850950":[null,"CJXSjqvJq4PEDQ",null,["118220576483582342031","6625303999225340625"],true,"6625304005407458210",null,null,["108524206628971601859","b7a8b239-1809-4a68-bb05-ac3bff2fe3e1"]]}],null,null,0]]]

		const type = "98850950";
		const { blocks } = await this.plusAppUiData(
			type,
			{
				"f.req": `[[[${type},[{"${type}":[null,${
					authkey ? `"${authkey}"` : "null"
				},null,["${photoId}","${albumId}"],true,"${itemId}"]}],null,null,0]]]`,
			},
			{ advanced: true },
		);

		const block = blocks && blocks[type];
		if (!block) {
			return [];
		}

		const videos = await bluebird
			.map(val(block, 4, 1) || [], async (i) => {
				let url = val(i, 1) || val(i, 0, 1);
				if (!url) {
					return null;
				}
				const isVideo = url.indexOf("video-downloads") > -1;
				if (!isVideo) {
					return null;
				}
				let registerVideoUrl;
				let maxSize = 0;
				const sizes = val(i, 23, "101997197", 4) || [];
				sizes.forEach((v) => {
					const size = (val(v, 1) || 0) * (val(v, 2) || 0);
					if (maxSize < size) {
						maxSize = size;
						if (val(v, 3)) {
							url = val(v, 3);
							registerVideoUrl = url;
						}
					}
				});
				if (registerVideoUrl) {
					await registerVideo(albumUrl, registerVideoUrl);
				}
				return registerVideoUrl;
			})
			.filter((i) => i);

		return (videos.length && videos[0]) || null;
	}

	async listAlbumPhotos(photoAlbumUrl) {
		const u = urlParser.parse(photoAlbumUrl, true);
		const { authkey } = u.query || {};
		const m = rePhotoAlbumurl.exec(photoAlbumUrl);
		if (!m) {
			return [];
		}
		const photoId = m[1];
		const albumId = m[2];
		if (!photoId || !albumId) {
			return [];
		}
		const type = "98850950";
		const { blocks } = await this.plusAppUiData(
			type,
			{
				"f.req": `[[[${type},[{"${type}":[null,${
					authkey ? `"${authkey}"` : "null"
				},null,["${photoId}","${albumId}"],true]}],null,null,0]]]`,
			},
			{ advanced: true },
		);
		const block = blocks && blocks[type];
		if (!block) {
			return [];
		}
		return (
			await bluebird.map(val(block, 4, 1) || [], (i) =>
				fixImageUrl(val(i, 1) || val(i, 0, 1), "album"),
			)
		)
			.filter((i) => i)
			.map((proxy) => ({ proxy }));
	}

	// no longer works, use listPostsComments instead
	// postPublicId, ex. ["+AdeOshineye","aF5XrRHingw"]
	async listPostComments(postPublicId, { count = 500 } = {}) {
		const type = "104808687";
		const rsp = await this.plusAppUiData(type, {
			"f.req": `[[[${type},[{"${type}":[null,[null,${count}],null,"${postPublicId[0]}","${postPublicId[1]}"]}],null,null,3]]]`,
		});
		const nextPageToken = val(rsp, 0, 2, type, 0, 1, 0);
		const comments = (
			await bluebird.map(val(rsp, 0, 2, type, 0, 0) || [], async (co) => {
				const c = val(co, 2, "104817566");
				if (!c) {
					return null;
				}
				return {
					id: val(c, 4),
					createdAt: val(c, 3) && new Date(val(c, 3)).toISOString(),
					author: {
						name: val(c, 25, 0),
						id: val(c, 25, 1),
						image: await fixImageUrl(val(c, 25, 4), "user"),
					},
					plusses: val(c, 15, 16) || 0,
					message: optimizeMessage(val(c, 27, 0)),
				};
			})
		).filter((c) => c);
		return { nextPageToken, comments };
	}

	async listPostsComments(posts, { count = 500 } = {}) {
		const type = "104808687";
		const { multiBlocks, notFound } = await this.plusAppUiData(
			type,
			{
				"f.req": `[[${posts
					.map(
						(p, i) =>
							`[${type},[{"${type}":["${p.id}",[null,${count}],null,null,null]}],null,null,${i}]`,
					)
					.join(",")}]]`,
			},
			{ advanced: true, fullBlocks: true },
		);
		const blocks = (multiBlocks && multiBlocks[type]) || [];

		posts.forEach((p) => {
			p.comments = p.comments || [];
		});

		await bluebird.map(
			blocks,
			async (block) => {
				let postId;
				const comments = (
					await bluebird.map(val(block, 0, 0) || [], async (co) => {
						const c = val(co, 2, "104817566");
						if (!c) {
							return null;
						}
						postId = val(c, 7) || (val(c, 4) || "").split("#")[0] || "";

						const comment = {
							id: val(c, 4),
							plusses: val(c, 15, 16) || 0,
							createdAt: val(c, 3) && new Date(val(c, 3)).toISOString(),
							author: {
								name: val(c, 25, 0),
								id: val(c, 25, 1),
								image: await fixImageUrl(val(c, 25, 4), "user"),
							},
							message: optimizeMessage(val(c, 27, 0)),
						};

						const albums = comment.message.filter(
							(l) => l[0] === 2 && l[2] && rePhotoAlbumurl.test(l[2]),
						);
						await bluebird.map(
							albums,
							async (line) => {
								const images = await this.listAlbumPhotos(line[2]);
								const image =
									images && images.length && images[0] && images[0].proxy;
								if (image) {
									line[1] = image;
								}
							},
							{ concurrency: 2 },
						);

						return comment;
					})
				).filter((c) => c);

				const p =
					(postId && posts.find((post) => post.id === postId)) ||
					(posts.length === 1 && posts[0]);
				if (p) {
					if (comments.length >= p.comments.length) {
						p.comments = comments;
					}
				}
			},
			{ concurrency: 8 },
		);

		return { posts, notFound };
	}

	async fetchAndProcessPosts(listPostsFc, processFc, { skipComments } = {}) {
		let pageToken;
		let skip;
		let reply;
		let posts;
		let tries = 0;
		let fetchedPosts = 0;
		do {
			// logger.log('fetchAndProcessPosts pageToken', pageToken);
			skip = false;
			try {
				reply = await listPostsFc(pageToken); // eslint-disable-line
				tries = 0;
			} catch (e) {
				if (tries++ < 3) {
					skip = true;
				} else {
					captureException(e);
				}
			}

			if (!skip) {
				posts = (reply && reply.posts) || [];
				fetchedPosts += posts.length;
				if (posts.length) {
					if (!skipComments) {
						try {
							// eslint-disable-next-line
							await this.listPostsComments(posts);
						} catch (e) {
							captureException(e);
						}
					}
					try {
						await processFc(posts); // eslint-disable-line
					} catch (e) {
						captureException(e);
					}
				}
				pageToken = reply && reply.nextPageToken;
			}
		} while (pageToken);
		return fetchedPosts;
	}

	// publicId: ["+DarinRMcClureIAm","9jYpgQ9Jbqm"]
	fetchPost(publicId) {
		const type = "76813347";
		const req = {
			"f.req": `[[[${type},[{"${type}":[null,null,"${publicId[0]}","${publicId[1]}"]}],null,null,0]]]`,
		};
		return this.listPosts(type, req, { isSinglePost: true });
	}

	listAccountPosts(pageToken) {
		const type = "74333095";
		const actorId =
			(this.page && this.page.id) || (this.profile && this.profile.id);
		const req = {
			"f.req": pageToken
				? `[[[${type},[{"${type}":["${pageToken}","${actorId}"]}],null,null,0]]]`
				: `[[[${type},[{"${type}":[null,"${actorId}"]}],null,null,0]]]`,
		};
		return this.listPosts(type, req);
	}

	listCollectionPosts(collectionId, pageToken) {
		const type = "89329912";
		const req = {
			"f.req": pageToken
				? `[[[${type},[{"${type}":["${pageToken}","${collectionId}"]}],null,null,0]]]`
				: `[[[${type},[{"${type}":[null,"${collectionId}"]}],null,null,0]]]`,
		};
		return this.listPosts(type, req);
	}

	searchPosts(query, pageToken) {
		const type = "79380020";
		const req = {
			"f.req": pageToken
				? `[[[${type},[{"${type}":["${query}","${pageToken}",null,1,1,null,2]}],null,null,0]]]`
				: `[[[${type},[{"${type}":["${query}",null,null,1,1,2]}],null,null,0]]]`,
		};
		return this.listPosts(type, req);
	}

	listCommunityCategoryPosts(communityId, categoryId, pageToken) {
		const type = "77894468";
		const req = {
			"f.req": pageToken
				? `[[[${type},[{"${type}":[${
						communityId ? `"${communityId}"` : "null"
				  },"${categoryId}","${pageToken}",null,null,null,null]}],null,null,0]]]`
				: `[[[${type},[{"${type}":[${
						communityId ? `"${communityId}"` : "null"
				  },"${categoryId}"]}],null,null,0]]]`,
		};
		return this.listPosts(type, req);
	}

	listPosts(type, req, { isSinglePost } = {}) {
		return this.plusAppUiData(type, req).then((rsp) =>
			extractPosts(type, rsp, { isSinglePost, plus: this }),
		);
	}

	async accountInfo(id) {
		const type = "151261162";
		const { blocks, notFound } = await this.plusAppUiData(
			type,
			{ "f.req": `[[[${type},[{"${type}":["${id}"]}],null,null,0]]]` },
			{ advanced: true },
		);

		if (notFound) {
			return { notFound };
		}

		const block = blocks[type];
		const account = {
			id,
			name: val(block, 0, 1),
			image: await fixImageUrl(val(block, 0, 2, 0, 0), "user"),
		};

		return { account };
	}

	async communityInfo(id) {
		// google api nevraci stabilne oba pozadovane bloky
		// const { blocks, multiBlocks, notFound } = await this.plusAppUiData(
		//   '79988855.87982462',
		//   {
		//     'f.req': `[[[79988855,[{"79988855":["${id}"]}],null,null,0],[87982462,[{"87982462":["${id}"]}],null,null,1]]]`
		//   },
		//   { advanced: true, fullBlocks: true }
		// );
		// logger.log('blocks', blocks, 'multiBlocks', multiBlocks);
		// if (notFound) {
		//   return { notFound };
		// }

		// const communityBlock = blocks['87982462'];
		// const categoriesBlock = blocks['79988855'];
		// const accountId = this.profile.id;
		// logger.log('communityBlock', communityBlock);
		// const community = {
		//   id,
		//   name: val(communityBlock, 1, 1),
		//   membersCount: val(communityBlock, 1, 5) || 0,
		//   tagline: val(communityBlock, 1, 8) || '',
		//   image: await fixImageUrl(val(communityBlock, 1, 6), 'user')
		// };
		// const categories = (val(categoriesBlock, 1) || []).map(c => ({
		//   id: val(c, 0),
		//   name: val(c, 1)
		// }));

		const { blocks, notFound } = await this.plusAppUiData(
			"87982462",
			{ "f.req": `[[[87982462,[{"87982462":["${id}"]}],null,null,0]]]` },
			{ advanced: true },
		);

		if (notFound) {
			return { notFound };
		}

		const communityBlock = blocks["87982462"];
		const accountId = this.profile.id;
		const community = {
			id,
			name: val(communityBlock, 1, 1),
			membersCount: val(communityBlock, 1, 5) || 0,
			tagline: val(communityBlock, 1, 8) || "",
			image: await fixImageUrl(val(communityBlock, 1, 6), "user"),
		};
		const categories = await this.listCommunityCategories(id);
		return { accountId, community, categories };
	}
}

module.exports = Plus;
