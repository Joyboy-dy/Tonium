import * as p from '@clack/prompts';
import chalk from 'chalk';
import { ConfigManager } from '../core/generator/ConfigManager.js';
import { StyleExtractor } from '../core/scanner/StyleExtractor.js';
import { logger } from '../utils/logger.js';
import { t } from '../utils/i18n.js';
import fs from 'fs-extra';
import path from 'path';

export async function auditCommand() {
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (!config) {
    logger.error('Projet non initialisé / Project not initialized. Run `npx tonium init`.');
    return;
  }

  const locale = config.locale || 'en';

  p.intro(chalk.bgYellow.black(` ${t(locale, 'cli.audit')} `));

  const s = p.spinner();
  s.start(t(locale, 'cli.auditStart'));
  await configManager.initDirs();

  const extractor = new StyleExtractor();
  const cssPath = config.project.globalCssPath;

  if (!cssPath) {
    s.stop(chalk.red(t(locale, 'cli.noCss')));
    return;
  }

  const colors = await extractor.extractColors(cssPath);
  const vulnerabilities = await extractor.analyzeContrast(colors);
  const reportsDir = path.join(process.cwd(), '.tonium/reports');
  const auditJsonPath = path.join(reportsDir, 'audit.json');
  const auditMdPath = path.join(reportsDir, 'audit.md');

  await fs.ensureDir(reportsDir);

  const auditPayload = {
    generatedAt: new Date().toISOString(),
    cssPath,
    detectedColorsCount: colors.length,
    detectedColors: colors,
    vulnerabilities,
  };

  const auditMarkdown = [
    '# Tonium Audit Report',
    '',
    `- Generated at: ${auditPayload.generatedAt}`,
    `- CSS scanned: ${cssPath}`,
    `- Detected colors: ${colors.length}`,
    '',
    '## Detected Colors',
    ...(colors.length > 0 ? colors.map((color) => `- \`${color}\``) : ['- None detected']),
    '',
    '## Contrast Warnings',
    ...(vulnerabilities.lowContrast.length > 0
      ? vulnerabilities.lowContrast.map((issue) => `- ${issue.pair[0]} on ${issue.pair[1]} => ${issue.ratio.toFixed(2)}:1`)
      : ['- No low contrast warnings found']),
    '',
  ].join('\n');

  await fs.writeJson(auditJsonPath, auditPayload, { spaces: 2 });
  await fs.writeFile(auditMdPath, auditMarkdown, 'utf-8');

  s.stop(t(locale, 'cli.auditDone'));

  logger.bold(`\n${locale === 'fr' ? 'Couleurs détectées' : 'Detected colors'} in ${chalk.cyan(cssPath)}:`);
  console.log(colors.join(', '));

  if (vulnerabilities.lowContrast.length > 0) {
    logger.warn(`${locale === 'fr' ? 'Attention' : 'Warning'}: ${vulnerabilities.lowContrast.length} ${locale === 'fr' ? 'problèmes de contraste' : 'contrast issues'}.`);
  } else {
    logger.success(colors.length > 0 ? t(locale, 'cli.auditDone') : `${t(locale, 'cli.auditDone')} (${locale === 'fr' ? 'aucune couleur détectée' : 'no colors detected'})`);
  }

  logger.info(`${locale === 'fr' ? 'Rapport JSON' : 'Audit JSON'}: ${chalk.cyan(path.relative(process.cwd(), auditJsonPath))}`);
  logger.info(`${locale === 'fr' ? 'Rapport Markdown' : 'Audit Markdown'}: ${chalk.cyan(path.relative(process.cwd(), auditMdPath))}`);

  p.outro(chalk.green(locale === 'fr' ? 'Audit terminé.' : 'Audit completed.'));
}
