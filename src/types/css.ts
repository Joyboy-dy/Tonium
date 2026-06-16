/**
 * Represents a parsed CSS variable declaration.
 */
export interface CssVariable {
  name: string;   // e.g. '--background'
  value: string;  // e.g. 'oklch(1 0 0)'
  /** Line number in the original file (1-indexed) */
  line: number;
}

/**
 * A recognized structural block in globals.css.
 */
export type CssBlockType =
  | 'import'
  | 'custom-variant'
  | 'theme-inline'
  | 'root'
  | 'dark'
  | 'layer-base'
  | 'unknown';

/**
 * A parsed CSS block with its boundaries.
 */
export interface CssBlock {
  type: CssBlockType;
  /** Raw CSS content of this block */
  content: string;
  /** Start line (1-indexed, inclusive) */
  startLine: number;
  /** End line (1-indexed, inclusive) */
  endLine: number;
  /** CSS variables found inside this block */
  variables: CssVariable[];
}

/**
 * Full parse result of a globals.css file.
 */
export interface CssParseResult {
  /** Raw file content */
  raw: string;
  /** File path that was parsed */
  filePath: string;
  /** All detected structural blocks */
  blocks: CssBlock[];
  /** Variables found in :root */
  rootVariables: CssVariable[];
  /** Variables found in .dark */
  darkVariables: CssVariable[];
  /** Variables found in @theme inline */
  themeInlineVariables: CssVariable[];
  /** Whether the structure was confidently parsed */
  isAmbiguous: boolean;
  /** Reason if parsing is ambiguous */
  ambiguityReason?: string;
}

/**
 * A detected CSS intruder (non-standard block).
 */
export interface CssIntruder {
  /** The CSS selector or at-rule */
  selector: string;
  /** Full raw CSS content of the intruder block */
  content: string;
  /** Start line (1-indexed) */
  startLine: number;
  /** End line (1-indexed) */
  endLine: number;
}

/**
 * Result of intruder detection.
 */
export interface IntruderDetectionResult {
  intruders: CssIntruder[];
  /** Whether detection was confident */
  isConfident: boolean;
  /** Reason if detection was not confident */
  ambiguityReason?: string;
}
