const { us } = require('../unicode');

test('should remove unsafe unicode', () => {
  expect(us('')).toBe('');
  expect(us('hi')).toBe('hi');
  expect(us('hi\uFFFE')).toBe('hi');
  expect(us('\uFFFFhi\uFFFE')).toBe('hi');
  expect(us(true)).toBe(true);
  expect(us(123)).toBe(123);
});
