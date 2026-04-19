import * as p from '@clack/prompts';
import chalk from 'chalk';
import { ConfigManager } from '../core/generator/ConfigManager.js';
import { ColorEngine } from '../core/color/ColorEngine.js';
import { AgentGenerator } from '../core/generator/AgentGenerator.js';
import { logger } from '../utils/logger.js';
import fs from 'fs-extra';
import path from 'path';

export async function applyCommand() {
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (!config) {
    logger.error('Projet non initialisé. Veuillez lancer `tonium init` d\'abord.');
    return;
  }

  p.intro(chalk.bgGreen.black(' Tonium - Application du Design System '));

  const s = p.spinner();
  s.start('Génération des thèmes et des artefacts...');

  const colorEngine = new ColorEngine();
  const agentGenerator = new AgentGenerator();

  // 1. Génération de la rampe tonale
  const primaryRamp = colorEngine.generateRamp(config.brand.colors.primary);

  // 2. Génération des fichiers pour les agents
  await agentGenerator.generate(config);

  // 3. Sauvegarde des tokens (JSON)
  await fs.writeJson(path.join(process.cwd(), '.tonium/tokens/primary.json'), primaryRamp, { spaces: 2 });

  // 4. (Demo) Simulation de mise à jour CSS
  // En V1 réelle, on injecterait dans globals.css
  const tokenCss = `:root {
  --primary: ${primaryRamp['500']};
  --primary-foreground: ${colorEngine.getContrast(primaryRamp['500'], '#ffffff') > 4.5 ? '#ffffff' : '#000000'};
  /* ... autres tokens ... */
}`;
  
  await fs.writeFile(path.join(process.cwd(), '.tonium/tokens/theme.css'), tokenCss);

  s.stop('Génération terminée.');

  logger.success('Design System appliqué !');
  logger.info(`- Artefacts agents générés dans ${chalk.cyan('.agents/tonium/')}`);
  logger.info(`- Tokens générés dans ${chalk.cyan('.tonium/tokens/')}`);
  
  p.outro(chalk.green('Prêt à coder avec cohérence.'));
}
