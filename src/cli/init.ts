import * as p from '@clack/prompts';
import chalk from 'chalk';
import { Scanner } from '../core/scanner/Scanner.js';
import { ConfigManager, ToniumConfig } from '../core/generator/ConfigManager.js';
import { logger } from '../utils/logger.js';

export async function initCommand() {
  p.intro(chalk.bgCyan.black(' Tonium - Initialisation du Design System '));

  const scanner = new Scanner();
  const configManager = new ConfigManager();

  const loading = p.spinner();
  loading.start('Analyse du projet en cours...');
  
  let projectInfo;
  try {
    projectInfo = await scanner.scan();
    loading.stop('Analyse terminée.');
  } catch (error) {
    loading.stop(chalk.red('Analyse échouée.'));
    logger.error('Erreur : package.json introuvable. Veuillez lancer Tonium à la racine du projet.');
    return;
  }

  // Confirmation des détections
  const confirmDetection = await p.confirm({
    message: `Projet ${chalk.cyan(projectInfo.name)} détecté (${projectInfo.isNextJs ? 'Next.js' : 'Inconnu'}). Confirmer ?`,
    initialValue: true,
  });

  if (!confirmDetection || p.isCancel(confirmDetection)) {
    p.cancel('Opération annulée.');
    return;
  }

  // Questionnaire de Marque
  const brand = await p.group({
    name: () => p.text({ message: 'Nom de la marque', placeholder: projectInfo.name }),
    context: () => p.text({ message: 'Secteur / Contexte de la marque' }),
    primaryColor: () => p.text({ 
      message: 'Couleur primaire (Hex, RGB ou HSL)',
      placeholder: '#3b82f6',
      validate: (v) => !v || v.length < 3 ? 'Valeur invalide' : undefined
    }),
  });

  if (p.isCancel(brand)) {
    p.cancel('Opération annulée.');
    return;
  }

  // Options de mode
  const mode = await p.select({
    message: 'Stratégie de thème',
    options: [
      { value: 'hybrid', label: 'Hybride (Light & Dark)', hint: 'Recommandé' },
      { value: 'light', label: 'Light Mode uniquement' },
      { value: 'dark', label: 'Dark Mode uniquement' },
    ],
  });

  if (p.isCancel(mode)) return;

  // IA Optionnelle
  const useIA = await p.confirm({ message: 'Activer l\'enrichissement IA (OpenRouter) ?', initialValue: false });
  let openRouterKey;
  if (useIA === true) {
    openRouterKey = await p.password({ message: 'Clé API OpenRouter' });
  }

  const config: ToniumConfig = {
    project: projectInfo,
    brand: {
      name: brand.name,
      personality: [], // À enrichir par la suite
      colors: {
        primary: brand.primaryColor,
      },
    },
    options: {
      themeMode: mode as any,
      iaEnabled: !!useIA,
      openRouterKey: typeof openRouterKey === 'string' ? openRouterKey : undefined,
    },
  };

  const finalLoading = p.spinner();
  finalLoading.start('Initialisation des dossiers et de la configuration...');
  await configManager.initDirs();
  await configManager.saveConfig(config);
  finalLoading.stop('Structure de base créée avec succès !');

  p.outro(chalk.green('Tonium est initialisé. Lancez `tonium audit` pour analyser vos couleurs existantes.'));
}
