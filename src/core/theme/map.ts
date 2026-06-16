/**
 * @module core/theme/map
 *
 * Palette → Theme mapping engine.
 *
 * This is the CORE intelligence of Tonium.
 *
 * Strategy:
 * 1. Start with ALL shadcn/ui defaults for every token.
 * 2. Select 4-6 strongest colors from the user's palette (by chroma).
 * 3. Assign brand tokens (primary, secondary, accent) using heuristic scoring.
 * 4. Assign surface tokens only if the palette has good light/dark candidates.
 * 5. Assign destructive only if a red/orange with good contrast is present.
 * 6. Derive interaction tokens from the background.
 * 7. Generate dark mode by inverting lightness relationships.
 * 8. Run contrast checks on all TOKEN_PAIRS and auto-correct failures.
 */

import type {
  ClassifiedColor,
  ColorOutputFormat,
  OklchColor,
  GeneratedTheme,
  ThemeMode,
  TokenAssignment,
  ThemeCorrection,
  SemanticToken,
} from '../../types/index.js';
import { formatColor } from '../colors/convert.js';
import { contrastRatio } from '../colors/contrast.js';
import { adjustForContrast } from '../colors/adjust.js';
import { parseColor } from '../colors/parse.js';
import { LIGHT_DEFAULTS, DARK_DEFAULTS } from './defaults.js';
import { TOKEN_PAIRS, BRAND_TOKENS } from './tokens.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Select the top N colors by chroma (vividity).
 * Filters out near-neutral colors first, then sorts by chroma descending.
 */
function selectStrongestColors(
  colors: ClassifiedColor[],
  max: number,
): ClassifiedColor[] {
  // Filter out neutrals — they're not useful for brand/accent tokens
  const chromatic = colors.filter((c) => c.traits.saturation !== 'neutral');

  // Sort by chroma (OKLCH chroma = c.parsed.oklch.c)
  const sorted = [...chromatic].sort((a, b) => b.parsed.oklch.c - a.parsed.oklch.c);

  return sorted.slice(0, max);
}

/**
 * Check if two hues are sufficiently different (at least `minDelta` degrees apart).
 */
function huesAreDifferent(h1: number, h2: number, minDelta = 30): boolean {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff) >= minDelta;
}

/**
 * Format an OklchColor to the desired output format string.
 */
function formatClassified(color: ClassifiedColor, format: ColorOutputFormat): string {
  return formatColor(color.parsed.oklch, format);
}

/**
 * Parse a CSS color string into an OklchColor.
 * Returns a neutral fallback if parsing fails.
 */
function cssToOklch(cssValue: string): OklchColor {
  const parsed = parseColor(cssValue);
  if (parsed) return parsed.oklch;
  // Fallback: neutral gray
  return { l: 0.5, c: 0, h: 0 };
}

/**
 * Build a token assignment object.
 */
function assign(
  token: SemanticToken,
  value: string,
  source: 'default' | 'palette' | 'generated' | 'preserved',
): TokenAssignment {
  return { token, value, source };
}

/**
 * Prefer neutral foregrounds for UI readability. Color-tinted foregrounds are
 * a fallback only when the neutral candidates cannot satisfy the target.
 */
function chooseForeground(
  bg: OklchColor,
  format: ColorOutputFormat,
  targetRatio = 4.5,
): string {
  const neutralCandidates: OklchColor[] = [
    { l: 1, c: 0, h: 0 },
    { l: 0, c: 0, h: 0 },
    { l: 0.985, c: 0, h: 0 },
    { l: 0.145, c: 0, h: 0 },
  ];

  const ranked = neutralCandidates
    .map((color) => ({ color, ratio: contrastRatio(color, bg) }))
    .sort((a, b) => b.ratio - a.ratio);

  const neutral = ranked.find((candidate) => candidate.ratio >= targetRatio) ?? ranked[0];
  if (neutral) {
    return formatColor(neutral.color, format);
  }

  return formatColor(adjustForContrast({ ...bg }, bg, targetRatio), format);
}

/**
 * Invert lightness for dark mode.
 * Maps L from light-space to dark-space:
 *  - Very light (>0.9) → very dark (~0.15-0.20)
 *  - Very dark (<0.2)  → very light (~0.95-0.98)
 *  - Middle values get a symmetric flip around 0.5
 */
function invertLightness(l: number): number {
  // Simple symmetric flip with clamping
  return Math.max(0, Math.min(1, 1 - l));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Map a palette of classified colors to a complete shadcn/ui theme.
 *
 * @param colors - Classified colors from the user's palette
 * @param format - Desired output color format for CSS values
 * @returns A complete GeneratedTheme with light/dark modes and corrections
 */
export function mapPaletteToTheme(
  colors: ClassifiedColor[],
  format: ColorOutputFormat,
): GeneratedTheme {
  const warnings: string[] = [];
  const corrections: ThemeCorrection[] = [];

  // -----------------------------------------------------------------------
  // Step 1: Start with defaults for all tokens
  // -----------------------------------------------------------------------
  const lightTokens: Map<string, { value: string; source: 'default' | 'palette' | 'generated' | 'preserved' }> = new Map();
  const darkTokens: Map<string, { value: string; source: 'default' | 'palette' | 'generated' | 'preserved' }> = new Map();

  for (const [token, value] of Object.entries(LIGHT_DEFAULTS)) {
    lightTokens.set(token, { value, source: 'default' });
  }
  for (const [token, value] of Object.entries(DARK_DEFAULTS)) {
    darkTokens.set(token, { value, source: 'default' });
  }

  // -----------------------------------------------------------------------
  // Step 2: Select strongest palette colors
  // -----------------------------------------------------------------------
  const strongest = selectStrongestColors(colors, 6);

  if (strongest.length === 0) {
    warnings.push('No chromatic colors found in palette — using all defaults');
    return buildTheme(lightTokens, darkTokens, format, corrections, warnings);
  }

  // -----------------------------------------------------------------------
  // Step 3: Assign primary — highest-scoring for 'primary' role
  // -----------------------------------------------------------------------
  let primary: ClassifiedColor | undefined;
  let primaryScore = -1;

  for (const color of strongest) {
    const score = color.scores.primary ?? 0;
    if (score > primaryScore) {
      primaryScore = score;
      primary = color;
    }
  }

  // Fallback: just pick the most chromatic color
  if (!primary) {
    primary = strongest[0];
  }

  const primaryValue = formatClassified(primary, format);
  const primaryFg = chooseForeground(primary.parsed.oklch, format);

  lightTokens.set('primary', { value: primaryValue, source: 'palette' });
  lightTokens.set('primary-foreground', { value: primaryFg, source: 'generated' });

  // Also set sidebar-primary to match
  lightTokens.set('sidebar-primary', { value: primaryValue, source: 'palette' });
  lightTokens.set('sidebar-primary-foreground', { value: primaryFg, source: 'generated' });

  // -----------------------------------------------------------------------
  // Step 4: Assign secondary — different hue from primary
  // -----------------------------------------------------------------------
  let secondary: ClassifiedColor | undefined;
  let secondaryScore = -1;

  for (const color of strongest) {
    if (color === primary) continue;

    const hDiff = huesAreDifferent(color.parsed.oklch.h, primary.parsed.oklch.h);
    if (!hDiff) continue;

    const score = color.scores.secondary ?? color.parsed.oklch.c;
    if (score > secondaryScore) {
      secondaryScore = score;
      secondary = color;
    }
  }

  if (secondary) {
    const secValue = formatClassified(secondary, format);
    const secFg = chooseForeground(secondary.parsed.oklch, format);

    lightTokens.set('secondary', { value: secValue, source: 'palette' });
    lightTokens.set('secondary-foreground', { value: secFg, source: 'generated' });
  } else {
    warnings.push('No suitable secondary color found — using default');
  }

  // -----------------------------------------------------------------------
  // Step 5: Assign accent — another distinct color, or derived from primary
  // -----------------------------------------------------------------------
  let accent: ClassifiedColor | undefined;
  let accentScore = -1;

  for (const color of strongest) {
    if (color === primary || color === secondary) continue;

    const diffFromPrimary = huesAreDifferent(color.parsed.oklch.h, primary.parsed.oklch.h, 20);
    const diffFromSecondary = secondary
      ? huesAreDifferent(color.parsed.oklch.h, secondary.parsed.oklch.h, 20)
      : true;

    if (!diffFromPrimary && !diffFromSecondary) continue;

    const score = color.scores.accent ?? color.parsed.oklch.c;
    if (score > accentScore) {
      accentScore = score;
      accent = color;
    }
  }

  if (accent) {
    const accValue = formatClassified(accent, format);
    const accFg = chooseForeground(accent.parsed.oklch, format);

    lightTokens.set('accent', { value: accValue, source: 'palette' });
    lightTokens.set('accent-foreground', { value: accFg, source: 'generated' });

    // Also set sidebar-accent
    lightTokens.set('sidebar-accent', { value: accValue, source: 'palette' });
    lightTokens.set('sidebar-accent-foreground', { value: accFg, source: 'generated' });
  } else {
    // Derive accent from primary with shifted hue
    const accentOklch = {
      ...primary.parsed.oklch,
      h: (primary.parsed.oklch.h + 30) % 360,
      c: primary.parsed.oklch.c * 0.7,
    };
    const accValue = formatColor(accentOklch, format);
    const accFg = chooseForeground(accentOklch, format);

    lightTokens.set('accent', { value: accValue, source: 'generated' });
    lightTokens.set('accent-foreground', { value: accFg, source: 'generated' });
    lightTokens.set('sidebar-accent', { value: accValue, source: 'generated' });
    lightTokens.set('sidebar-accent-foreground', { value: accFg, source: 'generated' });

    warnings.push('Accent color derived from primary (shifted hue)');
  }

  // -----------------------------------------------------------------------
  // Step 6: Surface tokens — only replace if palette has good candidates
  // -----------------------------------------------------------------------
  const lightBgCandidate = colors.find((c) => c.traits.canBeLightBg);
  const darkBgCandidate = colors.find((c) => c.traits.canBeDarkBg);

  if (lightBgCandidate) {
    const bgValue = formatClassified(lightBgCandidate, format);
    lightTokens.set('background', { value: bgValue, source: 'palette' });
    lightTokens.set('card', { value: bgValue, source: 'palette' });
    lightTokens.set('popover', { value: bgValue, source: 'palette' });
    lightTokens.set('sidebar', { value: bgValue, source: 'palette' });

    // Derive foreground — need something dark for contrast
    const fgOklch = { l: 0.145, c: lightBgCandidate.parsed.oklch.c * 0.1, h: lightBgCandidate.parsed.oklch.h };
    const fgValue = formatColor(fgOklch, format);
    lightTokens.set('foreground', { value: fgValue, source: 'generated' });
    lightTokens.set('card-foreground', { value: fgValue, source: 'generated' });
    lightTokens.set('popover-foreground', { value: fgValue, source: 'generated' });
    lightTokens.set('sidebar-foreground', { value: fgValue, source: 'generated' });
  }

  // -----------------------------------------------------------------------
  // Step 7: Destructive — only use palette color if red/orange with good contrast
  // -----------------------------------------------------------------------
  const destructiveCandidate = colors.find(
    (c) => c.traits.canBeDestructive && c.traits.saturation !== 'neutral',
  );

  if (destructiveCandidate) {
    const destValue = formatClassified(destructiveCandidate, format);
    const destFg = chooseForeground(destructiveCandidate.parsed.oklch, format);

    lightTokens.set('destructive', { value: destValue, source: 'palette' });
    lightTokens.set('destructive-foreground', { value: destFg, source: 'generated' });
  }

  // -----------------------------------------------------------------------
  // Step 8: Interaction tokens — derive from background
  // -----------------------------------------------------------------------
  if (lightBgCandidate) {
    const bgL = lightBgCandidate.parsed.oklch.l;
    const bgC = lightBgCandidate.parsed.oklch.c;
    const bgH = lightBgCandidate.parsed.oklch.h;

    // Border: slightly darker than background
    const borderValue = formatColor({ l: bgL - 0.08, c: bgC * 0.5, h: bgH }, format);
    lightTokens.set('border', { value: borderValue, source: 'generated' });
    lightTokens.set('sidebar-border', { value: borderValue, source: 'generated' });

    // Input: same as border
    lightTokens.set('input', { value: borderValue, source: 'generated' });

    // Ring: more visible than border
    const ringValue = formatColor({ l: bgL - 0.15, c: bgC * 0.3, h: bgH }, format);
    lightTokens.set('ring', { value: ringValue, source: 'generated' });
    lightTokens.set('sidebar-ring', { value: ringValue, source: 'generated' });

    // Muted: slightly darker bg
    const mutedValue = formatColor({ l: bgL - 0.03, c: bgC * 0.3, h: bgH }, format);
    lightTokens.set('muted', { value: mutedValue, source: 'generated' });

    // Muted foreground: dimmed text
    const mutedFgValue = formatColor({ l: 0.45, c: bgC * 0.1, h: bgH }, format);
    lightTokens.set('muted-foreground', { value: mutedFgValue, source: 'generated' });
  }

  // -----------------------------------------------------------------------
  // Step 9: Generate dark mode by inverting lightness
  // -----------------------------------------------------------------------
  for (const [token, entry] of lightTokens) {
    // Skip radius — it's the same in both modes
    if (token === 'radius') continue;

    // If still default, keep the dark default
    if (entry.source === 'default') continue;

    // Parse the OKLCH values for inversion
    const oklchMatch = entry.value.match(
      /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/,
    );

    if (oklchMatch) {
      const l = parseFloat(oklchMatch[1]);
      const c = parseFloat(oklchMatch[2]);
      const h = parseFloat(oklchMatch[3]);

      const darkL = invertLightness(l);
      const darkValue = formatColor({ l: darkL, c, h }, format);

      darkTokens.set(token, { value: darkValue, source: entry.source });
    }
  }

  // Special handling: dark foregrounds need to be explicitly paired
  // Re-generate foregrounds in dark mode for brand tokens
  for (const brandToken of BRAND_TOKENS) {
    const darkBrand = darkTokens.get(brandToken);
    if (darkBrand && darkBrand.source !== 'default') {
      const oklchMatch = darkBrand.value.match(
        /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/,
      );
      if (oklchMatch) {
        const l = parseFloat(oklchMatch[1]);
        const c = parseFloat(oklchMatch[2]);
        const h = parseFloat(oklchMatch[3]);
        const fgValue = chooseForeground({ l, c, h }, format);
        darkTokens.set(`${brandToken}-foreground`, { value: fgValue, source: 'generated' });
      }
    }
  }

  // -----------------------------------------------------------------------
  // Steps 10-11: Contrast checks and auto-correction
  // -----------------------------------------------------------------------
  runContrastChecks(lightTokens, 'light', format, corrections);
  runContrastChecks(darkTokens, 'dark', format, corrections);

  // -----------------------------------------------------------------------
  // Step 12: Build the final theme
  // -----------------------------------------------------------------------
  return buildTheme(lightTokens, darkTokens, format, corrections, warnings);
}

// ---------------------------------------------------------------------------
// Contrast checking + auto-correction
// ---------------------------------------------------------------------------

/**
 * Run contrast checks for all TOKEN_PAIRS and auto-correct failures.
 */
function runContrastChecks(
  tokens: Map<string, { value: string; source: 'default' | 'palette' | 'generated' | 'preserved' }>,
  mode: 'light' | 'dark',
  format: ColorOutputFormat,
  corrections: ThemeCorrection[],
): void {
  for (const pair of TOKEN_PAIRS) {
    const bgEntry = tokens.get(pair.bg);
    const fgEntry = tokens.get(pair.fg);

    if (!bgEntry || !fgEntry) continue;

    const bgOklch = cssToOklch(bgEntry.value);
    const fgOklch = cssToOklch(fgEntry.value);
    const ratio = contrastRatio(fgOklch, bgOklch);

    if (ratio < pair.minContrast) {
      // Attempt auto-correction on the foreground
      const correctedOklch = adjustForContrast(fgOklch, bgOklch, pair.minContrast);
      const correctedFormatted = formatColor(correctedOklch, format);
      const newRatio = contrastRatio(correctedOklch, bgOklch);

      corrections.push({
        token: pair.fg as SemanticToken,
        pairedWith: pair.bg as SemanticToken,
        mode,
        originalValue: fgEntry.value,
        correctedValue: correctedFormatted,
        originalContrast: Math.round(ratio * 100) / 100,
        correctedContrast: Math.round(newRatio * 100) / 100,
        reason: `Contrast ${ratio.toFixed(2)}:1 below ${pair.minContrast}:1 minimum`,
      });

      tokens.set(pair.fg, { value: correctedFormatted, source: 'generated' });
    }
  }
}

// ---------------------------------------------------------------------------
// Theme builder
// ---------------------------------------------------------------------------

/**
 * Build the final GeneratedTheme from token maps.
 */
function buildTheme(
  lightTokens: Map<string, { value: string; source: 'default' | 'palette' | 'generated' | 'preserved' }>,
  darkTokens: Map<string, { value: string; source: 'default' | 'palette' | 'generated' | 'preserved' }>,
  format: ColorOutputFormat,
  corrections: ThemeCorrection[],
  warnings: string[],
): GeneratedTheme {
  const lightAssignments: TokenAssignment[] = [];
  const darkAssignments: TokenAssignment[] = [];

  for (const [token, entry] of lightTokens) {
    lightAssignments.push(assign(token as SemanticToken, entry.value, entry.source));
  }

  for (const [token, entry] of darkTokens) {
    darkAssignments.push(assign(token as SemanticToken, entry.value, entry.source));
  }

  const light: ThemeMode = { mode: 'light', tokens: lightAssignments };
  const dark: ThemeMode = { mode: 'dark', tokens: darkAssignments };

  return {
    light,
    dark,
    outputFormat: format,
    corrections,
    warnings,
  };
}
