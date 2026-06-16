/**
 * @module core/css/parse
 *
 * Conservative, line-by-line CSS parser for globals.css.
 * Uses a state-machine approach with brace-depth tracking to identify
 * structural blocks without relying on a full CSS AST.
 *
 * This parser is intentionally CONSERVATIVE: it flags ambiguous structures
 * rather than guessing, so that downstream consumers can decide how to handle them.
 */

import type {
  CssParseResult,
  CssBlock,
  CssBlockType,
  CssVariable,
} from '../../types/index.js';
import { readFileSafe } from '../../utils/fs.js';

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

/** Matches a CSS variable declaration:  --name: value; */
const CSS_VAR_RE = /^\s*--([\w-]+)\s*:\s*(.+?)\s*;\s*$/;

/** Matches @import lines */
const IMPORT_RE = /^\s*@import\s+/;

/** Matches @custom-variant lines */
const CUSTOM_VARIANT_RE = /^\s*@custom-variant\s+/;

/** Matches @theme inline { */
const THEME_INLINE_RE = /^\s*@theme\s+inline\s*\{/;

/** Matches :root { */
const ROOT_RE = /^\s*:root\s*\{/;

/** Matches .dark { */
const DARK_RE = /^\s*\.dark\s*\{/;

/** Matches @layer base { */
const LAYER_BASE_RE = /^\s*@layer\s+base\s*\{/;

// ---------------------------------------------------------------------------
// Block type detection
// ---------------------------------------------------------------------------

/**
 * Determine the block type from the line that opens a curly-brace block.
 * Single-line statements (imports, custom-variants without braces) are handled separately.
 */
function classifyBlockOpener(line: string): CssBlockType {
  if (THEME_INLINE_RE.test(line)) return 'theme-inline';
  if (ROOT_RE.test(line)) return 'root';
  if (DARK_RE.test(line)) return 'dark';
  if (LAYER_BASE_RE.test(line)) return 'layer-base';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Variable extraction
// ---------------------------------------------------------------------------

/**
 * Extract CSS variable declarations from block content lines.
 * @param lines - Raw content lines of the block
 * @param startLine - 1-indexed start line of the block in the source file
 */
function extractVariables(lines: string[], startLine: number): CssVariable[] {
  const variables: CssVariable[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = CSS_VAR_RE.exec(lines[i]);
    if (match) {
      variables.push({
        name: `--${match[1]}`,
        value: match[2],
        line: startLine + i,
      });
    }
  }

  return variables;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a CSS file from disk.
 * Returns a structured result with identified blocks, variables, and ambiguity status.
 */
export async function parseCssFile(filePath: string): Promise<CssParseResult> {
  const content = await readFileSafe(filePath);

  if (content === null) {
    return {
      raw: '',
      filePath,
      blocks: [],
      rootVariables: [],
      darkVariables: [],
      themeInlineVariables: [],
      isAmbiguous: true,
      ambiguityReason: `File not found: ${filePath}`,
    };
  }

  return parseCssContent(content, filePath);
}

/**
 * Parse CSS content (string) and return a structured result.
 *
 * Strategy (state machine):
 * 1. Walk line-by-line, counting brace depth.
 * 2. Single-line statements (`@import`, `@custom-variant` without braces) → standalone blocks.
 * 3. When depth goes from 0→1 we start a new block.
 * 4. When depth returns to 0 we close the current block.
 * 5. After all blocks are collected, we populate convenience variable lists and
 *    run ambiguity checks.
 */
export function parseCssContent(content: string, filePath: string): CssParseResult {
  const lines = content.split('\n');
  const blocks: CssBlock[] = [];

  // Ambiguity tracking
  const ambiguityReasons: string[] = [];

  // State machine state
  let braceDepth = 0;
  let currentBlockLines: string[] = [];
  let currentBlockStartLine = -1;
  let currentBlockType: CssBlockType = 'unknown';
  let maxInnerDepth = 0; // track max depth INSIDE a block (relative to block start)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // 1-indexed

    // -----------------------------------------------------------------------
    // Handle single-line statements (no braces)
    // -----------------------------------------------------------------------
    if (braceDepth === 0 && !line.includes('{')) {
      if (IMPORT_RE.test(line)) {
        blocks.push({
          type: 'import',
          content: line,
          startLine: lineNumber,
          endLine: lineNumber,
          variables: [],
        });
        continue;
      }

      if (CUSTOM_VARIANT_RE.test(line) && !line.includes('{')) {
        blocks.push({
          type: 'custom-variant',
          content: line,
          startLine: lineNumber,
          endLine: lineNumber,
          variables: [],
        });
        continue;
      }

      // Skip blank / comment lines at top-level
      continue;
    }

    // -----------------------------------------------------------------------
    // Count braces on this line
    // -----------------------------------------------------------------------
    for (const ch of line) {
      if (ch === '{') {
        braceDepth++;

        if (braceDepth === 1) {
          // Starting a new top-level block
          currentBlockStartLine = lineNumber;
          currentBlockType = classifyBlockOpener(line);
          currentBlockLines = [];
          maxInnerDepth = 0;
        } else {
          // We're inside a block — track inner depth
          const innerDepth = braceDepth - 1;
          if (innerDepth > maxInnerDepth) {
            maxInnerDepth = innerDepth;
          }
        }
      } else if (ch === '}') {
        braceDepth--;

        if (braceDepth === 0) {
          // Closing a top-level block
          currentBlockLines.push(line);

          const blockContent = currentBlockLines.join('\n');
          const variables = extractVariables(currentBlockLines, currentBlockStartLine);

          // Check for excessive nesting in :root or .dark (not @theme)
          if (
            (currentBlockType === 'root' || currentBlockType === 'dark') &&
            maxInnerDepth > 1
          ) {
            ambiguityReasons.push(
              `Nested braces (depth ${maxInnerDepth + 1}) found inside ${currentBlockType === 'root' ? ':root' : '.dark'} block at line ${currentBlockStartLine}`
            );
          }

          blocks.push({
            type: currentBlockType,
            content: blockContent,
            startLine: currentBlockStartLine,
            endLine: lineNumber,
            variables,
          });

          // Reset state
          currentBlockLines = [];
          currentBlockStartLine = -1;
          currentBlockType = 'unknown';
          maxInnerDepth = 0;
          continue; // Don't push line again below
        }

        if (braceDepth < 0) {
          ambiguityReasons.push(`Unbalanced closing brace at line ${lineNumber}`);
          braceDepth = 0; // Reset to avoid cascade
        }
      }
    }

    // Accumulate lines into the current block
    if (braceDepth > 0) {
      currentBlockLines.push(line);
    }
  }

  // -------------------------------------------------------------------------
  // Post-parse checks
  // -------------------------------------------------------------------------

  // Unbalanced braces (unclosed block)
  if (braceDepth !== 0) {
    ambiguityReasons.push(
      `Unbalanced braces: ${braceDepth} unclosed brace(s) at end of file`
    );
  }

  // Multiple :root or .dark blocks
  const rootBlocks = blocks.filter((b) => b.type === 'root');
  const darkBlocks = blocks.filter((b) => b.type === 'dark');

  if (rootBlocks.length > 1) {
    ambiguityReasons.push(
      `Multiple :root blocks found (${rootBlocks.length}): lines ${rootBlocks.map((b) => b.startLine).join(', ')}`
    );
  }

  if (darkBlocks.length > 1) {
    ambiguityReasons.push(
      `Multiple .dark blocks found (${darkBlocks.length}): lines ${darkBlocks.map((b) => b.startLine).join(', ')}`
    );
  }

  // -------------------------------------------------------------------------
  // Build result
  // -------------------------------------------------------------------------

  const rootVariables = rootBlocks.flatMap((b) => b.variables);
  const darkVariables = darkBlocks.flatMap((b) => b.variables);
  const themeInlineVariables = blocks
    .filter((b) => b.type === 'theme-inline')
    .flatMap((b) => b.variables);

  const isAmbiguous = ambiguityReasons.length > 0;

  return {
    raw: content,
    filePath,
    blocks,
    rootVariables,
    darkVariables,
    themeInlineVariables,
    isAmbiguous,
    ...(isAmbiguous ? { ambiguityReason: ambiguityReasons.join('; ') } : {}),
  };
}
