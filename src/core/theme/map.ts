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
  source: TokenAssignment['source'],
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

function chooseForegroundColor(bg: OklchColor, targetRatio = 4.5): OklchColor {
  const neutralCandidates: OklchColor[] = [
    { l: 1, c: 0, h: 0 },
    { l: 0, c: 0, h: 0 },
    { l: 0.985, c: 0, h: 0 },
    { l: 0.145, c: 0, h: 0 },
  ];

  const ranked = neutralCandidates
    .map((color) => ({ color, ratio: contrastRatio(color, bg) }))
    .sort((a, b) => b.ratio - a.ratio);

  return (ranked.find((candidate) => candidate.ratio >= targetRatio) ?? ranked[0]).color;
}

function chooseDarkBrand(
  original: OklchColor,
  darkBackground: OklchColor,
): { color: OklchColor; source: 'preserved' | 'adjusted' } {
  const minSurfaceContrast = 2.0;
  const foreground = chooseForegroundColor(original);

  if (
    contrastRatio(original, darkBackground) >= minSurfaceContrast &&
    contrastRatio(foreground, original) >= 4.5
  ) {
    return { color: original, source: 'preserved' };
  }

  let adjusted: OklchColor = { ...original };

  for (let i = 0; i < 12; i++) {
    adjusted = {
      ...adjusted,
      l: Math.min(0.86, adjusted.l + 0.035),
      c: Math.max(0, adjusted.c * 0.96),
    };

    const adjustedForeground = chooseForegroundColor(adjusted);
    if (
      contrastRatio(adjusted, darkBackground) >= minSurfaceContrast &&
      contrastRatio(adjustedForeground, adjusted) >= 4.5
    ) {
      return { color: adjusted, source: 'adjusted' };
    }
  }

  return { color: adjusted, source: 'adjusted' };
}

function isDangerColor(color: ClassifiedColor): boolean {
  const { l, c } = color.parsed.oklch;
  const hue = color.traits.hueFamily;

  return (
    (hue === 'red' || hue === 'orange') &&
    c >= 0.12 &&
    l >= 0.35 &&
    l <= 0.72
  );
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

function clampLightness(l: number): number {
  return Math.max(0, Math.min(1, l));
}

function surfaceCandidate(
  background: OklchColor,
  mode: 'light' | 'dark',
  offset: number,
): OklchColor {
  const direction = mode === 'dark' ? 1 : background.l > 0.96 ? -1 : 1;

  return {
    l: clampLightness(background.l + direction * offset),
    c: background.c * 0.45,
    h: background.h,
  };
}

function ensureSeparatedSurface(
  color: OklchColor,
  background: OklchColor,
  mode: 'light' | 'dark',
  minContrast: number,
  minLightnessDelta: number,
): OklchColor {
  const direction = mode === 'dark' ? 1 : background.l > 0.96 ? -1 : 1;
  let adjusted: OklchColor = { ...color };

  for (let i = 0; i < 16; i++) {
    const lightnessDelta = Math.abs(adjusted.l - background.l);
    if (
      lightnessDelta >= minLightnessDelta &&
      contrastRatio(adjusted, background) >= minContrast
    ) {
      return adjusted;
    }

    adjusted = {
      ...adjusted,
      l: clampLightness(adjusted.l + direction * 0.012),
      c: adjusted.c * 0.9,
    };
  }

  return adjusted;
}

function setSurfaceToken(
  tokens: Map<string, { value: string; source: TokenAssignment['source'] }>,
  token: string,
  color: OklchColor,
  format: ColorOutputFormat,
): void {
  tokens.set(token, { value: formatColor(color, format), source: 'generated' });
}

function enforceSurfaceSeparation(
  tokens: Map<string, { value: string; source: TokenAssignment['source'] }>,
  mode: 'light' | 'dark',
  format: ColorOutputFormat,
): void {
  const background = cssToOklch(tokens.get('background')?.value ?? LIGHT_DEFAULTS.background);
  const card = ensureSeparatedSurface(
    surfaceCandidate(background, mode, mode === 'dark' ? 0.045 : 0.025),
    background,
    mode,
    mode === 'dark' ? 1.08 : 1.04,
    mode === 'dark' ? 0.035 : 0.018,
  );
  const popover = ensureSeparatedSurface(
    surfaceCandidate(background, mode, mode === 'dark' ? 0.065 : 0.035),
    background,
    mode,
    mode === 'dark' ? 1.1 : 1.05,
    mode === 'dark' ? 0.05 : 0.025,
  );
  const sidebar = ensureSeparatedSurface(
    surfaceCandidate(background, mode, mode === 'dark' ? 0.035 : 0.02),
    background,
    mode,
    mode === 'dark' ? 1.06 : 1.035,
    mode === 'dark' ? 0.03 : 0.015,
  );
  const muted = ensureSeparatedSurface(
    surfaceCandidate(background, mode, mode === 'dark' ? 0.085 : 0.045),
    background,
    mode,
    mode === 'dark' ? 1.12 : 1.06,
    mode === 'dark' ? 0.065 : 0.035,
  );
  const border = ensureSeparatedSurface(
    surfaceCandidate(background, mode, mode === 'dark' ? 0.12 : 0.08),
    background,
    mode,
    mode === 'dark' ? 1.25 : 1.16,
    mode === 'dark' ? 0.09 : 0.06,
  );
  const input = ensureSeparatedSurface(
    surfaceCandidate(background, mode, mode === 'dark' ? 0.1 : 0.07),
    background,
    mode,
    mode === 'dark' ? 1.2 : 1.13,
    mode === 'dark' ? 0.075 : 0.05,
  );

  setSurfaceToken(tokens, 'card', card, format);
  setSurfaceToken(tokens, 'popover', popover, format);
  setSurfaceToken(tokens, 'sidebar', sidebar, format);
  setSurfaceToken(tokens, 'muted', muted, format);
  setSurfaceToken(tokens, 'border', border, format);
  setSurfaceToken(tokens, 'input', input, format);
  setSurfaceToken(tokens, 'sidebar-border', border, format);
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
  const lightTokens: Map<string, { value: string; source: TokenAssignment['source'] }> = new Map();
  const darkTokens: Map<string, { value: string; source: TokenAssignment['source'] }> = new Map();

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
  if (lightBgCandidate) {
    const bgValue = formatClassified(lightBgCandidate, format);
    lightTokens.set('background', { value: bgValue, source: 'palette' });

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
  //         AND not already used as a brand token (primary / secondary / accent).
  // -----------------------------------------------------------------------

  // Collect the formatted values of brand tokens already assigned
  const assignedBrandValues = new Set<string>([
    lightTokens.get('primary')?.value,
    lightTokens.get('secondary')?.value,
    lightTokens.get('accent')?.value,
  ].filter(Boolean) as string[]);

  /**
   * Returns true when a danger candidate is still "available" — i.e. its
   * formatted color value has NOT already been assigned to a brand token.
   */
  function isDangerAndAvailable(color: ClassifiedColor): boolean {
    if (!isDangerColor(color)) return false;
    const formatted = formatClassified(color, format);
    return !assignedBrandValues.has(formatted);
  }

  // Try to find a danger color that is not already a brand token
  const destructiveCandidate = colors.find(isDangerAndAvailable);

  if (destructiveCandidate) {
    // A distinct danger color exists in the palette — use it.
    const destValue = formatClassified(destructiveCandidate, format);
    const destFg = chooseForeground(destructiveCandidate.parsed.oklch, format);

    lightTokens.set('destructive', { value: destValue, source: 'palette' });
    lightTokens.set('destructive-foreground', { value: destFg, source: 'generated' });
    darkTokens.set('destructive-foreground', {
      value: chooseForeground(cssToOklch(DARK_DEFAULTS.destructive), format),
      source: 'generated',
    });
  } else {
    // No available danger color: fall back to the shadcn default destructive.
    // This covers:
    //   a) palette has no red/orange at all (purely safe colours)
    //   b) the only red/orange in the palette is already used as primary/secondary/accent
    // In case (b) we do NOT reuse the brand token for destructive — the default
    // shadcn destructive (oklch ~0.577 0.245 27) is semantically unambiguous.
    lightTokens.set('destructive-foreground', {
      value: chooseForeground(cssToOklch(LIGHT_DEFAULTS.destructive), format),
      source: 'generated',
    });
    darkTokens.set('destructive-foreground', {
      value: chooseForeground(cssToOklch(DARK_DEFAULTS.destructive), format),
      source: 'generated',
    });
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

  enforceSurfaceSeparation(lightTokens, 'light', format);

  // -----------------------------------------------------------------------
  // Step 9: Generate dark mode. Brand colors are preserved when usable.
  // -----------------------------------------------------------------------
  for (const [token, entry] of lightTokens) {
    // Skip radius — it's the same in both modes
    if (token === 'radius') continue;

    // If still default, keep the dark default
    if (entry.source === 'default') continue;

    if (isBrandSurfaceToken(token)) continue;
    if (isBrandForegroundToken(token)) continue;
    if (token === 'destructive-foreground') continue;

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

  enforceSurfaceSeparation(darkTokens, 'dark', format);

  applyDarkBrandToken(darkTokens, 'primary', primary.parsed.oklch, format);
  applyDarkBrandToken(darkTokens, 'sidebar-primary', primary.parsed.oklch, format);

  if (secondary) {
    applyDarkBrandToken(darkTokens, 'secondary', secondary.parsed.oklch, format);
  }

  if (accent) {
    applyDarkBrandToken(darkTokens, 'accent', accent.parsed.oklch, format);
    applyDarkBrandToken(darkTokens, 'sidebar-accent', accent.parsed.oklch, format);
  } else {
    const generatedAccent = cssToOklch(lightTokens.get('accent')?.value ?? LIGHT_DEFAULTS.accent);
    applyDarkBrandToken(darkTokens, 'accent', generatedAccent, format, 'generated');
    applyDarkBrandToken(darkTokens, 'sidebar-accent', generatedAccent, format, 'generated');
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
  tokens: Map<string, { value: string; source: TokenAssignment['source'] }>,
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
  lightTokens: Map<string, { value: string; source: TokenAssignment['source'] }>,
  darkTokens: Map<string, { value: string; source: TokenAssignment['source'] }>,
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

function isBrandSurfaceToken(token: string): boolean {
  return ['primary', 'secondary', 'accent', 'sidebar-primary', 'sidebar-accent'].includes(token);
}

function isBrandForegroundToken(token: string): boolean {
  return [
    'primary-foreground',
    'secondary-foreground',
    'accent-foreground',
    'sidebar-primary-foreground',
    'sidebar-accent-foreground',
  ].includes(token);
}

function applyDarkBrandToken(
  tokens: Map<string, { value: string; source: TokenAssignment['source'] }>,
  token: string,
  original: OklchColor,
  format: ColorOutputFormat,
  fallbackSource?: TokenAssignment['source'],
): void {
  const darkBackground = cssToOklch(tokens.get('background')?.value ?? DARK_DEFAULTS.background);
  const selected = chooseDarkBrand(original, darkBackground);
  const source = fallbackSource === 'generated' ? 'generated' : selected.source;
  const value = formatColor(selected.color, format);
  tokens.set(token, { value, source });
  tokens.set(`${token}-foreground`, {
    value: chooseForeground(selected.color, format),
    source: 'generated',
  });
}
