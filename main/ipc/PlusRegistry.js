const values = require('lodash/values');
const Plus = require('./PlusSession');
// const logger = require('../logger');

const toString = id => `${id}`;

class PlusRegistry {
  constructor() {
    this.plus = {};
    /* [google_user_account_number]: {
      pages : [{
        id,
        name,
        image
      }],
      profile : {
        id,
        name,
        image
      },
      cookie,
      accountIdx,
      fsid,
      session
    } */
    this.google = {};
    this.accounts = [];
  }

  get actorIds() {
    return Object.keys(this.plus)
      .map(i => toString(i))
      .sort();
  }

  get defaultActorId() {
    const actorIds = Object.keys(this.plus);
    return actorIds && actorIds.length && actorIds[0];
  }

  get defaultSession() {
    const actorId = this.defaultActorId;
    return actorId && this.plus[actorId];
  }

  register(account) {
    if (this.google[account.accountIdx]) {
      return false;
    }

    this.google[account.accountIdx] = account;

    this.plus[toString(account.profile.id)] = new Plus(account, account.profile);

    this.accounts.push(account);

    if (account.pages && account.pages.length) {
      account.pages.forEach(p => {
        this.plus[toString(p.id)] = new Plus(account, account.profile, p);
      });
    }

    // this.plus[toString(account.profile.id)]
    //   .searchPosts('collection:oTRex')
    //   .then(r => logger.log('searchPosts ', JSON.stringify(r)))
    //   .catch(e => logger.log('searchPosts error', e));

    // this.plus[toString(account.profile.id)]
    //   .fetchPost(['+CarstenReckord', 'jkh4BKHxd5f'])
    //   .then(r => logger.log('fetchPost ', JSON.stringify(r)))
    //   .catch(e => logger.log('fetchPost error', e));

    return true;
  }

  clear() {
    this.plus = {};
    this.google = {};
  }

  actorId(actorId) {
    return actorId && this.plus[toString(actorId)];
  }

  actorOrDefaultSession(actorId) {
    let p = this.actorId(actorId);
    if (!p) {
      const ds = this.defaultSession;
      p = new Plus(
        {
          accountIdx: ds.accountIdx,
          fsid: ds.fsid,
          session: ds.session,
          cookie: ds.cookie
        },
        { id: actorId }
      );
      this.plus[toString(actorId)] = p;
    }
    return p;
  }

  google(accountIdx) {
    return this.google[toString(accountIdx)];
  }

  // [{ id, name, image, googleId,
  //    type: page || profile
  // }, ...]
  listActors() {
    return Promise.resolve(
      values(this.plus).map(p => {
        const type = p.page ? 'page' : 'profile';
        const o = p.page || p.profile;
        return {
          type,
          name: o.name,
          image: o.image,
          id: toString(o.id),
          googleId: toString(p.accountIdx)
        };
      })
    );
  }

  listCollections(actorId) {
    const p = this.actorOrDefaultSession(actorId);
    return (p && p.listCollections()) || Promise.resolve([]);
  }

  listAlbumItems(actorId, photoAlbumUrl) {
    const p = this.actorOrDefaultSession(actorId);
    return (p && p.listAlbumItems(photoAlbumUrl)) || Promise.resolve([]);
  }

  // { own: [{id, name, image, membersCount}, ...]
  //   member: [{id, name, image, membersCount}, ...] }}
  listCommunities(actorId) {
    const p = this.actorOrDefaultSession(actorId);
    return (p && p.listCommunities()) || Promise.resolve([]);
  }

  // [{ id, name }, ...]
  listCommunityCategories(actorId, communityId) {
    const p = this.actorOrDefaultSession(actorId);
    return (p && p.listCommunityCategories(communityId)) || Promise.resolve([]);
  }

  listCommunityCategoryPosts(actorId, communityId, categoryId, pageToken) {
    const p = this.actorOrDefaultSession(actorId);
    return (
      (p && p.listCommunityCategoryPosts(communityId, categoryId, pageToken)) ||
      Promise.resolve({ nextPageToken: null, posts: [] })
    );
  }

  searchPosts(actorId, query, pageToken) {
    const p = this.actorOrDefaultSession(actorId);
    return (p && p.searchPosts(query, pageToken)) || Promise.resolve({ nextPageToken: null, posts: [] });
  }

  listAccountPosts(actorId, pageToken) {
    const p = this.actorOrDefaultSession(actorId);
    return (p && p.listAccountPosts(pageToken)) || Promise.resolve({ nextPageToken: null, posts: [] });
  }

  listCollectionPosts(actorId, collectionId, pageToken) {
    const p = this.actorOrDefaultSession(actorId);
    return (p && p.listCollectionPosts(collectionId, pageToken)) || Promise.resolve({ nextPageToken: null, posts: [] });
  }

  listPostComments(actorId, postPublicId) {
    const p = this.actorOrDefaultSession(actorId);
    return (p && p.listPostComments(postPublicId)) || Promise.resolve([]);
  }

  fetchAndProcessAccountPosts(actorId, processPostsFn, canFetchMoreFn = async () => true) {
    const p = this.actorOrDefaultSession(actorId);
    return (
      p &&
      p.fetchAndProcessPosts(
        async pageToken => (await canFetchMoreFn()) && p.listAccountPosts(pageToken),
        processPostsFn
      )
    );
  }

  fetchAndProcessCollectionPosts(actorId, collectionId, processPostsFn, canFetchMoreFn = async () => true) {
    const p = this.actorOrDefaultSession(actorId);
    return (
      p &&
      p.fetchAndProcessPosts(
        async pageToken => (await canFetchMoreFn()) && p.listCollectionPosts(collectionId, pageToken),
        processPostsFn
      )
    );
  }

  fetchAndProcessCommunityCategoryPosts(
    actorId,
    communityId,
    categoryId,
    processPostsFn,
    canFetchMoreFn = async () => true
  ) {
    const p = this.actorOrDefaultSession(actorId);
    return (
      p &&
      p.fetchAndProcessPosts(
        async pageToken => (await canFetchMoreFn()) && p.listCommunityCategoryPosts(communityId, categoryId, pageToken),
        processPostsFn
      )
    );
  }

  searchAndProcessPosts(actorId, query, processPostsFn, canFetchMoreFn = async () => true) {
    const p = this.actorOrDefaultSession(actorId);
    return (
      p &&
      p.fetchAndProcessPosts(
        async pageToken => (await canFetchMoreFn()) && p.searchPosts(query, pageToken),
        processPostsFn
      )
    );
  }

  accountInfo(id) {
    const p = this.defaultSession;
    return p && p.accountInfo(id);
  }

  communityInfo(id) {
    const p = this.defaultSession;
    return p && p.communityInfo(id);
  }
}

module.exports = PlusRegistry;
