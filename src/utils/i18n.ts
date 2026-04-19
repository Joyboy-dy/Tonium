export type Locale = 'fr' | 'en';

const translations = {
  fr: {
    cli: {
      intro: 'Tonium - Initialisation du Design System',
      audit: 'Tonium - Audit Visuel',
      apply: 'Tonium - Application du Design System',
      projectDetected: 'Projet {name} détecté ({type}). Confirmer ?',
      brandName: 'Nom de la marque',
      brandContext: 'Secteur / Contexte de la marque',
      primaryColor: 'Couleur primaire (Hex, RGB ou HSL)',
      themeStrategy: 'Stratégie de thème',
      hybrid: 'Hybride (Light & Dark)',
      lightOnly: 'Light Mode uniquement',
      darkOnly: 'Dark Mode uniquement',
      iaEnabled: 'Activer l\'enrichissement IA (OpenRouter) ?',
      openRouterKey: 'Clé API OpenRouter',
      initSuccess: 'Structure de base créée avec succès !',
      outroInit: 'Tonium est initialisé. Lancez `tonium audit` pour analyser vos couleurs existantes.',
      typographyHeading: 'Police pour les titres (Heading)',
      typographyBody: 'Police pour le texte (Body)',
      typographyMono: 'Police pour le code (Mono)',
      auditStart: 'Analyse des fichiers CSS et des contrastes...',
      noCss: 'Aucun fichier CSS global détecté.',
      auditDone: 'Analyse terminée.',
      applyStart: 'Génération des thèmes et des artefacts...',
      applySuccess: 'Design System appliqué !',
      cancel: 'Opération annulée.',
      invalidValue: 'Valeur invalide',
    }
  },
  en: {
    cli: {
      intro: 'Tonium - Design System Initialization',
      audit: 'Tonium - Visual Audit',
      apply: 'Tonium - Design System Application',
      projectDetected: 'Project {name} detected ({type}). Confirm?',
      brandName: 'Brand name',
      brandContext: 'Brand Sector / Context',
      primaryColor: 'Primary color (Hex, RGB or HSL)',
      themeStrategy: 'Theme strategy',
      hybrid: 'Hybrid (Light & Dark)',
      lightOnly: 'Light Mode only',
      darkOnly: 'Dark Mode only',
      iaEnabled: 'Enable AI enrichment (OpenRouter)?',
      openRouterKey: 'OpenRouter API Key',
      initSuccess: 'Base structure created successfully!',
      outroInit: 'Tonium is initialized. Run `tonium audit` to analyze your existing colors.',
      typographyHeading: 'Font for headings',
      typographyBody: 'Font for body text',
      typographyMono: 'Font for code (Mono)',
      auditStart: 'Analyzing CSS files and contrasts...',
      noCss: 'No global CSS file detected.',
      auditDone: 'Analysis completed.',
      applyStart: 'Generating themes and artifacts...',
      applySuccess: 'Design System applied!',
      cancel: 'Operation cancelled.',
      invalidValue: 'Invalid value',
    }
  }
};

export function t(locale: Locale, key: string, params: Record<string, string> = {}): string {
  const keys = key.split('.');
  let result: any = translations[locale];
  
  for (const k of keys) {
    if (result && result[k]) {
      result = result[k];
    } else {
      return key;
    }
  }

  if (typeof result !== 'string') return key;

  let finalString = result;
  for (const [pKey, pValue] of Object.entries(params)) {
    finalString = finalString.replace(`{${pKey}}`, pValue);
  }

  return finalString;
}
