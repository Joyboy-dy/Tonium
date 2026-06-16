/**
 * @module core/colors/classify
 * @description Color classification — analyzes parsed colors to determine
 * their semantic traits (luminosity, saturation, hue family) and computes
 * suitability scores for each shadcn/ui color role.
 */

import type {
  ParsedColor,
  ClassifiedColor,
  ColorTraits,
  ColorRole,
  OklchColor,
} from '../../types/index.js';
import { contrastRatio } from './contrast.js';

// ─── Reference colors ───────────────────────────────────────────────

const WHITE: OklchColor = { l: 1, c: 0, h: 0 };
const BLACK: OklchColor = { l: 0, c: 0, h: 0 };

// ─── Trait detection helpers ────────────────────────────────────────

/**
 * Determine the luminosity category from OKLCH lightness.
 */
function getLuminosity(l: number): ColorTraits['luminosity'] {
  if (l < 0.15) return 'very-dark';
  if (l < 0.35) return 'dark';
  if (l < 0.65) return 'medium';
  if (l < 0.8) return 'light';
  return 'very-light';
}

/**
 * Determine the saturation category from OKLCH chroma.
 */
function getSaturation(c: number): ColorTraits['saturation'] {
  if (c < 0.02) return 'neutral';
  if (c < 0.08) return 'muted';
  if (c < 0.15) return 'vivid';
  return 'highly-vivid';
}

/**
 * Determine the hue family from OKLCH hue (degrees).
 * When chroma is near-zero the hue is meaningless → returns 'neutral'.
 */
function getHueFamily(h: number, c: number): ColorTraits['hueFamily'] {
  if (c < 0.02) return 'neutral';

  // Normalize hue to [0, 360)
  const hue = ((h % 360) + 360) % 360;

  if (hue < 20 || hue >= 340) return 'red';
  if (hue < 45) return 'orange';
  if (hue < 75) return 'yellow';
  if (hue < 160) return 'green';
  if (hue < 200) return 'cyan';
  if (hue < 265) return 'blue';
  if (hue < 310) return 'purple';
  return 'magenta';
}

// ─── Trait computation ──────────────────────────────────────────────

/**
 * Compute all classification traits for a given OKLCH color.
 */
function computeTraits(oklch: OklchColor): ColorTraits {
  const { l, c, h } = oklch;

  const contrastOnWhite = contrastRatio(oklch, WHITE);
  const contrastOnBlack = contrastRatio(oklch, BLACK);

  return {
    luminosity: getLuminosity(l),
    saturation: getSaturation(c),
    hueFamily: getHueFamily(h, c),
    contrastOnWhite,
    contrastOnBlack,
    canBeLightBg: l >= 0.9 && c < 0.05,
    canBeDarkBg: l <= 0.15 && c < 0.05,
    canBeText: contrastOnWhite >= 4.5 || contrastOnBlack >= 4.5,
    canBeDestructive: getHueFamily(h, c) === 'red' || getHueFamily(h, c) === 'orange',
  };
}

// ─── Scoring ────────────────────────────────────────────────────────

/**
 * Compute role suitability scores [0..1] for all `ColorRole` values.
 *
 * Scoring heuristics:
 * - **primary**: favours vivid/highly-vivid with decent contrast on both white & black.
 * - **secondary**: like primary but slightly lower expectations.
 * - **accent**: emphasises high chroma.
 * - **background**: light, desaturated colors.
 * - **foreground**: must have good contrast on white (dark text).
 * - **card / popover**: similar to background.
 * - **card-foreground / popover-foreground**: similar to foreground.
 * - **muted**: medium lightness, low chroma.
 * - **muted-foreground**: muted colors with text-level contrast.
 * - **destructive**: red/orange hue with good contrast.
 * - **destructive-foreground**: very light or very dark, good contrast with red.
 * - **border / input**: low chroma, medium-to-light.
 * - **ring**: vivid, good contrast.
 * - **primary-foreground**: very light or dark, good contrast with vivid primaries.
 * - **secondary-foreground / accent-foreground**: similar to primary-foreground.
 */
function computeScores(
  oklch: OklchColor,
  traits: ColorTraits,
): Partial<Record<ColorRole, number>> {
  const scores: Partial<Record<ColorRole, number>> = {};
  const { l, c } = oklch;
  const {
    saturation,
    luminosity,
    contrastOnWhite,
    contrastOnBlack,
    canBeLightBg,
    canBeDarkBg,
    canBeText,
    canBeDestructive,
  } = traits;

  // Utility: map a value to [0, 1] via a simple linear ramp
  const ramp = (value: number, min: number, max: number): number =>
    Math.min(1, Math.max(0, (value - min) / (max - min)));

  // ── primary ────────────────────────────────────────────────
  const primaryChroma = saturation === 'highly-vivid' ? 1 : saturation === 'vivid' ? 0.8 : saturation === 'muted' ? 0.3 : 0;
  const primaryContrast = ramp(Math.max(contrastOnWhite, contrastOnBlack), 3, 7);
  scores.primary = primaryChroma * 0.6 + primaryContrast * 0.4;

  // ── secondary ──────────────────────────────────────────────
  const secondaryChroma = saturation === 'muted' ? 0.8 : saturation === 'vivid' ? 0.6 : saturation === 'highly-vivid' ? 0.4 : 0.2;
  scores.secondary = secondaryChroma * 0.5 + ramp(l, 0.3, 0.8) * 0.5;

  // ── accent ─────────────────────────────────────────────────
  const accentChroma = ramp(c, 0.05, 0.2);
  scores.accent = accentChroma * 0.7 + primaryContrast * 0.3;

  // ── background ─────────────────────────────────────────────
  scores.background = canBeLightBg ? 1.0 : ramp(l, 0.85, 1.0) * (c < 0.05 ? 1 : 0.3);

  // ── foreground ─────────────────────────────────────────────
  scores.foreground = canBeText ? ramp(contrastOnWhite, 4.5, 15) * 0.7 + (luminosity === 'very-dark' ? 0.3 : 0) : 0;

  // ── card / popover (same as background with slight offset) ─
  scores.card = canBeLightBg ? 0.95 : ramp(l, 0.85, 1.0) * (c < 0.05 ? 0.9 : 0.2);
  scores.popover = scores.card;

  // ── card-foreground / popover-foreground ───────────────────
  scores['card-foreground'] = scores.foreground ?? 0;
  scores['popover-foreground'] = scores.foreground ?? 0;

  // ── muted ──────────────────────────────────────────────────
  const mutedLightness = ramp(l, 0.6, 0.95);
  const mutedChroma = c < 0.05 ? 1 : c < 0.1 ? 0.5 : 0;
  scores.muted = mutedLightness * 0.5 + mutedChroma * 0.5;

  // ── muted-foreground ──────────────────────────────────────
  scores['muted-foreground'] =
    canBeText
      ? (saturation === 'neutral' || saturation === 'muted' ? 0.7 : 0.3) * ramp(contrastOnWhite, 3, 7)
      : 0;

  // ── destructive ────────────────────────────────────────────
  scores.destructive = canBeDestructive
    ? ramp(c, 0.08, 0.2) * 0.5 + ramp(Math.max(contrastOnWhite, contrastOnBlack), 3, 7) * 0.5
    : 0;

  // ── destructive-foreground ─────────────────────────────────
  scores['destructive-foreground'] =
    (luminosity === 'very-light' || luminosity === 'very-dark')
      ? ramp(Math.max(contrastOnWhite, contrastOnBlack), 4, 12) * 0.8 + (c < 0.05 ? 0.2 : 0)
      : 0;

  // ── border / input ─────────────────────────────────────────
  const borderScore = (c < 0.05 ? 1 : c < 0.1 ? 0.5 : 0) * ramp(l, 0.5, 0.9);
  scores.border = borderScore;
  scores.input = borderScore;

  // ── ring ───────────────────────────────────────────────────
  scores.ring = accentChroma * 0.6 + ramp(Math.max(contrastOnWhite, contrastOnBlack), 3, 7) * 0.4;

  // ── primary-foreground ─────────────────────────────────────
  const fgOnVivid = (luminosity === 'very-light' || luminosity === 'very-dark') ? 1 : 0.2;
  scores['primary-foreground'] = fgOnVivid * 0.6 + (c < 0.05 ? 0.4 : 0);

  // ── secondary-foreground / accent-foreground ───────────────
  scores['secondary-foreground'] = scores['primary-foreground'] ?? 0;
  scores['accent-foreground'] = scores['primary-foreground'] ?? 0;

  return scores;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Classify a single parsed color: compute its traits and role scores.
 */
export function classifyColor(parsed: ParsedColor): ClassifiedColor {
  const traits = computeTraits(parsed.oklch);
  const scores = computeScores(parsed.oklch, traits);

  return { parsed, traits, scores };
}

/**
 * Classify multiple parsed colors in one call.
 */
export function classifyColors(colors: ParsedColor[]): ClassifiedColor[] {
  return colors.map(classifyColor);
}
