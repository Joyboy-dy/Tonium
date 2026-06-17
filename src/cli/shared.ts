import { confirm } from '@clack/prompts';
import fs from 'fs-extra';
import path from 'node:path';

import { detectProject } from '../core/project/detect.js';
import { parseCssFile } from '../core/css/parse.js';
import { detectIntruders } from '../core/css/intruders.js';
import { parseColor } from '../core/colors/parse.js';
import { contrastRatio } from '../core/colors/contrast.js';
import { TOKEN_PAIRS } from '../core/theme/tokens.js';
import {
  LEGACY_SEMANTIC_TOKENS,
  OPTIONAL_SEMANTIC_TOKENS,
  REQUIRED_SEMANTIC_TOKENS,
  SEMANTIC_TOKENS,
  type AuditReport,
  type ColorOutputFormat,
  type CssIntruder,
  type CssParseResult,
  type GeneratedTheme,
  type ProjectInfo,
  type SemanticToken,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

export const OUTPUT_FORMATS: ColorOutputFormat[] = ['oklch', 'hex', 'rgb', 'hsl', 'input'];

type ProjectInfoWithGlobals = ProjectInfo & { globalsCssPath: string };

export interface ProjectCssContext {
  project: ProjectInfoWithGlobals;
  css: CssParseResult;
}

export async function loadProjectCss(rootDir = process.cwd()): Promise<ProjectCssContext> {
  const project = await detectProject(rootDir);

  if (!project.globalsCssPath) {
    throw new Error('No globals.css found. Expected app/globals.css or src/app/globals.css.');
  }

  const projectWithGlobals: ProjectInfoWithGlobals = {
    ...project,
    globalsCssPath: project.globalsCssPath,
  };
  const css = await parseCssFile(projectWithGlobals.globalsCssPath);
  return { project: projectWithGlobals, css };
}

export function validateOutputFormat(value: string): ColorOutputFormat {
  if (OUTPUT_FORMATS.includes(value as ColorOutputFormat)) {
    return value as ColorOutputFormat;
  }

  throw new Error(`Invalid format "${value}". Expected one of: ${OUTPUT_FORMATS.join(', ')}.`);
}

export async function confirmWrite(message: string, yes?: boolean): Promise<boolean> {
  if (yes) return true;

  const answer = await confirm({
    message,
    initialValue: false,
  });

  return answer === true;
}

export function buildNextActionCommand(command: string, args: string[] = [], options: string[] = []): string {
  return [
    'tonium',
    command,
    ...args.map((arg) => JSON.stringify(arg)),
    ...options,
  ].join(' ');
}

export function printNextAction(command: string): void {
  logger.blank();
  logger.header('Next Action');
  logger.dim(command);
}

export function buildAuditReport(project: ProjectInfo, css: CssParseResult): AuditReport {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!project.isNextJs) warnings.push('Next.js was not detected.');
  if (!project.isTailwindV4) warnings.push('Tailwind CSS v4 was not detected.');
  if (!project.isShadcnUi) warnings.push('shadcn/ui was not detected.');
  if (css.isAmbiguous) errors.push(css.ambiguityReason ?? 'CSS structure is ambiguous.');

  const tokenMap = collectTokenValues(css);
  const tokensFound = [...tokenMap.keys()].sort();
  const tokensMissing = REQUIRED_SEMANTIC_TOKENS.filter((token) => !tokenMap.has(token));
  const tokensOptionalFound = OPTIONAL_SEMANTIC_TOKENS.filter((token) => tokenMap.has(token));
  const tokensOptionalMissing = OPTIONAL_SEMANTIC_TOKENS.filter((token) => !tokenMap.has(token));
  const tokensLegacyFound = LEGACY_SEMANTIC_TOKENS.filter((token) => tokenMap.has(token));
  const intruderResult = detectIntruders(css);

  if (!intruderResult.isConfident) {
    warnings.push(intruderResult.ambiguityReason ?? 'Intruder detection was skipped.');
  }

  const contrastIssues = TOKEN_PAIRS.flatMap((pair) => {
    const bg = tokenMap.get(pair.bg as SemanticToken);
    const fg = tokenMap.get(pair.fg as SemanticToken);
    if (!bg || !fg) return [];

    const bgColor = parseColor(bg);
    const fgColor = parseColor(fg);
    if (!bgColor || !fgColor) {
      warnings.push(`Could not parse contrast pair ${pair.bg}/${pair.fg}.`);
      return [];
    }

    const ratio = Math.round(contrastRatio(fgColor.oklch, bgColor.oklch) * 100) / 100;
    return ratio < pair.minContrast
      ? [{
          pair: `${pair.bg}/${pair.fg}`,
          ratio,
          required: pair.minContrast,
          pass: false,
        }]
      : [];
  });

  if (tokensMissing.length > 0) warnings.push(`${tokensMissing.length} semantic token(s) missing.`);
  if (intruderResult.intruders.length > 0) warnings.push(`${intruderResult.intruders.length} CSS intruder block(s) found.`);

  const score = errors.length > 0 || contrastIssues.length > 0
    ? 'issues'
    : warnings.length > 0
      ? 'warnings'
      : 'healthy';

  return {
    project,
    tokensFound,
    tokensMissing,
    tokensRequired: [...REQUIRED_SEMANTIC_TOKENS],
    tokensOptionalFound,
    tokensOptionalMissing,
    tokensLegacyFound,
    contrastIssues,
    intruders: intruderResult.intruders.map((intruder) => ({
      selector: intruder.selector,
      line: intruder.startLine,
    })),
    structuralBlocks: css.blocks.map((block) => `${block.type}:${block.startLine}-${block.endLine}`),
    score,
    warnings,
    errors,
  };
}

export function printAuditReport(report: AuditReport): void {
  logger.header('Audit');
  logger.table([
    ['Next.js', yesNo(report.project.isNextJs)],
    ['Tailwind v4', yesNo(report.project.isTailwindV4)],
    ['shadcn/ui', yesNo(report.project.isShadcnUi)],
    ['globals.css', report.project.globalsCssPath ?? 'not found'],
    ['score', report.score],
  ]);

  if (report.tokensMissing.length > 0) {
    logger.warn(`Missing tokens: ${report.tokensMissing.map((token) => `--${token}`).join(', ')}`);
  }

  for (const issue of report.contrastIssues) {
    logger.warn(`Contrast ${issue.pair}: ${issue.ratio}:1, required ${issue.required}:1`);
  }

  for (const intruder of report.intruders) {
    logger.warn(`CSS intruder ${intruder.selector} at line ${intruder.line}`);
  }

  for (const warning of report.warnings.filter((warning) => !warning.includes('missing') && !warning.includes('intruder'))) {
    logger.warn(warning);
  }

  for (const error of report.errors) {
    logger.error(error);
  }

  if (report.score === 'healthy') {
    logger.success('Theme structure is healthy.');
  }
}

export function collectTokenValues(css: CssParseResult): Map<SemanticToken, string> {
  const values = new Map<SemanticToken, string>();

  for (const variable of [...css.rootVariables, ...css.darkVariables]) {
    const token = variable.name.replace(/^--/, '');
    if (SEMANTIC_TOKENS.includes(token as SemanticToken)) {
      values.set(token as SemanticToken, variable.value.trim());
    }
  }

  return values;
}

export function themeToChangeMaps(theme: GeneratedTheme): {
  rootChanges: Map<string, string>;
  darkChanges: Map<string, string>;
} {
  const rootChanges = new Map<string, string>();
  const darkChanges = new Map<string, string>();

  for (const assignment of theme.light.tokens) {
    rootChanges.set(assignment.token, assignment.value);
  }

  for (const assignment of theme.dark.tokens) {
    darkChanges.set(assignment.token, assignment.value);
  }

  return { rootChanges, darkChanges };
}

export function ensureTokenDeclarations(
  content: string,
  rootChanges: Map<string, string>,
  darkChanges: Map<string, string>,
): string {
  let next = ensureBlockDeclarations(content, 'root', rootChanges);
  next = ensureBlockDeclarations(next, 'dark', darkChanges);
  return next;
}

export function printThemePreview(theme: GeneratedTheme): void {
  logger.header('Theme Preview');
  printTheme(theme);
}

export function printThemeApply(theme: GeneratedTheme): void {
  logger.header('Theme Apply');
  printTheme(theme);
}

function printTheme(theme: GeneratedTheme): void {
  logger.dim(`format: ${theme.outputFormat}`);

  for (const mode of [theme.light, theme.dark]) {
    logger.blank();
    logger.info(`${mode.mode} mode`);
    for (const assignment of mode.tokens) {
      logger.dim(`${logger.token(assignment.token)}: ${logger.colorValue(assignment.value)} (${assignment.source})`);
    }
  }

  for (const correction of theme.corrections) {
    logger.warn(
      `${correction.mode} ${correction.token} adjusted against ${correction.pairedWith}: ` +
      `${correction.originalContrast}:1 -> ${correction.correctedContrast}:1`,
    );
  }

  for (const warning of theme.warnings) {
    logger.warn(warning);
  }
}

export function removeIntruderBlocks(content: string, intruders: CssIntruder[]): string {
  if (intruders.length === 0) return content;

  const lines = content.split('\n');
  const removeLines = new Set<number>();

  for (const intruder of intruders) {
    for (let line = intruder.startLine; line <= intruder.endLine; line++) {
      removeLines.add(line);
    }
  }

  return lines.filter((_, index) => !removeLines.has(index + 1)).join('\n').replace(/\n{3,}/g, '\n\n');
}

export async function appendCustomCss(appDir: string, rootDir: string, intruders: CssIntruder[]): Promise<string> {
  const stylesDir = path.join(rootDir, appDir, 'styles');
  const customsPath = path.join(stylesDir, 'customs.css');
  const existing = await fs.pathExists(customsPath) ? await fs.readFile(customsPath, 'utf-8') : '';
  const block = intruders.map((intruder) => intruder.content.trim()).join('\n\n');
  const next = existing.trim().length > 0 ? `${existing.trimEnd()}\n\n${block}\n` : `${block}\n`;
  await fs.ensureDir(stylesDir);
  await fs.writeFile(customsPath, next, 'utf-8');
  return customsPath;
}

function yesNo(value: boolean): string {
  return value ? 'yes' : 'no';
}

function ensureBlockDeclarations(
  content: string,
  block: 'root' | 'dark',
  changes: Map<string, string>,
): string {
  const lines = content.split('\n');
  const startPattern = block === 'root' ? /^\s*:root\s*\{/ : /^\s*\.dark\s*\{/;
  const existing = new Set<string>();
  let braceDepth = 0;
  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (startIndex === -1 && startPattern.test(line)) {
      startIndex = i;
    }

    if (startIndex !== -1 && endIndex === -1) {
      const variable = /^\s*--([\w-]+)\s*:/.exec(line);
      if (variable) existing.add(variable[1]);

      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }

      if (braceDepth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  const missing = [...changes.entries()].filter(([token]) => !existing.has(token));
  if (missing.length === 0) return content;

  const declarations = missing.map(([token, value]) => `  --${token}: ${value};`);

  if (startIndex === -1 || endIndex === -1) {
    const selector = block === 'root' ? ':root' : '.dark';
    return `${content.trimEnd()}\n\n${selector} {\n${declarations.join('\n')}\n}\n`;
  }

  lines.splice(endIndex, 0, ...declarations);
  return lines.join('\n');
}
