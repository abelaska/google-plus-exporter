const { fixImageUrl } = require('../image');

test('should convert image size', async () => {
  expect(
    await fixImageUrl('https://lh3.googleusercontent.com/a-/AN66SAyVD3fC6kS8GZVBKm7Up8eXdCKA_iX-Fc1SgShr1w=il', 's35')
  ).toBe('https://lh3.googleusercontent.com/a-/AN66SAyVD3fC6kS8GZVBKm7Up8eXdCKA_iX-Fc1SgShr1w=s35');

  expect(
    await fixImageUrl(
      'https://lh3.googleusercontent.com/-kZNtKJsufvY/V0Jht7YqYkI/AAAAAAAAPKU/MV08ZbAksXg1AgfHYFrnfnP8aMZDSEMkA/s250/98ceb8cc-83c8-4998-962c-f187f9f3d7a6'
    )
  ).toBe(
    'https://lh3.googleusercontent.com/-kZNtKJsufvY/V0Jht7YqYkI/AAAAAAAAPKU/MV08ZbAksXg1AgfHYFrnfnP8aMZDSEMkA/s0/98ceb8cc-83c8-4998-962c-f187f9f3d7a6.png'
  );

  expect(
    await fixImageUrl(
      'https://lh3.googleusercontent.com/-T_F4q0D497Y/V17kxH_ldyI/AAAAAAAADVo/qGsjbx-5M38acCyEJZerSnarY1sGDq5Ug/s250/76245.png'
    )
  ).toBe(
    'https://lh3.googleusercontent.com/-T_F4q0D497Y/V17kxH_ldyI/AAAAAAAADVo/qGsjbx-5M38acCyEJZerSnarY1sGDq5Ug/s0/76245.png'
  );

  expect(
    await fixImageUrl(
      'https://lh3.googleusercontent.com/CTNhQ0sR5msqpXdKAT8J0nXVokMESNTqd79_Yhbqmyoare-ItqhS9XZkd6QoCuLEDzqvdwXbDrnK6ecZttR7UIR1V79s3Y3kE5Z2kfBzWUwwFfDHujP_vhKBRx14jq2T7bPNO37kbHw=w506-h910-k'
    )
  ).toBe(
    'https://lh3.googleusercontent.com/CTNhQ0sR5msqpXdKAT8J0nXVokMESNTqd79_Yhbqmyoare-ItqhS9XZkd6QoCuLEDzqvdwXbDrnK6ecZttR7UIR1V79s3Y3kE5Z2kfBzWUwwFfDHujP_vhKBRx14jq2T7bPNO37kbHw=s0'
  );
});
