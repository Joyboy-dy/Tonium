import type { ColorOutputFormat } from './colors.js';

/**
 * Options for `tonium audit`.
 */
export interface AuditOptions {
  /** Output as JSON instead of styled terminal output */
  json?: boolean;
  /** Return exit code 1 if issues are found */
  strict?: boolean;
}

/**
 * Options for `tonium theme`.
 */
export interface ThemeOptions {
  /** User-provided palette colors (1 to 12) */
  palette: string[];
  /** Output format for CSS values */
  format: ColorOutputFormat;
  /** Show preview without writing */
  preview?: boolean;
  /** Write changes to disk (requires confirmation unless --yes) */
  apply?: boolean;
  /** Move intruder CSS to customs.css */
  organizeCss?: boolean;
  /** Disable CSS organization */
  noOrganizeCss?: boolean;
  /** Update AGENTS.md with design guidelines */
  updateAgents?: boolean;
  /** Skip AGENTS.md update */
  noUpdateAgents?: boolean;
  /** Skip confirmation prompts */
  yes?: boolean;
}

/**
 * Options for `tonium clean`.
 */
export interface CleanOptions {
  /** Show what would be cleaned without writing */
  preview?: boolean;
  /** Apply the cleaning */
  apply?: boolean;
  /** Skip confirmation */
  yes?: boolean;
}

/**
 * Options for `tonium agents`.
 */
export interface AgentsOptions {
  /** Apply changes to AGENTS.md */
  apply?: boolean;
  /** Skip confirmation */
  yes?: boolean;
}

/**
 * Result of project detection.
 */
export interface ProjectInfo {
  /** Whether a Next.js project was detected */
  isNextJs: boolean;
  /** Whether Tailwind CSS v4 was detected */
  isTailwindV4: boolean;
  /** Whether shadcn/ui was detected */
  isShadcnUi: boolean;
  /** Resolved path to globals.css (or null) */
  globalsCssPath: string | null;
  /** Whether using src/ prefix or not */
  usesSrcDir: boolean;
  /** Path to the app directory (app/ or src/app/) */
  appDir: string;
  /** Root directory of the project */
  rootDir: string;
}

/**
 * Audit report structure.
 */
export interface AuditReport {
  project: ProjectInfo;
  /** Tokens found in globals.css */
  tokensFound: string[];
  /** Required structural tokens that are missing */
  tokensMissing: string[];
  /** Required structural tokens for the current shadcn/ui preset */
  tokensRequired: string[];
  /** Optional preset/version-dependent tokens that are present */
  tokensOptionalFound: string[];
  /** Optional preset/version-dependent tokens that are absent */
  tokensOptionalMissing: string[];
  /** Legacy tokens recognized but not required */
  tokensLegacyFound: string[];
  /** Contrast issues detected */
  contrastIssues: {
    pair: string;
    ratio: number;
    required: number;
    pass: boolean;
  }[];
  /** CSS intruders detected */
  intruders: {
    selector: string;
    line: number;
  }[];
  /** CSS structural blocks detected */
  structuralBlocks: string[];
  /** Overall health score */
  score: 'healthy' | 'warnings' | 'issues';
  /** Warnings */
  warnings: string[];
  /** Errors */
  errors: string[];
}
