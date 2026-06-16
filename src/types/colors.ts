/**
 * Supported color input formats.
 */
export type ColorInputFormat =
  | 'hex'
  | 'rgb'
  | 'rgba'
  | 'hsl'
  | 'hsla'
  | 'oklch'
  | 'oklab'
  | 'lch'
  | 'lab'
  | 'named';

/**
 * Output format for CSS variable values.
 * 'input' preserves the original user-provided format.
 */
export type ColorOutputFormat = 'hex' | 'rgb' | 'hsl' | 'oklch' | 'input';

/**
 * Internal OKLCH representation used for all color analysis.
 */
export interface OklchColor {
  l: number; // Lightness [0..1]
  c: number; // Chroma [0..~0.4]
  h: number; // Hue [0..360]
  alpha?: number;
}

/**
 * A parsed user color with metadata about its original format.
 */
export interface ParsedColor {
  /** Original input string from the user */
  original: string;
  /** Detected input format */
  inputFormat: ColorInputFormat;
  /** Normalized OKLCH representation */
  oklch: OklchColor;
}

/**
 * Semantic role a color can serve in a shadcn/ui theme.
 */
export type ColorRole =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'foreground'
  | 'card'
  | 'card-foreground'
  | 'popover'
  | 'popover-foreground'
  | 'muted'
  | 'muted-foreground'
  | 'destructive'
  | 'destructive-foreground'
  | 'border'
  | 'input'
  | 'ring'
  | 'primary-foreground'
  | 'secondary-foreground'
  | 'accent-foreground';

/**
 * Classification traits of a parsed color.
 */
export interface ColorTraits {
  /** Lightness category */
  luminosity: 'very-dark' | 'dark' | 'medium' | 'light' | 'very-light';
  /** Saturation category */
  saturation: 'neutral' | 'muted' | 'vivid' | 'highly-vivid';
  /** Hue family */
  hueFamily: 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'magenta' | 'neutral';
  /** WCAG contrast ratio against white (#ffffff) */
  contrastOnWhite: number;
  /** WCAG contrast ratio against black (#000000) */
  contrastOnBlack: number;
  /** Suitable as a light background */
  canBeLightBg: boolean;
  /** Suitable as a dark background */
  canBeDarkBg: boolean;
  /** Suitable as readable text */
  canBeText: boolean;
  /** Suitable as destructive color (red/orange hue) */
  canBeDestructive: boolean;
}

/**
 * A classified color with role suitability scores.
 */
export interface ClassifiedColor {
  parsed: ParsedColor;
  traits: ColorTraits;
  /** Suitability scores for each potential role [0..1] */
  scores: Partial<Record<ColorRole, number>>;
}

/**
 * Result of a WCAG contrast check between two colors.
 */
export interface ContrastResult {
  ratio: number;
  passesAA: boolean;       // >= 4.5 for normal text
  passesAALarge: boolean;  // >= 3.0 for large text / UI
  foreground: string;
  background: string;
}
