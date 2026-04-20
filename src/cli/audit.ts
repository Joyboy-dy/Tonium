import * as p from '@clack/prompts';
import chalk from 'chalk';
import { ConfigManager } from '../core/generator/ConfigManager.js';
import { StyleExtractor } from '../core/scanner/StyleExtractor.js';
import { logger } from '../utils/logger.js';
import { t } from '../utils/i18n.js';

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

  const extractor = new StyleExtractor();
  const cssPath = config.project.globalCssPath;

  if (!cssPath) {
    s.stop(chalk.red(t(locale, 'cli.noCss')));
    return;
  }

  const colors = await extractor.extractColors(cssPath);
  const vulnerabilities = await extractor.analyzeContrast(colors);

  s.stop(t(locale, 'cli.auditDone'));

  logger.bold(`\n${locale === 'fr' ? 'Couleurs détectées' : 'Detected colors'} in ${chalk.cyan(cssPath)}:`);
  console.log(colors.join(', '));

  if (vulnerabilities.lowContrast.length > 0) {
    logger.warn(`${locale === 'fr' ? 'Attention' : 'Warning'}: ${vulnerabilities.lowContrast.length} ${locale === 'fr' ? 'problèmes de contraste' : 'contrast issues'}.`);
  } else {
    logger.success(t(locale, 'cli.auditDone'));
  }

  p.outro(chalk.green(locale === 'fr' ? 'Audit terminé.' : 'Audit completed.'));
}

