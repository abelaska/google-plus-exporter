const { shortenText, extractFirstLineForTitle } = require('../text');

test('should shorten text', () => {
  expect(shortenText('', 10)).toBe('');
  expect(shortenText('Hello how are you?', 10)).toBe('Hello...');
  expect(shortenText('Hello how are you?', 14)).toBe('Hello how...');
  expect(shortenText('This is sentence. Another sentence.', 20, { firstSentence: true })).toBe('This is sentence.');
  expect(
    shortenText("RX 10.2.2, I did a install with keeping registry settings but it can't find Raise components.", 50, {
      firstSentence: true
    })
  ).toBe('RX 10.2.2, I did a install with keeping...');
  expect(
    shortenText(
      `Anybody using linux server with indy components and RIO Delphi? Cause a bug in Namethread is not posible... So, is unusable for me right now. That bug was reported and don't fixed by EMB before release when is a total show stopper. Cant find the word to describe my feelings to EMB right now. The bug report is open and without any progress in weeks. No notice if will be patched or don't and even why they release the version with that bug. This are the kind of things making lose at complete the confidence in a tool. What must I say to the customer? I cant even give a time to release my product because that.`,
      120
    )
  ).toBe(
    'Anybody using linux server with indy components and RIO Delphi? Cause a bug in Namethread is not posible... So, is...'
  );

  expect(
    shortenText(
      `Anybody using linux server with indy components and RIO Delphi? Cause a bug in Namethread is not posible... So, is unusable for me right now. That bug was reported and don't fixed by EMB before release when is a total show stopper. Cant find the word to describe my feelings to EMB right now. The bug report is open and without any progress in weeks. No notice if will be patched or don't and even why they release the version with that bug. This are the kind of things making lose at complete the confidence in a tool. What must I say to the customer? I cant even give a time to release my product because that.`,
      120,
      { firstSentence: true }
    )
  ).toBe('Anybody using linux server with indy components and RIO Delphi?');
  expect(
    shortenText(
      `Anybody using linux server with indy components and RIO Delphi! Cause a bug in Namethread is not posible... So, is unusable for me right now. That bug was reported and don't fixed by EMB before release when is a total show stopper. Cant find the word to describe my feelings to EMB right now. The bug report is open and without any progress in weeks. No notice if will be patched or don't and even why they release the version with that bug. This are the kind of things making lose at complete the confidence in a tool. What must I say to the customer? I cant even give a time to release my product because that.`,
      120,
      { firstSentence: true }
    )
  ).toBe('Anybody using linux server with indy components and RIO Delphi!');
  expect(
    shortenText(
      `Anybody using linux server with indy components and RIO Delphi. Cause a bug in Namethread is not posible... So, is unusable for me right now. That bug was reported and don't fixed by EMB before release when is a total show stopper. Cant find the word to describe my feelings to EMB right now. The bug report is open and without any progress in weeks. No notice if will be patched or don't and even why they release the version with that bug. This are the kind of things making lose at complete the confidence in a tool. What must I say to the customer? I cant even give a time to release my product because that.`,
      120,
      { firstSentence: true }
    )
  ).toBe('Anybody using linux server with indy components and RIO Delphi.');
  expect(
    shortenText(
      `Anybody using linux server with indy components and RIO Delphi Cause a bug in Namethread is not posible So, is unusable for me right now. That bug was reported and don't fixed by EMB before release when is a total show stopper. Cant find the word to describe my feelings to EMB right now. The bug report is open and without any progress in weeks. No notice if will be patched or don't and even why they release the version with that bug. This are the kind of things making lose at complete the confidence in a tool. What must I say to the customer? I cant even give a time to release my product because that.`,
      120,
      { firstSentence: true }
    )
  ).toBe(
    'Anybody using linux server with indy components and RIO Delphi Cause a bug in Namethread is not posible So, is...'
  );
});

test('shoould extract first line for title', () => {
  expect(
    extractFirstLineForTitle([
      [0, 'Question', { bold: true }],
      [0, ' Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'],
      [1],
      [1],
      [0, 'This feature does not seem to be working properly for some users. Help me to track and crack the problem. '],
      [0, 'Thank you!', { bold: true }],
      [1],
      [1],
      [0, 'My apologies to affected users.'],
      [1],
      [1],
      [4, '#ns', 'https://plus.google.com/s/%23ns/posts'],
      [0, '﻿']
    ])
  ).toBe(
    'Question Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'
  );
  expect(
    extractFirstLineForTitle([
      [0, `Originally shared by resharedPostAuthorName`, { bold: true }],
      [1],
      [1],
      [0, 'Question', { bold: true }],
      [0, ' Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'],
      [1],
      [1],
      [0, 'This feature does not seem to be working properly for some users. Help me to track and crack the problem. '],
      [0, 'Thank you!', { bold: true }],
      [1],
      [1],
      [0, 'My apologies to affected users.'],
      [1],
      [1],
      [4, '#ns', 'https://plus.google.com/s/%23ns/posts'],
      [0, '﻿']
    ])
  ).toBe(
    'Question Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'
  );
  expect(
    extractFirstLineForTitle([
      [0, 'Question', { bold: true }],
      [0, ' Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'],
      [1],
      [1],
      [0, `Originally shared by resharedPostAuthorName`, { bold: true }],
      [1],
      [1],
      [0, 'This feature does not seem to be working properly for some users. Help me to track and crack the problem. '],
      [0, 'Thank you!', { bold: true }],
      [1],
      [1],
      [0, 'My apologies to affected users.'],
      [1],
      [1],
      [4, '#ns', 'https://plus.google.com/s/%23ns/posts'],
      [0, '﻿']
    ])
  ).toBe(
    'Question Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'
  );
});
