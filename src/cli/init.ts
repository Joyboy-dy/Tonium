import * as p from '@clack/prompts';
import chalk from 'chalk';
import { Scanner } from '../core/scanner/Scanner.js';
import { ConfigManager, ToniumConfig } from '../core/generator/ConfigManager.js';
import { logger } from '../utils/logger.js';
import { t, Locale } from '../utils/i18n.js';

export async function initCommand() {
  // 1. Sélection de la langue
  const selectedLocale = await p.select({
    message: 'Choose your language / Choisissez votre langue',
    options: [
      { value: 'en', label: 'English' },
      { value: 'fr', label: 'Français' },
    ],
  }) as Locale | symbol;

  if (p.isCancel(selectedLocale)) {
    p.cancel('Operation cancelled / Opération annulée.');
    return;
  }

  const locale = selectedLocale;

  p.intro(chalk.bgCyan.black(` ${t(locale, 'cli.intro')} `));

  const scanner = new Scanner();
  const configManager = new ConfigManager();

  const loading = p.spinner();
  loading.start(t(locale, 'cli.auditStart'));
  
  let projectInfo;
  try {
    projectInfo = await scanner.scan();
    loading.stop(t(locale, 'cli.auditDone'));
  } catch (error) {
    loading.stop(chalk.red(t(locale, 'cli.cancel')));
    logger.error('Error: package.json not found.');
    return;
  }

  // Confirmation des détections
  const confirmDetection = await p.confirm({
    message: t(locale, 'cli.projectDetected', { name: projectInfo.name, type: projectInfo.isNextJs ? 'Next.js' : 'Unknown' }),
    initialValue: true,
  });

  if (!confirmDetection || p.isCancel(confirmDetection)) {
    p.cancel(t(locale, 'cli.cancel'));
    return;
  }

  // Questionnaire de Marque
  const brand = await p.group({
    name: () => p.text({ message: t(locale, 'cli.brandName'), placeholder: projectInfo.name }),
    context: () => p.text({ message: t(locale, 'cli.brandContext') }),
    primaryColor: () => p.text({ 
      message: t(locale, 'cli.primaryColor'),
      placeholder: '#3b82f6',
      validate: (v) => !v || v.length < 3 ? t(locale, 'cli.invalidValue') : undefined
    }),
    headingFont: () => p.text({ message: t(locale, 'cli.typographyHeading'), placeholder: 'Inter' }),
    bodyFont: () => p.text({ message: t(locale, 'cli.typographyBody'), placeholder: 'Inter' }),
    monoFont: () => p.text({ message: t(locale, 'cli.typographyMono'), placeholder: 'Fira Code' }),
  });

  if (p.isCancel(brand)) {
    p.cancel(t(locale, 'cli.cancel'));
    return;
  }

  // Options de mode
  const mode = await p.select({
    message: t(locale, 'cli.themeStrategy'),
    options: [
      { value: 'hybrid', label: t(locale, 'cli.hybrid'), hint: 'Recommended' },
      { value: 'light', label: t(locale, 'cli.lightOnly') },
      { value: 'dark', label: t(locale, 'cli.darkOnly') },
    ],
  });

  if (p.isCancel(mode)) return;

  // IA Optionnelle
  const useIA = await p.confirm({ message: t(locale, 'cli.iaEnabled'), initialValue: false });
  let openRouterKey;
  if (useIA === true) {
    openRouterKey = await p.password({ message: t(locale, 'cli.openRouterKey') });
  }

  const config: ToniumConfig = {
    version: '1.0.1',
    locale,
    aiArtifactsLanguage: 'en',
    projectType: projectInfo.isNextJs ? 'nextjs' : 'unknown',
    features: {
      ai: !!useIA,
      mcp: true,
      skills: true,
      typography: true,
    },
    project: projectInfo,
    brand: {
      name: brand.name,
      personality: [],
      colors: {
        primary: brand.primaryColor,
      },
      typography: {
        heading: brand.headingFont || 'Inter',
        body: brand.bodyFont || 'Inter',
        mono: brand.monoFont || 'Fira Code',
      }
    },
    options: {
      themeMode: mode as any,
      openRouterKey: typeof openRouterKey === 'string' ? openRouterKey : undefined,
    },
  };

  const finalLoading = p.spinner();
  finalLoading.start(t(locale, 'cli.initSuccess'));
  await configManager.initDirs();
  await configManager.saveConfig(config);
  finalLoading.stop(t(locale, 'cli.initSuccess'));

  p.outro(chalk.green(t(locale, 'cli.outroInit')));
}

