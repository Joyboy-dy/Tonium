import * as p from '@clack/prompts';
import chalk from 'chalk';
import { ConfigManager } from '../core/generator/ConfigManager.js';
import { StyleExtractor } from '../core/scanner/StyleExtractor.js';
import { logger } from '../utils/logger.js';

export async function auditCommand() {
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (!config) {
    logger.error('Projet non initialisé. Veuillez lancer `tonium init` d\'abord.');
    return;
  }

  p.intro(chalk.bgYellow.black(' Tonium - Audit Visuel '));

  const s = p.spinner();
  s.start('Analyse des fichiers CSS et des contrastes...');

  const extractor = new StyleExtractor();
  const cssPath = config.project.globalCssPath;

  if (!cssPath) {
    s.stop(chalk.red('Aucun fichier CSS global détecté.'));
    return;
  }

  const colors = await extractor.extractColors(cssPath);
  const vulnerabilities = await extractor.analyzeContrast(colors);

  s.stop('Analyse terminée.');

  logger.bold(`\nCouleurs détectées dans ${chalk.cyan(cssPath)} :`);
  console.log(colors.join(', '));

  if (vulnerabilities.lowContrast.length > 0) {
    logger.warn(`Attention : ${vulnerabilities.lowContrast.length} problèmes de contraste détectés.`);
    vulnerabilities.lowContrast.slice(0, 5).forEach(v => {
      console.log(`  - ${v.pair[0]} vs ${v.pair[1]} : ratio ${v.ratio.toFixed(2)}`);
    });
  } else {
    logger.success('Tous les contrastes critiques semblent corrects.');
  }

  p.outro(chalk.green('Audit terminé. Utilisez `tonium apply` pour générer votre nouveau système.'));
}
