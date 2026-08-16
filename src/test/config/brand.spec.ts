import { BRAND_PALETTE } from '@config/brand';

describe('brand palette', () => {
  it('exporta los hex de marca documentados', () => {
    expect(BRAND_PALETTE.primary).toBe('#0F3D2E');
    expect(BRAND_PALETTE.accent).toBe('#C4A35A');
    expect(BRAND_PALETTE.neutralLight).toBe('#F4F1EA');
    expect(BRAND_PALETTE.neutralDark).toBe('#1A1A1A');
    expect(BRAND_PALETTE.danger).toBe('#B33A3A');
  });
});
