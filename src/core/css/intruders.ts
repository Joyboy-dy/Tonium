/**
 * @module core/css/intruders
 *
 * Detects CSS "intruders" — blocks that don't belong to the standard
 * shadcn/ui globals.css structure.
 *
 * An intruder is any block of type 'unknown' (not import, custom-variant,
 * theme-inline, root, dark, or layer-base).
 */

import type {
  CssParseResult,
  CssIntruder,
  IntruderDetectionResult,
} from '../../types/index.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect intruder blocks in a parsed CSS result.
 *
 * If the parse result is flagged as ambiguous, we return `isConfident: false`
 * because we can't reliably distinguish intruders from structural anomalies.
 *
 * @param parseResult - The result from `parseCssContent()` or `parseCssFile()`
 * @returns Detection result with intruder list and confidence flag
 */
export function detectIntruders(parseResult: CssParseResult): IntruderDetectionResult {
  // If parsing was ambiguous, we can't confidently detect intruders
  if (parseResult.isAmbiguous) {
    return {
      intruders: [],
      isConfident: false,
      ambiguityReason: parseResult.ambiguityReason
        ?? 'CSS structure is ambiguous — intruder detection skipped',
    };
  }

  const intruders: CssIntruder[] = [];

  for (const block of parseResult.blocks) {
    if (block.type !== 'unknown') {
      continue;
    }

    // Extract the selector from the block content.
    // The selector is everything before the first `{` on the first line.
    const selector = extractSelector(block.content);

    intruders.push({
      selector,
      content: block.content,
      startLine: block.startLine,
      endLine: block.endLine,
    });
  }

  return {
    intruders,
    isConfident: true,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the CSS selector or at-rule identifier from block content.
 *
 * Looks at the content before the first `{` to get the selector.
 * Falls back to the first line (trimmed) if no `{` is found.
 */
function extractSelector(content: string): string {
  const firstBrace = content.indexOf('{');

  if (firstBrace > 0) {
    return content.substring(0, firstBrace).trim();
  }

  // Fallback: first non-empty line
  const firstLine = content.split('\n').find((l) => l.trim().length > 0);
  return firstLine?.trim() ?? '(unknown)';
}
