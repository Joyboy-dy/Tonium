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
   * Only generates variables for fonts that are actually defined.
   * Never injects fallback defaults if the user left fields empty.
   */
  generateCssVariables(config: ToniumConfig): string {
    const heading = config.brand.typography?.heading;
    const body = config.brand.typography?.body;
    const mono = config.brand.typography?.mono;

    let css = ':root {\n';

    if (heading) {
      css += `  --font-heading: "${heading}", ui-sans-serif, system-ui, sans-serif;\n`;
    }
    if (body) {
      css += `  --font-body: "${body}", ui-sans-serif, system-ui, sans-serif;\n`;
    }
    if (mono) {
      css += `  --font-mono: "${mono}", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\n`;
    }

    css += '}\n';
    return css;
  }

  /**
   * Generates a Google Fonts import URL if needed.
   * Only generates if fonts are actually defined.
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

  /**
   * Generates next/font/google import code for layout.tsx
   * Only generates if keepExisting is false and fonts are defined
   */
  generateNextFontCode(config: ToniumConfig): string {
    if (config.brand.typography?.keepExisting) {
      return '';
    }

    const imports: string[] = [];
    const declarations: string[] = [];

    if (config.brand.typography?.heading) {
      const fontName = config.brand.typography.heading;
      const varName = this.toCamelCase(fontName);
      imports.push(`import { ${fontName} } from 'next/font/google'`);
      declarations.push(`const ${varName} = ${fontName}({ subsets: ['latin'], variable: '--font-${varName.toLowerCase()}' })`);
    }

    if (config.brand.typography?.body) {
      const fontName = config.brand.typography.body;
      const varName = this.toCamelCase(fontName);
      if (!imports.some(i => i.includes(fontName))) {
        imports.push(`import { ${fontName} } from 'next/font/google'`);
        declarations.push(`const ${varName} = ${fontName}({ subsets: ['latin'], variable: '--font-${varName.toLowerCase()}' })`);
      }
    }

    if (config.brand.typography?.mono) {
      const fontName = config.brand.typography.mono;
      const varName = this.toCamelCase(fontName);
      if (!imports.some(i => i.includes(fontName))) {
        imports.push(`import { ${fontName} } from 'next/font/google'`);
        declarations.push(`const ${varName} = ${fontName}({ subsets: ['latin'], variable: '--font-${varName.toLowerCase()}' })`);
      }
    }

    return [...imports, '', ...declarations].join('\n');
  }

  private toCamelCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
  }
}
