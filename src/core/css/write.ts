/**
 * @module core/css/write
 *
 * Targeted CSS writing utilities.
 * These functions modify ONLY the specific lines that need changing,
 * preserving all other content, comments, and formatting.
 *
 * The caller is responsible for backup and disk writes — these functions
 * only return the modified content string.
 */

import { readFileSafe } from '../../utils/fs.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Matches @import lines for detecting the last import position */
const IMPORT_RE = /^\s*@import\s+/;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply token value changes to a CSS file's :root and .dark blocks.
 *
 * For each variable in `rootChanges`, finds the line in the :root block that
 * declares that variable and replaces ONLY its value, preserving whitespace
 * and formatting.
 *
 * Same logic for `darkChanges` in the .dark block.
 *
 * @param filePath - Path to the CSS file to read
 * @param rootChanges - Map of token name → new value (without `--` prefix)
 * @param darkChanges - Map of token name → new value (without `--` prefix)
 * @returns The modified file content (does NOT write to disk)
 * @throws If the file cannot be read
 */
export async function applyTokenChanges(
  filePath: string,
  rootChanges: Map<string, string>,
  darkChanges: Map<string, string>,
): Promise<string> {
  const content = await readFileSafe(filePath);

  if (content === null) {
    throw new Error(`Cannot read file: ${filePath}`);
  }

  const lines = content.split('\n');

  // We need to know which block each line belongs to.
  // Simple state machine: track which block we're in via brace depth.
  let braceDepth = 0;
  let currentBlock: 'root' | 'dark' | 'other' = 'other';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect block starts at depth 0
    if (braceDepth === 0) {
      if (/^\s*:root\s*\{/.test(line)) {
        currentBlock = 'root';
      } else if (/^\s*\.dark\s*\{/.test(line)) {
        currentBlock = 'dark';
      } else {
        currentBlock = 'other';
      }
    }

    // Count braces
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
    }

    // When depth returns to 0, we've left the block
    if (braceDepth === 0) {
      // Don't reset currentBlock here — we process the closing line first,
      // then reset after attempting replacements.
    }

    // Attempt replacement if we're inside a relevant block
    const changes = currentBlock === 'root' ? rootChanges : currentBlock === 'dark' ? darkChanges : null;

    if (changes && changes.size > 0) {
      for (const [tokenName, newValue] of changes) {
        const pattern = new RegExp(`^(\\s*--${escapeRegex(tokenName)}\\s*:)\\s*(.+?)(\\s*;)$`);
        const match = pattern.exec(lines[i]);
        if (match) {
          lines[i] = `${match[1]} ${newValue}${match[3]}`;
        }
      }
    }

    // Reset block tracking after the closing brace
    if (braceDepth === 0) {
      currentBlock = 'other';
    }
  }

  return lines.join('\n');
}

/**
 * Insert an `@import` line after existing imports, if not already present.
 *
 * @param content - The file content string
 * @param importPath - The path to import (e.g. `"./styles/customs.css"`)
 * @returns Modified content with the import added, or unchanged if already present
 */
export function insertImportLine(content: string, importPath: string): string {
  // Normalize the import statement
  const importStatement = `@import "${importPath}";`;

  // Check if already present (with either quote style)
  const normalizedCheck = importPath.replace(/['"]/g, '');
  if (content.includes(normalizedCheck)) {
    return content;
  }

  const lines = content.split('\n');
  let lastImportIndex = -1;

  // Find the last @import line
  for (let i = 0; i < lines.length; i++) {
    if (IMPORT_RE.test(lines[i])) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    // Insert after the last import
    lines.splice(lastImportIndex + 1, 0, importStatement);
  } else {
    // No imports found — insert at the very top
    lines.unshift(importStatement);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
