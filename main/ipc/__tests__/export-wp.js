const { exportAccountToWordPress, compileMessage } = require('../export-wp');

// test('should extract posts', async () => {
//   const result = await exportAccountToWordPress('', { saveToFile: false });
//   expect(result).toBeTruthy();
//   const { dump } = result;
//   expect(dump).toBeTruthy();
// });

test('should compile message', async () => {
  let html = await compileMessage({ message: [[0, 'Mind = blown. Awesome work !']] });
  expect(html).toBe('Mind = blown. Awesome work !');

  html = await compileMessage({
    message: [
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
    ]
  });
  expect(html).toBe(
    '<strong>Question</strong> Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?\n\nThis feature does not seem to be working properly for some users. Help me to track and crack the problem. <strong>Thank you!</strong>\n\nMy apologies to affected users.'
  );

  html = await compileMessage({
    message: [
      [0, 'Question', { bold: true }],
      [0, ' Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'],
      [1],
      [0, 'This feature does not seem to be working properly for some users. Help me to track and crack the problem. '],
      [0, 'Thank you!', { bold: true }],
      [1],
      [0, 'My apologies to affected users.'],
      [1],
      [4, '#ns', 'https://plus.google.com/s/%23ns/posts'],
      [0, '﻿']
    ]
  });
  expect(html).toBe(
    '<strong>Question</strong> Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?\nThis feature does not seem to be working properly for some users. Help me to track and crack the problem. <strong>Thank you!</strong>\nMy apologies to affected users.'
  );

  html = await compileMessage({
    message: [
      [0, 'Question', { bold: true }],
      [0, ' Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'],
      [0, 'This feature does not seem to be working properly for some users. Help me to track and crack the problem. '],
      [0, 'Thank you!', { bold: true }],
      [1],
      [0, 'My apologies to affected users.'],
      [1],
      [4, '#ns', 'https://plus.google.com/s/%23ns/posts'],
      [1],
      [0, '﻿']
    ]
  });
  expect(html).toBe(
    '<strong>Question</strong> Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?This feature does not seem to be working properly for some users. Help me to track and crack the problem. <strong>Thank you!</strong>\nMy apologies to affected users.'
  );
});
