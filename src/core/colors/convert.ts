/**
 * @module core/colors/convert
 * @description Color conversion — transforms internal OKLCH colors to any
 * supported CSS output format (hex, rgb, hsl, oklch, or original input passthrough).
 */

import * as culori from 'culori';
import type { OklchColor, ColorOutputFormat } from '../../types/index.js';

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Build a culori-compatible OKLCH object from our `OklchColor`.
 */
function toCuloriOklch(color: OklchColor): culori.Oklch {
  return {
    mode: 'oklch',
    l: color.l,
    c: color.c,
    h: color.h,
    ...(color.alpha !== undefined ? { alpha: color.alpha } : {}),
  };
}

/**
 * Round a number to a fixed number of decimal places.
 */
function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// ─── Format helpers ─────────────────────────────────────────────────

/**
 * Format as hex string using culori.
 * Alpha is baked into an 8-digit hex when present.
 */
function formatAsHex(color: OklchColor): string {
  const culoriColor = toCuloriOklch(color);
  const hex = culori.formatHex(culoriColor);
  // If there's an alpha < 1, use 8-digit hex
  if (color.alpha !== undefined && color.alpha < 1) {
    return culori.formatHex8(culoriColor);
  }
  return hex;
}

/**
 * Format as `rgb(r g b)` or `rgb(r g b / a)`.
 */
function formatAsRgb(color: OklchColor): string {
  const culoriColor = toCuloriOklch(color);
  const rgb = culori.rgb(culoriColor);
  const r = Math.round(clamp(rgb.r, 0, 1) * 255);
  const g = Math.round(clamp(rgb.g, 0, 1) * 255);
  const b = Math.round(clamp(rgb.b, 0, 1) * 255);

  if (rgb.alpha !== undefined && rgb.alpha < 1) {
    return `rgb(${r} ${g} ${b} / ${round(rgb.alpha, 2)})`;
  }
  return `rgb(${r} ${g} ${b})`;
}

/**
 * Format as `hsl(h s% l%)` or `hsl(h s% l% / a)`.
 */
function formatAsHsl(color: OklchColor): string {
  const culoriColor = toCuloriOklch(color);
  const hsl = culori.hsl(culoriColor);
  const h = round(hsl.h ?? 0, 2);
  const s = round((hsl.s ?? 0) * 100, 2);
  const l = round((hsl.l ?? 0) * 100, 2);

  if (hsl.alpha !== undefined && hsl.alpha < 1) {
    return `hsl(${h} ${s}% ${l}% / ${round(hsl.alpha, 2)})`;
  }
  return `hsl(${h} ${s}% ${l}%)`;
}

/**
 * Format as `oklch(l c h)` or `oklch(l c h / a)`.
 */
function formatAsOklch(color: OklchColor): string {
  const l = round(color.l, 4);
  const c = round(color.c, 4);
  const h = round(color.h, 2);

  if (color.alpha !== undefined && color.alpha < 1) {
    return `oklch(${l} ${c} ${h} / ${round(color.alpha, 2)})`;
  }
  return `oklch(${l} ${c} ${h})`;
}

/** Clamp a value between min and max. */
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Convert an OKLCH color to a CSS string in the requested output format.
 *
 * When `format` is `'input'` and `originalInput` is provided, the original
 * user string is returned as-is. This preserves the author's intent.
 *
 * @param color         - Internal OKLCH color to format.
 * @param format        - Target output format.
 * @param originalInput - The original user-provided string (used with 'input' format).
 *
 * @example
 * ```ts
 * formatColor({ l: 0.63, c: 0.26, h: 29 }, 'hex');
 * // → '#ff0000'
 * ```
 */
export function formatColor(
  color: OklchColor,
  format: ColorOutputFormat,
  originalInput?: string,
): string {
  switch (format) {
    case 'input':
      return originalInput ?? formatAsOklch(color);
    case 'hex':
      return formatAsHex(color);
    case 'rgb':
      return formatAsRgb(color);
    case 'hsl':
      return formatAsHsl(color);
    case 'oklch':
      return formatAsOklch(color);
  }
}

/**
 * Shorthand: convert an OKLCH color directly to its `oklch()` CSS function.
 */
export function oklchToCss(color: OklchColor): string {
  return formatAsOklch(color);
}
