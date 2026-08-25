export interface SemanticThemePalette {
  readonly primary: string;
  readonly hover: string;
  readonly active: string;
  readonly soft: string;
  readonly foreground: string;
}

const FALLBACK_PRIMARY = '#F5B700';
const DARK_FOREGROUND = '#111827';
const LIGHT_FOREGROUND = '#FFFFFF';

export function createSemanticTheme(primaryValue: string): SemanticThemePalette {
  const primary = normalizeHex(primaryValue, FALLBACK_PRIMARY);
  const darkContrast = contrastRatio(primary, DARK_FOREGROUND);
  const lightContrast = contrastRatio(primary, LIGHT_FOREGROUND);

  return {
    primary,
    hover: mixHex(primary, '#000000', 0.12),
    active: mixHex(primary, '#000000', 0.2),
    soft: mixHex(primary, '#FFFFFF', 0.86),
    foreground: darkContrast >= 4.5 || darkContrast >= lightContrast ? DARK_FOREGROUND : LIGHT_FOREGROUND
  };
}

export function normalizeHex(value: string, fallback = FALLBACK_PRIMARY): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;
}

export function contrastRatio(first: string, second: string): number {
  const firstLum = relativeLuminance(hexToRgb(normalizeHex(first)));
  const secondLum = relativeLuminance(hexToRgb(normalizeHex(second)));
  const lighter = Math.max(firstLum, secondLum);
  const darker = Math.min(firstLum, secondLum);
  return (lighter + 0.05) / (darker + 0.05);
}

function mixHex(source: string, target: string, targetWeight: number): string {
  const from = hexToRgb(normalizeHex(source));
  const to = hexToRgb(normalizeHex(target));
  const weight = Math.min(1, Math.max(0, targetWeight));
  return rgbToHex({
    red: Math.round(from.red + (to.red - from.red) * weight),
    green: Math.round(from.green + (to.green - from.green) * weight),
    blue: Math.round(from.blue + (to.blue - from.blue) * weight)
  });
}

function relativeLuminance(rgb: Rgb): number {
  const channels = [rgb.red, rgb.green, rgb.blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return (channels[0] ?? 0) * 0.2126 + (channels[1] ?? 0) * 0.7152 + (channels[2] ?? 0) * 0.0722;
}

interface Rgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

function hexToRgb(value: string): Rgb {
  return {
    red: Number.parseInt(value.slice(1, 3), 16),
    green: Number.parseInt(value.slice(3, 5), 16),
    blue: Number.parseInt(value.slice(5, 7), 16)
  };
}

function rgbToHex(rgb: Rgb): string {
  const channel = (value: number): string => value.toString(16).padStart(2, '0');
  return `#${channel(rgb.red)}${channel(rgb.green)}${channel(rgb.blue)}`.toUpperCase();
}
