import * as p from '@clack/prompts';
import chalk from 'chalk';
import { ConfigManager } from '../core/generator/ConfigManager.js';
import { ColorEngine } from '../core/color/ColorEngine.js';
import { AgentGenerator } from '../core/generator/AgentGenerator.js';
import { TypographyEngine } from '../core/typography/TypographyEngine.js';
import { SourceGenerator } from '../core/generator/SourceGenerator.js';
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
  const sourceGenerator = new SourceGenerator();

  // 1. Génération des rampes tonales pour toute la palette
  const paletteRamps = colorEngine.generatePaletteRamps(
    config.brand.colors.palette,
    config.brand.colors.outputFormat
  );

  // 2. Génération de la typo
  const typoCss = typographyEngine.generateCssVariables(config);
  const typoUrl = typographyEngine.getGoogleFontsUrl(config);

  // 3. Sauvegarde des tokens JSON (nouvelle structure)
  await fs.ensureDir(path.join(process.cwd(), '.tonium/tokens'));
  await fs.writeJson(path.join(process.cwd(), '.tonium/tokens/brand-palette.json'), config.brand.colors.palette, { spaces: 2 });
  await fs.writeJson(path.join(process.cwd(), '.tonium/tokens/semantic-colors.json'), {}, { spaces: 2 });
  await fs.writeJson(path.join(process.cwd(), '.tonium/tokens/tonal-scales.json'), paletteRamps, { spaces: 2 });
  await fs.writeJson(path.join(process.cwd(), '.tonium/tokens/typography.json'), config.brand.typography, { spaces: 2 });

  // 4. Sauvegarde des fichiers CSS
  await fs.writeFile(path.join(process.cwd(), '.tonium/tokens/typography.css'), typoCss);
  if (typoUrl) {
    await fs.writeFile(path.join(process.cwd(), '.tonium/tokens/fonts-import.css'), `@import url("${typoUrl}");`);
  }

  // 5. Génération des tokens dans .tonium/generated/
  await sourceGenerator.saveGeneratedTokens(config, paletteRamps);

  // 6. Mise à jour des fichiers sources du projet
  await sourceGenerator.updateGlobalsCss(config, paletteRamps);
  await sourceGenerator.updateLayoutTs(config);
  await sourceGenerator.ensureImportStatement(config);

  // 7. Génération des fichiers pour les agents
  await agentGenerator.generate(config);

  s.stop(t(locale, 'cli.applySuccess'));

  logger.success(t(locale, 'cli.applySuccess'));
  logger.info(`${locale === 'fr' ? 'Artefacts agents générés' : 'Agent artifacts generated'} in ${chalk.cyan('.agents/tonium/')}`);
  logger.info(`${locale === 'fr' ? 'Fichiers sources mis à jour' : 'Source files updated'}: ${chalk.cyan('app/globals.css')}, ${chalk.cyan('app/layout.tsx')}`);

  p.outro(chalk.green(locale === 'fr' ? 'Prêt à coder.' : 'Ready to code.'));
}

