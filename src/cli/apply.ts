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
  await configManager.initDirs();

  const colorEngine = new ColorEngine();
  const agentGenerator = new AgentGenerator();
  const typographyEngine = new TypographyEngine();
  const sourceGenerator = new SourceGenerator();

  const writtenArtifacts = new Set<string>();

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
  const brandPalettePath = path.join(process.cwd(), '.tonium/tokens/brand-palette.json');
  const tonalScalePath = path.join(process.cwd(), '.tonium/tokens/tonal-scales.json');
  const typographyPath = path.join(process.cwd(), '.tonium/tokens/typography.json');
  await fs.writeJson(brandPalettePath, config.brand.colors.palette, { spaces: 2 });
  await fs.writeJson(tonalScalePath, paletteRamps, { spaces: 2 });
  await fs.writeJson(typographyPath, config.brand.typography, { spaces: 2 });
  writtenArtifacts.add(brandPalettePath);
  writtenArtifacts.add(tonalScalePath);
  writtenArtifacts.add(typographyPath);

  // 4. Sauvegarde des fichiers CSS
  const typographyCssPath = path.join(process.cwd(), '.tonium/tokens/typography.css');
  await fs.writeFile(typographyCssPath, typoCss);
  writtenArtifacts.add(typographyCssPath);
  if (typoUrl) {
    const fontsImportPath = path.join(process.cwd(), '.tonium/tokens/fonts-import.css');
    await fs.writeFile(fontsImportPath, `@import url("${typoUrl}");`);
    writtenArtifacts.add(fontsImportPath);
  }

  // 5. Génération des tokens dans .tonium/generated/
  (await sourceGenerator.saveGeneratedTokens(config, paletteRamps)).forEach((filePath) => writtenArtifacts.add(filePath));

  // 6. Mise à jour des fichiers sources du projet
  (await sourceGenerator.updateGlobalsCss(config, paletteRamps)).forEach((filePath) => writtenArtifacts.add(filePath));
  (await sourceGenerator.updateLayoutTs(config)).forEach((filePath) => writtenArtifacts.add(filePath));
  (await sourceGenerator.ensureImportStatement(config)).forEach((filePath) => writtenArtifacts.add(filePath));

  // 7. Génération des fichiers pour les agents
  (await agentGenerator.generate(config)).forEach((filePath) => writtenArtifacts.add(filePath));

  s.stop(t(locale, 'cli.applySuccess'));

  logger.success(t(locale, 'cli.applySuccess'));
  logger.info(locale === 'fr' ? 'Artefacts générés / modifiés :' : 'Generated / updated artifacts:');
  [...writtenArtifacts]
    .sort((a, b) => a.localeCompare(b))
    .forEach((filePath) => logger.info(` - ${chalk.cyan(path.relative(process.cwd(), filePath))}`));

  p.note(locale === 'fr' ? `Skill recommandé pour une meilleure cohérence chromatique agent :
npx @joyboy-dy/felicio-ai-skills add chromatic-design

Pourquoi :
- complète les règles écrites dans AGENTS.md
- aide les agents à mieux respecter les contrastes et l’usage des couleurs
- recommandé mais optionnel` : `Recommended skill for better agent-side chromatic consistency:
npx @joyboy-dy/felicio-ai-skills add chromatic-design

Why:
- complements the rules written in AGENTS.md
- helps agents better follow contrast and color-usage rules
- recommended but optional`);

  p.outro(chalk.green(locale === 'fr' ? 'Prêt à coder.' : 'Ready to code.'));
}
