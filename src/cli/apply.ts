import * as p from '@clack/prompts';
import chalk from 'chalk';
import { ConfigManager } from '../core/generator/ConfigManager.js';
import { ColorEngine } from '../core/color/ColorEngine.js';
import { AgentGenerator } from '../core/generator/AgentGenerator.js';
import { TypographyEngine } from '../core/typography/TypographyEngine.js';
import { logger } from '../utils/logger.js';
import { t } from '../utils/i18n.js';
import fs from 'fs-extra';
import path from 'path';

export async function applyCommand() {
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (!config) {
    logger.error('Projet non initialisé / Project not initialized. Run `npx tonium init`.');
    return;
  }

  const locale = config.locale || 'en';

  p.intro(chalk.bgGreen.black(` ${t(locale, 'cli.apply')} `));

  const s = p.spinner();
  s.start(t(locale, 'cli.applyStart'));

  const colorEngine = new ColorEngine();
  const agentGenerator = new AgentGenerator();
  const typographyEngine = new TypographyEngine();

  // 1. Génération de la rampe tonale
  const primaryRamp = colorEngine.generateRamp(config.brand.colors.primary);

  // 2. Génération de la typo
  const typoCss = typographyEngine.generateCssVariables(config);
  const typoUrl = typographyEngine.getGoogleFontsUrl(config);

  // 3. Génération des fichiers pour les agents
  await agentGenerator.generate(config);

  // 4. Sauvegarde des tokens (JSON)
  await fs.writeJson(path.join(process.cwd(), '.tonium/tokens/primary.json'), primaryRamp, { spaces: 2 });
  await fs.writeFile(path.join(process.cwd(), '.tonium/tokens/typography.css'), typoCss);
  if (typoUrl) {
    await fs.writeFile(path.join(process.cwd(), '.tonium/tokens/fonts-import.css'), `@import url("${typoUrl}");`);
  }

  // 5. (Demo) Simulation de mise à jour CSS
  const tokenCss = `:root {
  --primary: ${primaryRamp['500']};
  --primary-foreground: ${colorEngine.getContrast(primaryRamp['500'], '#ffffff') > 4.5 ? '#ffffff' : '#000000'};
}`;
  
  await fs.writeFile(path.join(process.cwd(), '.tonium/tokens/colors.css'), tokenCss);

  s.stop(t(locale, 'cli.applySuccess'));

  logger.success(t(locale, 'cli.applySuccess'));
  logger.info(`${locale === 'fr' ? 'Artefacts agents générés' : 'Agent artifacts generated'} in ${chalk.cyan('.agents/tonium/')}`);
  
  p.outro(chalk.green(locale === 'fr' ? 'Prêt à coder.' : 'Ready to code.'));
}

