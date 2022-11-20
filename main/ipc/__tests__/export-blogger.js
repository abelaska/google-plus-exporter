const { splitCommentMessage } = require('../export-blogger');

test('should split comment', () => {
  expect(
    splitCommentMessage(
      {
        message: [
          [0, 'Question', { bold: true }],
          [0, ' Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'],
          [1],
          [1],
          [
            0,
            'This feature does not seem to be working properly for some users. Help me to track and crack the problem. '
          ],
          [0, 'Thank you!', { bold: true }],
          [1],
          [1],
          [0, 'My apologies to affected users.'],
          [1],
          [1],
          [4, '#ns', 'https://plus.google.com/s/%23ns/posts'],
          [0, '﻿']
        ],
        link: 'link',
        image: 'image',
        images: ['image0', 'image1']
      },
      120
    )
  ).toEqual([
    {
      message: [[0, 'Question', { bold: true }]],
      link: 'link',
      image: 'image',
      images: ['image0', 'image1']
    },
    {
      message: [
        [0, ' Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'],
        [1],
        [1]
      ]
    },
    {
      message: [
        [
          0,
          'This feature does not seem to be working properly for some users. Help me to track and crack the problem. '
        ]
      ]
    },
    {
      message: [
        [0, 'Thank you!', { bold: true }],
        [1],
        [1],
        [0, 'My apologies to affected users.'],
        [1],
        [1],
        [4, '#ns', 'https://plus.google.com/s/%23ns/posts'],
        [0, '﻿']
      ]
    }
  ]);
});

test('should not split comment', () => {
  expect(
    splitCommentMessage({
      message: [
        [0, 'Question', { bold: true }],
        [0, ' Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'],
        [1],
        [1],
        [
          0,
          'This feature does not seem to be working properly for some users. Help me to track and crack the problem. '
        ],
        [0, 'Thank you!', { bold: true }],
        [1],
        [1],
        [0, 'My apologies to affected users.'],
        [1],
        [1],
        [4, '#ns', 'https://plus.google.com/s/%23ns/posts'],
        [0, '﻿']
      ],
      link: 'link',
      image: 'image',
      images: ['image0', 'image1']
    })
  ).toEqual([
    {
      message: [
        [0, 'Question', { bold: true }],
        [0, ' Is anybody having trouble to publish/schedule posts for Google+ collections, communities or profile?'],
        [1],
        [1],
        [
          0,
          'This feature does not seem to be working properly for some users. Help me to track and crack the problem. '
        ],
        [0, 'Thank you!', { bold: true }],
        [1],
        [1],
        [0, 'My apologies to affected users.'],
        [1],
        [1],
        [4, '#ns', 'https://plus.google.com/s/%23ns/posts'],
        [0, '﻿']
      ],
      link: 'link',
      image: 'image',
      images: ['image0', 'image1']
    }
  ]);
});
