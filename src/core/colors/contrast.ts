/**
 * @module core/colors/contrast
 * @description WCAG 2.1 contrast ratio calculation between two OKLCH colors.
 * Uses the standard relative luminance formula and sRGB linearization.
 */

import * as culori from 'culori';
import type { OklchColor, ContrastResult } from '../../types/index.js';
import { oklchToCss } from './convert.js';

// ─── sRGB Linearization ────────────────────────────────────────────

/**
 * Linearize a single sRGB channel value [0, 1] → linear-light.
 * Uses the piecewise sRGB transfer function from the WCAG spec.
 */
function linearize(channel: number): number {
  if (channel <= 0.04045) {
    return channel / 12.92;
  }
  return ((channel + 0.055) / 1.055) ** 2.4;
}

// ─── Relative Luminance ─────────────────────────────────────────────

/**
 * Compute the WCAG relative luminance of an OKLCH color.
 * Converts to sRGB first, then applies the standard coefficients.
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(color: OklchColor): number {
  const culoriColor: culori.Oklch = {
    mode: 'oklch',
    l: color.l,
    c: color.c,
    h: color.h,
  };

  const rgb = culori.rgb(culoriColor);

  // Clamp to [0, 1] to avoid out-of-gamut artifacts
  const r = clamp01(rgb.r ?? 0);
  const g = clamp01(rgb.g ?? 0);
  const b = clamp01(rgb.b ?? 0);

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Clamp a value to [0, 1]. */
function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Calculate the WCAG 2.1 contrast ratio between two OKLCH colors.
 *
 * The result is always ≥ 1, with 21 being maximum contrast (black on white).
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function contrastRatio(color1: OklchColor, color2: OklchColor): number {
  const lum1 = relativeLuminance(color1);
  const lum2 = relativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Perform a full WCAG contrast check between a foreground and background,
 * returning the ratio and AA / AA-Large pass status.
 *
 * @param fg     - Foreground OKLCH color.
 * @param bg     - Background OKLCH color.
 * @param fgName - Human-readable label for the foreground (used in the result).
 * @param bgName - Human-readable label for the background (used in the result).
 */
export function checkContrast(
  fg: OklchColor,
  bg: OklchColor,
  fgName: string,
  bgName: string,
): ContrastResult {
  const ratio = contrastRatio(fg, bg);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    passesAALarge: ratio >= 3.0,
    foreground: fgName || oklchToCss(fg),
    background: bgName || oklchToCss(bg),
  };
}
