/**
 * @module core/colors/parse
 * @description Color parsing — accepts any CSS color string, detects its format,
 * and normalizes it to the internal OKLCH representation via culori.
 */

import * as culori from 'culori';
import type { ColorInputFormat, ParsedColor, OklchColor } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

// ─── Format Detection ──────────────────────────────────────────────

/**
 * Detect the input format of a raw color string.
 * Returns the matching `ColorInputFormat` or `null` if detection is
 * impossible before attempting an actual parse.
 */
function detectInputFormat(raw: string): ColorInputFormat | null {
  const trimmed = raw.trim().toLowerCase();

  if (trimmed.startsWith('#')) return 'hex';
  if (trimmed.startsWith('rgba(')) return 'rgba';
  if (trimmed.startsWith('rgb(')) return 'rgb';
  if (trimmed.startsWith('hsla(')) return 'hsla';
  if (trimmed.startsWith('hsl(')) return 'hsl';
  if (trimmed.startsWith('oklch(')) return 'oklch';
  if (trimmed.startsWith('oklab(')) return 'oklab';
  if (trimmed.startsWith('lch(')) return 'lch';
  if (trimmed.startsWith('lab(')) return 'lab';

  // If culori can parse it, treat it as a named CSS color
  return null;
}

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Safely convert a culori color object to an `OklchColor`.
 * Handles missing/NaN values gracefully.
 */
function toOklch(parsed: culori.Color): OklchColor {
  const oklch = culori.oklch(parsed);

  return {
    l: clamp01(oklch?.l ?? 0),
    c: Math.max(0, oklch?.c ?? 0),
    h: normalizeHue(oklch?.h ?? 0),
    ...(oklch?.alpha !== undefined && oklch.alpha < 1 ? { alpha: clamp01(oklch.alpha) } : {}),
  };
}

/** Clamp a number to [0, 1]. */
function clamp01(v: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
}

/** Normalize a hue value to [0, 360). */
function normalizeHue(h: number): number {
  if (!Number.isFinite(h)) return 0;
  return ((h % 360) + 360) % 360;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Parse a single color string into a `ParsedColor`.
 *
 * Supports: hex, rgb(a), hsl(a), oklch, oklab, lch, lab, and named CSS colors.
 * Returns `null` when the input cannot be parsed.
 *
 * @example
 * ```ts
 * const red = parseColor('#ff0000');
 * // { original: '#ff0000', inputFormat: 'hex', oklch: { l: 0.627..., c: 0.257..., h: 29.23... } }
 * ```
 */
export function parseColor(input: string): ParsedColor | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  // Attempt to parse with culori
  const parsed = culori.parse(trimmed);
  if (!parsed) return null;

  // Detect format (fall back to 'named' if the string parses but isn't a
  // recognizable function/hex syntax)
  const inputFormat: ColorInputFormat = detectInputFormat(trimmed) ?? 'named';

  const oklch = toOklch(parsed);

  return {
    original: trimmed,
    inputFormat,
    oklch,
  };
}

/**
 * Parse multiple color strings in one shot.
 * Invalid inputs are silently skipped after emitting a warning.
 *
 * @returns An array of successfully parsed colors (order preserved).
 */
export function parseColors(inputs: string[]): ParsedColor[] {
  const results: ParsedColor[] = [];

  for (const input of inputs) {
    const result = parseColor(input);
    if (result) {
      results.push(result);
    } else {
      logger.warn(`Couleur invalide ignorée : "${input}"`);
    }
  }

  return results;
}
