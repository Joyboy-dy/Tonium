/**
 * @module core/theme/tokens
 *
 * Token pair definitions and categorization.
 *
 * Defines contrast pairs (which bg/fg combinations must pass WCAG),
 * and groups tokens by their semantic role in a shadcn/ui theme.
 */

// ---------------------------------------------------------------------------
// Contrast pairs
// ---------------------------------------------------------------------------

/**
 * Contrast pairs to verify.
 *
 * Each pair defines a background token, a foreground token, and the minimum
 * WCAG contrast ratio required between them.
 *
 * - 4.5 → WCAG AA for normal text
 * - 3.0 → WCAG AA for large text / UI elements
 */
export const TOKEN_PAIRS: Array<{ bg: string; fg: string; minContrast: number }> = [
  // Text contrast pairs — must pass WCAG AA (4.5:1)
  { bg: 'background', fg: 'foreground', minContrast: 4.5 },
  { bg: 'card', fg: 'card-foreground', minContrast: 4.5 },
  { bg: 'popover', fg: 'popover-foreground', minContrast: 4.5 },
  { bg: 'primary', fg: 'primary-foreground', minContrast: 4.5 },
  { bg: 'secondary', fg: 'secondary-foreground', minContrast: 4.5 },
  { bg: 'muted', fg: 'muted-foreground', minContrast: 4.5 },
  { bg: 'accent', fg: 'accent-foreground', minContrast: 4.5 },
  { bg: 'destructive', fg: 'destructive-foreground', minContrast: 4.5 },

  // Focus indicators should stay clearly visible. Borders and inputs remain subtle.
  { bg: 'background', fg: 'ring', minContrast: 3.0 },
];

// ---------------------------------------------------------------------------
// Token categories
// ---------------------------------------------------------------------------

/**
 * Brand tokens — the main colorful tokens that define the theme's personality.
 */
export const BRAND_TOKENS: string[] = ['primary', 'secondary', 'accent'];

/**
 * Surface tokens — backgrounds and their corresponding foreground text colors.
 */
export const SURFACE_TOKENS: string[] = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'muted',
  'muted-foreground',
];

/**
 * Interaction tokens — borders, inputs, and focus rings.
 */
export const INTERACTION_TOKENS: string[] = ['border', 'input', 'ring'];

/**
 * Status tokens — semantic colors for destructive / error states.
 */
export const STATUS_TOKENS: string[] = ['destructive', 'destructive-foreground'];
