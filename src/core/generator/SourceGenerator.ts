import fs from 'fs-extra';
import path from 'path';
import { ToniumConfig } from './ConfigManager.js';
import { ColorRamp } from '../color/ColorEngine.js';

export class SourceGenerator {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  async updateGlobalsCss(config: ToniumConfig): Promise<string[]> {
    const globalCssPath = config.project.globalCssPath;
    if (!globalCssPath) {
      return [];
    }

    let cssContent = await fs.readFile(globalCssPath, 'utf-8');
    const semanticRoleBlock = this.generateProjectSemanticRoleBlock();

    const toniumStart = '/* BEGIN:tonium-roles */';
    const toniumEnd = '/* END:tonium-roles */';

    if (cssContent.includes(toniumStart) && cssContent.includes(toniumEnd)) {
      const startIdx = cssContent.indexOf(toniumStart);
      const endIdx = cssContent.indexOf(toniumEnd) + toniumEnd.length;
      cssContent = `${cssContent.slice(0, startIdx)}${semanticRoleBlock}${cssContent.slice(endIdx)}`;
    } else {
      cssContent = `${cssContent.trimEnd()}\n\n${semanticRoleBlock}\n`;
    }

    await fs.writeFile(globalCssPath, cssContent, 'utf-8');
    return [globalCssPath];
  }

  async updateLayoutTs(config: ToniumConfig): Promise<string[]> {
    if (config.brand.typography?.keepExisting) {
      return [];
    }

    const layoutPath = config.project.layoutPath;
    if (!layoutPath || !(await fs.pathExists(layoutPath))) {
      return [];
    }

    const requiredVariables = ['--font-heading', '--font-body'];
    const typography = config.brand.typography;
    if (typography?.mono) {
      requiredVariables.push('--font-mono');
    }

    let layoutContent = await fs.readFile(layoutPath, 'utf-8');
    const hasAllVariables = requiredVariables.every((variable) => layoutContent.includes(variable));

    if (hasAllVariables && layoutContent.includes('/* BEGIN:tonium-fonts */')) {
      return [];
    }

    const fontSpecs = [
      { key: 'heading', font: typography?.heading },
      { key: 'body', font: typography?.body },
      { key: 'mono', font: typography?.mono },
    ].filter((entry): entry is { key: string; font: string } => Boolean(entry.font));

    if (fontSpecs.length === 0) {
      return [];
    }

    const existingGoogleImportMatch = layoutContent.match(/import\s+\{([^}]+)\}\s+from\s+['"]next\/font\/google['"];?/);
    const requiredFonts = fontSpecs.map((spec) => spec.font);
    const alreadyImported = existingGoogleImportMatch
      ? existingGoogleImportMatch[1].split(',').map((part) => part.trim()).filter(Boolean)
      : [];
    const missingFonts = requiredFonts.filter((font) => !alreadyImported.includes(font));

    if (existingGoogleImportMatch && missingFonts.length > 0) {
      const mergedFonts = [...alreadyImported, ...missingFonts].join(', ');
      layoutContent = layoutContent.replace(existingGoogleImportMatch[0], `import { ${mergedFonts} } from 'next/font/google';`);
    } else if (!existingGoogleImportMatch) {
      const importLine = `import { ${requiredFonts.join(', ')} } from 'next/font/google';`;
      const importMatches = [...layoutContent.matchAll(/^import .*;$/gm)];
      const insertPosition = importMatches.length > 0
        ? (importMatches[importMatches.length - 1].index || 0) + importMatches[importMatches.length - 1][0].length
        : 0;
      layoutContent = `${layoutContent.slice(0, insertPosition)}\n${importLine}${layoutContent.slice(insertPosition)}`;
    }

    const declarations = fontSpecs
      .map((spec) => `const tonium${spec.key[0].toUpperCase()}${spec.key.slice(1)}Font = ${spec.font}({ subsets: ['latin'], variable: '--font-${spec.key}' });`)
      .join('\n');

    const declarationBlock = `/* BEGIN:tonium-fonts */\n${declarations}\n/* END:tonium-fonts */`;
    if (layoutContent.includes('/* BEGIN:tonium-fonts */') && layoutContent.includes('/* END:tonium-fonts */')) {
      const blockStart = layoutContent.indexOf('/* BEGIN:tonium-fonts */');
      const blockEnd = layoutContent.indexOf('/* END:tonium-fonts */') + '/* END:tonium-fonts */'.length;
      layoutContent = `${layoutContent.slice(0, blockStart)}${declarationBlock}${layoutContent.slice(blockEnd)}`;
    } else {
      const insertionAnchor = layoutContent.search(/\nexport\s+(const\s+metadata|default\s+function)/);
      if (insertionAnchor !== -1) {
        layoutContent = `${layoutContent.slice(0, insertionAnchor)}\n${declarationBlock}\n${layoutContent.slice(insertionAnchor)}`;
      }
    }

    await fs.writeFile(layoutPath, layoutContent, 'utf-8');
    return [layoutPath];
  }

  async ensureImportStatement(config: ToniumConfig): Promise<string[]> {
    const globalCssPath = config.project.globalCssPath;
    if (!globalCssPath) return [];

    const tokensPath = path.join(this.cwd, '.tonium/generated/tokens.css');
    const importTarget = path.relative(path.dirname(globalCssPath), tokensPath).replace(/\\/g, '/');
    const importStatement = `@import "${importTarget.startsWith('.') ? importTarget : `./${importTarget}`}";`;

    let cssContent = await fs.readFile(globalCssPath, 'utf-8');
    const importRegex = /@import\s+['"]([^'"]*\.tonium\/generated\/tokens\.css)['"];?/;

    if (importRegex.test(cssContent)) {
      cssContent = cssContent.replace(importRegex, importStatement);
      await fs.writeFile(globalCssPath, cssContent, 'utf-8');
      return [globalCssPath];
    }

    if (cssContent.includes(importStatement)) {
      return [];
    }

    cssContent = `${importStatement}\n${cssContent}`;
    await fs.writeFile(globalCssPath, cssContent, 'utf-8');
    return [globalCssPath];
  }

  async saveGeneratedTokens(config: ToniumConfig, paletteRamps: Record<string, ColorRamp>): Promise<string[]> {
    const tokensCss = this.generateTokensCss(config, paletteRamps);

    const generatedDir = path.join(this.cwd, '.tonium/generated');
    await fs.ensureDir(generatedDir);

    const tokensPath = path.join(generatedDir, 'tokens.css');
    await fs.writeFile(tokensPath, tokensCss, 'utf-8');

    const primitivesPath = path.join(this.cwd, '.tonium/tokens/primitive-colors.json');
    const semanticPath = path.join(this.cwd, '.tonium/tokens/semantic-colors.json');

    await fs.ensureDir(path.dirname(primitivesPath));
    await fs.writeJson(primitivesPath, this.generatePrimitiveTokens(paletteRamps), { spaces: 2 });
    await fs.writeJson(semanticPath, this.generateSemanticTokens(paletteRamps), { spaces: 2 });

    return [tokensPath, primitivesPath, semanticPath];
  }

  private generateTokensCss(config: ToniumConfig, paletteRamps: Record<string, ColorRamp>): string {
    const primitive = this.generatePrimitiveTokens(paletteRamps);
    const semantic = this.generateSemanticTokens(paletteRamps);

    let css = '/* BEGIN:tonium-tokens */\n';
    css += `/* Tonium generated tokens (${config.brand.colors.outputFormat}) */\n`;
    css += ':root {\n';

    Object.entries(primitive).forEach(([token, value]) => {
      css += `  ${token}: ${value};\n`;
    });

    Object.entries(semantic).forEach(([token, value]) => {
      css += `  ${token}: ${value};\n`;
    });

    css += '}\n';
    css += '/* END:tonium-tokens */\n';

    return css;
  }

  private generatePrimitiveTokens(paletteRamps: Record<string, ColorRamp>): Record<string, string> {
    const primitive: Record<string, string> = {};

    Object.entries(paletteRamps).forEach(([name, ramp]) => {
      Object.entries(ramp).forEach(([level, value]) => {
        primitive[`--color-primitive-${name}-${level}`] = value;
      });
    });

    return primitive;
  }

  private generateSemanticTokens(paletteRamps: Record<string, ColorRamp>): Record<string, string> {
    const brand = paletteRamps.color1 || Object.values(paletteRamps)[0] || {};
    const accent = paletteRamps.color2 || brand;

    return {
      '--color-semantic-surface-default-bg': brand['50'] || '#ffffff',
      '--color-semantic-surface-card-bg': brand['100'] || '#f5f5f5',
      '--color-semantic-surface-muted-bg': brand['200'] || '#e5e5e5',
      '--color-semantic-text-default-primary': brand['900'] || '#111111',
      '--color-semantic-text-default-secondary': brand['700'] || '#333333',
      '--color-semantic-action-primary-bg': brand['600'] || '#2563eb',
      '--color-semantic-action-primary-fg': brand['50'] || '#ffffff',
      '--color-semantic-action-accent-bg': accent['500'] || brand['500'] || '#7c3aed',
      '--color-semantic-action-accent-fg': accent['50'] || '#ffffff',
      '--color-semantic-border-default': brand['300'] || '#d4d4d4',
    };
  }

  private generateProjectSemanticRoleBlock(): string {
    return `/* BEGIN:tonium-roles */
:root {
  --background: var(--color-semantic-surface-default-bg);
  --card: var(--color-semantic-surface-card-bg);
  --accent: var(--color-semantic-action-accent-bg);
  --primary: var(--color-semantic-action-primary-bg);
  --foreground: var(--color-semantic-text-default-primary);
}

.dark {
  --background: var(--color-primitive-color1-900);
  --card: var(--color-primitive-color1-800);
  --accent: var(--color-primitive-color2-700, var(--color-primitive-color1-700));
  --primary: var(--color-primitive-color1-500);
  --foreground: var(--color-primitive-color1-50);
}
/* END:tonium-roles */`;
  }
}
