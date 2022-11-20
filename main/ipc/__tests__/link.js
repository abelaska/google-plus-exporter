const { fixLink, fixUrl } = require('../link');

test('should fix url', () => {
  expect(fixUrl('')).toBe('');
  expect(fixUrl('http://www.cz')).toBe('http://www.cz');
  expect(
    fixUrl('https://www.youtube.com/attribution_link?a=PTDtNAayU4w&u=/watch?v%3DIRdrt8nPyy8%26feature%3Dshare')
  ).toBe('https://www.youtube.com/watch?v=IRdrt8nPyy8&feature=share');
});

test('should fix link', () => {
  expect(fixLink()).toBeUndefined();
  expect(fixLink({ url: '' })).toEqual({ url: '' });
  expect(
    fixLink({
      url: 'https://www.youtube.com/attribution_link?a=PTDtNAayU4w&u=/watch?v%3DIRdrt8nPyy8%26feature%3Dshare'
    })
  ).toEqual({ url: 'https://www.youtube.com/watch?v=IRdrt8nPyy8&feature=share' });
});
