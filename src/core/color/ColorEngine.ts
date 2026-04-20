import { converter, formatHex, formatCss, parse, wcagContrast, Color } from 'culori';

export interface ColorRamp {
  [key: string]: string;
}

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';

export class ColorEngine {
  private toOklch = converter('oklch');
  private toHex = converter('hex');
  private toRgb = converter('rgb');
  private toHsl = converter('hsl');

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
   * Convert a color to the specified output format
   * All calculations are done in OKLCH internally, then converted to target format
   */
  convertFormat(colorStr: string, targetFormat: ColorFormat): string {
    const parsed = parse(colorStr);
    if (!parsed) throw new Error(`Invalid color format: ${colorStr}`);

    // First convert to OKLCH for consistency
    const oklch = this.toOklch(parsed);

    // Then convert to target format
    switch (targetFormat) {
      case 'hex':
        return formatHex(this.toHex(oklch));
      case 'rgb':
        return formatCss(this.toRgb(oklch));
      case 'hsl':
        return formatCss(this.toHsl(oklch));
      case 'oklch':
        return formatCss(oklch);
      default:
        return formatHex(this.toHex(oklch));
    }
  }

  /**
   * Generate a tonal ramp based on a base color
   * Logic: Vary L (lightness) from 0.95 to 0.1
   * All calculations in OKLCH, output in specified format
   */
  generateRamp(baseColorStr: string, outputFormat: ColorFormat = 'hex'): ColorRamp {
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
      // Convert to target format
      ramp[level] = this.convertFormat(formatCss(shade), outputFormat);
    }

    return ramp;
  }

  /**
   * Generate tonal ramps for an entire palette
   */
  generatePaletteRamps(palette: string[], outputFormat: ColorFormat = 'hex'): Record<string, ColorRamp> {
    const ramps: Record<string, ColorRamp> = {};
    palette.forEach((color, index) => {
      const colorName = `color${index + 1}`;
      ramps[colorName] = this.generateRamp(color, outputFormat);
    });
    return ramps;
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
