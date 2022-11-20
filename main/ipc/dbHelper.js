const createAccountFeedId = accountId => accountId;
const createCollectionFeedId = (accountId, collectionId) => `${accountId}:${collectionId}`;
const createCommunityStreamFeedId = (accountId, communityStreamId) => `${accountId}:${communityStreamId}`;

exports.createAccountFeedId = createAccountFeedId;
exports.createCollectionFeedId = createCollectionFeedId;
exports.createCommunityStreamFeedId = createCommunityStreamFeedId;
