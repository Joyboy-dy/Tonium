/**
 * @module core/colors/adjust
 * @description Contrast-aware color adjustment — iteratively tunes OKLCH lightness
 * via binary search to meet a target WCAG contrast ratio, preserving hue and chroma.
 */

import type { OklchColor } from '../../types/index.js';
import { contrastRatio } from './contrast.js';

// ─── Constants ──────────────────────────────────────────────────────

/** Maximum iterations for the binary search. */
const MAX_ITERATIONS = 20;

/** Default target contrast ratio (WCAG AA for normal text). */
const DEFAULT_TARGET_RATIO = 4.5;

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Adjust the lightness of a foreground color so that it reaches
 * (or exceeds) the `targetRatio` contrast against the given background.
 *
 * **Strategy:**
 * - If the background is light (l > 0.5), darken the foreground (search toward 0).
 * - If the background is dark (l ≤ 0.5), lighten the foreground (search toward 1).
 * - Binary search narrows the lightness range in at most 20 iterations.
 * - Hue and chroma are preserved to keep the color identity intact.
 *
 * @param fg          - Foreground color to adjust.
 * @param bg          - Background color (remains unchanged).
 * @param targetRatio - Desired minimum contrast ratio (default 4.5 for WCAG AA).
 * @returns A new `OklchColor` with adjusted lightness.
 */
export function adjustForContrast(
  fg: OklchColor,
  bg: OklchColor,
  targetRatio: number = DEFAULT_TARGET_RATIO,
): OklchColor {
  // If the current color already meets the target, return as-is
  if (contrastRatio(fg, bg) >= targetRatio) {
    return { ...fg };
  }

  // Determine search direction based on background lightness
  const bgIsLight = bg.l > 0.5;
  let low: number;
  let high: number;

  if (bgIsLight) {
    // Darken: search between 0 and current lightness
    low = 0;
    high = fg.l;
  } else {
    // Lighten: search between current lightness and 1
    low = fg.l;
    high = 1;
  }

  let bestL = bgIsLight ? low : high; // Start with the extreme that guarantees max contrast

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    const candidate: OklchColor = { ...fg, l: mid };
    const ratio = contrastRatio(candidate, bg);

    if (ratio >= targetRatio) {
      // This lightness works — try to get closer to the original
      bestL = mid;
      if (bgIsLight) {
        // We can afford to lighten a bit (move high up)
        low = mid;
      } else {
        // We can afford to darken a bit (move high down)
        high = mid;
      }
    } else {
      // Not enough contrast — move toward the extreme
      if (bgIsLight) {
        high = mid;
      } else {
        low = mid;
      }
    }
  }

  const adjusted: OklchColor = {
    l: bestL,
    c: fg.c,
    h: fg.h,
    ...(fg.alpha !== undefined ? { alpha: fg.alpha } : {}),
  };

  if (contrastRatio(adjusted, bg) >= targetRatio) {
    return adjusted;
  }

  const black: OklchColor = { l: 0, c: 0, h: 0 };
  const white: OklchColor = { l: 1, c: 0, h: 0 };
  return contrastRatio(black, bg) >= contrastRatio(white, bg) ? black : white;
}

/**
 * Auto-generate a foreground color for a given background.
 *
 * Starts from the background color itself (preserving hue & chroma) and
 * adjusts lightness until the target contrast is met. This is useful for
 * automatically producing `--*-foreground` tokens in a theme.
 *
 * @param bg          - Background color.
 * @param targetRatio - Target contrast ratio (default 4.5).
 * @returns A new foreground `OklchColor`.
 */
export function generateForeground(
  bg: OklchColor,
  targetRatio: number = DEFAULT_TARGET_RATIO,
): OklchColor {
  // Start with a copy of the background so the foreground inherits the hue
  const initialFg: OklchColor = {
    l: bg.l,
    c: bg.c,
    h: bg.h,
    ...(bg.alpha !== undefined ? { alpha: bg.alpha } : {}),
  };

  return adjustForContrast(initialFg, bg, targetRatio);
}
