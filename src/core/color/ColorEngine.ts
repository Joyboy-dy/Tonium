import { converter, formatHex, formatCss, parse, wcagContrast, Color } from 'culori';

export interface ColorRamp {
  [key: string]: string;
}

export class ColorEngine {
  private toOklch = converter('oklch');
  private toHex = converter('hex');

  /**
   * Convert any valid color string to OKLCH format
   */
  normalizeToOklch(colorStr: string): string {
    const parsed = parse(colorStr);
    if (!parsed) throw new Error(`Invalid color format: ${colorStr}`);
    const oklch = this.toOklch(parsed);
    return formatCss(oklch);
  }

  /**
   * Generate a tonal ramp based on a base color
   * Logic: Vary L (lightness) from 0.95 to 0.1
   */
  generateRamp(baseColorStr: string): ColorRamp {
    const base = this.toOklch(parse(baseColorStr)!);
    const ramp: ColorRamp = {};

    const levels = {
      50: 0.97,
      100: 0.92,
      200: 0.85,
      300: 0.75,
      400: 0.65,
      500: 0.55,
      600: 0.45,
      700: 0.35,
      800: 0.25,
      900: 0.15,
      950: 0.1,
    };

    for (const [level, lightness] of Object.entries(levels)) {
      const shade = { ...base, l: lightness };
      ramp[level] = formatHex(shade);
    }

    return ramp;
  }

  /**
   * Calculate contrast ratio between two colors (using WCAG)
   */
  getContrast(color1: string, color2: string): number {
    return wcagContrast(parse(color1)!, parse(color2)!);
  }

  /**
   * Check if contrast is sufficient for WCAG AA (4.5:1 for normal text)
   */
  isContrastValid(color1: string, color2: string, threshold = 4.5): boolean {
    return this.getContrast(color1, color2) >= threshold;
  }
}
