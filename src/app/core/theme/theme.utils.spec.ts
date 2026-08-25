import { contrastRatio, createSemanticTheme, normalizeHex } from './theme.utils';

describe('theme utilities', () => {
  it('uses the safe brand fallback for malformed API colors', () => {
    expect(normalizeHex('javascript:red')).toBe('#F5B700');
    expect(createSemanticTheme('not-a-color').primary).toBe('#F5B700');
  });

  it('chooses a WCAG-readable foreground for light and dark primary colors', () => {
    const light = createSemanticTheme('#F5B700');
    const dark = createSemanticTheme('#111827');

    expect(contrastRatio(light.primary, light.foreground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.primary, dark.foreground)).toBeGreaterThanOrEqual(4.5);
  });

  it('derives stable hover, active, and soft variants', () => {
    const palette = createSemanticTheme('#F5B700');
    expect(palette.hover).not.toBe(palette.primary);
    expect(palette.active).not.toBe(palette.hover);
    expect(palette.soft).not.toBe(palette.primary);
  });
});
