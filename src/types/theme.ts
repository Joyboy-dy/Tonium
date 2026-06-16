import type { ColorRole, ContrastResult, ColorOutputFormat } from './colors.js';

/**
 * All semantic token names recognized by Tonium.
 */
export const SEMANTIC_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'radius',
  'sidebar',
  'sidebar-background',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
] as const;

export type SemanticToken = (typeof SEMANTIC_TOKENS)[number];

/**
 * Tokens required by the current shadcn/ui Tailwind v4 preset.
 */
export const REQUIRED_SEMANTIC_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'border',
  'input',
  'ring',
  'radius',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
] as const satisfies readonly SemanticToken[];

/**
 * Tokens accepted when present but not required by every shadcn/ui preset.
 */
export const OPTIONAL_SEMANTIC_TOKENS = [
  'destructive-foreground',
] as const satisfies readonly SemanticToken[];

/**
 * Legacy token names Tonium recognizes for compatibility but never requires.
 */
export const LEGACY_SEMANTIC_TOKENS = [
  'sidebar-background',
] as const satisfies readonly SemanticToken[];

/**
 * Token families for grouping related tokens.
 */
export type TokenFamily = 'brand' | 'surface' | 'interaction' | 'status' | 'sidebar' | 'chart';

/**
 * Maps a token to its family.
 */
export const TOKEN_FAMILIES: Record<SemanticToken, TokenFamily> = {
  'primary': 'brand',
  'primary-foreground': 'brand',
  'secondary': 'brand',
  'secondary-foreground': 'brand',
  'accent': 'brand',
  'accent-foreground': 'brand',
  'background': 'surface',
  'foreground': 'surface',
  'card': 'surface',
  'card-foreground': 'surface',
  'popover': 'surface',
  'popover-foreground': 'surface',
  'muted': 'surface',
  'muted-foreground': 'surface',
  'border': 'interaction',
  'input': 'interaction',
  'ring': 'interaction',
  'radius': 'interaction',
  'sidebar': 'sidebar',
  'destructive': 'status',
  'destructive-foreground': 'status',
  'sidebar-background': 'sidebar',
  'sidebar-foreground': 'sidebar',
  'sidebar-primary': 'sidebar',
  'sidebar-primary-foreground': 'sidebar',
  'sidebar-accent': 'sidebar',
  'sidebar-accent-foreground': 'sidebar',
  'sidebar-border': 'sidebar',
  'sidebar-ring': 'sidebar',
  'chart-1': 'chart',
  'chart-2': 'chart',
  'chart-3': 'chart',
  'chart-4': 'chart',
  'chart-5': 'chart',
};

/**
 * A token with its assigned color value.
 */
export interface TokenAssignment {
  token: SemanticToken;
  /** The CSS value string in the chosen output format */
  value: string;
  /** Whether this is a shadcn/ui default (preserved) or user-provided */
  source: 'default' | 'palette' | 'generated' | 'preserved';
  /** Contrast check result if this token has a paired foreground/background */
  contrast?: ContrastResult;
}

/**
 * A complete theme mapping for one mode (light or dark).
 */
export interface ThemeMode {
  mode: 'light' | 'dark';
  tokens: TokenAssignment[];
}

/**
 * The full generated theme.
 */
export interface GeneratedTheme {
  light: ThemeMode;
  dark: ThemeMode;
  outputFormat: ColorOutputFormat;
  /** Contrast issues found and their corrections */
  corrections: ThemeCorrection[];
  /** Warnings for the user */
  warnings: string[];
}

/**
 * A correction applied to fix a contrast issue.
 */
export interface ThemeCorrection {
  token: SemanticToken;
  pairedWith: SemanticToken;
  mode: 'light' | 'dark';
  originalValue: string;
  correctedValue: string;
  originalContrast: number;
  correctedContrast: number;
  reason: string;
}
