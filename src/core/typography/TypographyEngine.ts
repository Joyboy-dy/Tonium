import { ToniumConfig } from '../generator/ConfigManager.js';

export interface TypographyTokens {
  heading: string;
  body: string;
  mono: string;
}

export class TypographyEngine {
  constructor() {}

  /**
   * Generates CSS font-family variables based on the config.
   */
  generateCssVariables(config: ToniumConfig): string {
    const heading = config.brand.typography?.heading || 'Inter';
    const body = config.brand.typography?.body || 'Inter';
    const mono = config.brand.typography?.mono || 'Fira Code';

    return `
:root {
  --font-heading: "${heading}", ui-sans-serif, system-ui, sans-serif;
  --font-body: "${body}", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "${mono}", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
`;
  }

  /**
   * Generates a Google Fonts import URL if needed.
   * In V1, we just return a simple array of families.
   */
  getGoogleFontsUrl(config: ToniumConfig): string {
    const families = new Set<string>();
    if (config.brand.typography?.heading) families.add(config.brand.typography.heading);
    if (config.brand.typography?.body) families.add(config.brand.typography.body);
    if (config.brand.typography?.mono) families.add(config.brand.typography.mono);

    if (families.size === 0) return '';

    const familyParam = Array.from(families)
      .map(f => f.replace(/\s+/g, '+'))
      .join('&family=');

    return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@400;500;600;700&display=swap`;
  }
}
