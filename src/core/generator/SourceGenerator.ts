import fs from 'fs-extra';
import path from 'path';
import { ToniumConfig } from './ConfigManager.js';
import { ColorEngine, ColorRamp } from '../color/ColorEngine.js';
import { TypographyEngine } from '../typography/TypographyEngine.js';

export class SourceGenerator {
  private cwd: string;
  private colorEngine: ColorEngine;
  private typographyEngine: TypographyEngine;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.colorEngine = new ColorEngine();
    this.typographyEngine = new TypographyEngine();
  }

  /**
   * Update app/globals.css with color tokens
   */
  async updateGlobalsCss(config: ToniumConfig, paletteRamps: Record<string, ColorRamp>): Promise<void> {
    const globalCssPath = config.project.globalCssPath;
    if (!globalCssPath) {
      console.log('No globals.css found, skipping update.');
      return;
    }

    let cssContent = await fs.readFile(globalCssPath, 'utf-8');

    // Generate color tokens CSS
    const colorTokens = this.generateColorTokensCss(config, paletteRamps);

    // Check if Tonium section exists
    const toniumStart = '/* BEGIN:tonium */';
    const toniumEnd = '/* END:tonium */';

    if (cssContent.includes(toniumStart) && cssContent.includes(toniumEnd)) {
      // Replace existing section
      const startIdx = cssContent.indexOf(toniumStart);
      const endIdx = cssContent.indexOf(toniumEnd) + toniumEnd.length;
      cssContent = cssContent.slice(0, startIdx) + colorTokens + cssContent.slice(endIdx);
    } else {
      // Append new section
      cssContent += '\n\n' + colorTokens;
    }

    await fs.writeFile(globalCssPath, cssContent);
  }

  /**
   * Update app/layout.tsx with next/font imports if fonts are changing
   */
  async updateLayoutTs(config: ToniumConfig): Promise<void> {
    if (config.brand.typography?.keepExisting) {
      console.log('Keeping existing fonts, skipping layout.tsx update.');
      return;
    }

    const layoutPath = config.project.layoutPath;
    if (!layoutPath) {
      console.log('No layout.tsx found, skipping update.');
      return;
    }

    const fontCode = this.typographyEngine.generateNextFontCode(config);
    if (!fontCode) {
      console.log('No fonts to add, skipping layout.tsx update.');
      return;
    }

    let layoutContent = await fs.readFile(layoutPath, 'utf-8');

    // Simple approach: insert after imports section
    const importEndIdx = layoutContent.lastIndexOf(';');
    if (importEndIdx !== -1) {
      layoutContent = layoutContent.slice(0, importEndIdx + 1) + '\n\n' + fontCode + '\n' + layoutContent.slice(importEndIdx + 1);
    }

    await fs.writeFile(layoutPath, layoutContent);
  }

  /**
   * Ensure import statement for .tonium/generated/tokens.css exists in globals.css
   */
  async ensureImportStatement(config: ToniumConfig): Promise<void> {
    const globalCssPath = config.project.globalCssPath;
    if (!globalCssPath) return;

    let cssContent = await fs.readFile(globalCssPath, 'utf-8');
    const importStatement = '@import "../.tonium/generated/tokens.css";';

    if (!cssContent.includes(importStatement)) {
      cssContent = importStatement + '\n\n' + cssContent;
      await fs.writeFile(globalCssPath, cssContent);
    }
  }

  /**
   * Generate CSS color tokens from palette ramps
   */
  private generateColorTokensCss(config: ToniumConfig, paletteRamps: Record<string, ColorRamp>): string {
    const outputFormat = config.brand.colors.outputFormat;
    let css = '/* BEGIN:tonium */\n';
    css += '/* Tonium Design System Tokens */\n\n';
    css += ':root {\n';

    // Generate color variables for each palette color
    Object.entries(paletteRamps).forEach(([colorName, ramp]) => {
      Object.entries(ramp).forEach(([level, colorValue]) => {
        css += `  --${colorName}-${level}: ${colorValue};\n`;
      });
    });

    css += '}\n';
    css += '/* END:tonium */';

    return css;
  }

  /**
   * Save generated tokens to .tonium/generated/tokens.css
   */
  async saveGeneratedTokens(config: ToniumConfig, paletteRamps: Record<string, ColorRamp>): Promise<void> {
    const tokensCss = this.generateColorTokensCss(config, paletteRamps);
    const typoCss = this.typographyEngine.generateCssVariables(config);

    const combinedCss = tokensCss + '\n\n' + typoCss;

    await fs.ensureDir(path.join(this.cwd, '.tonium/generated'));
    await fs.writeFile(path.join(this.cwd, '.tonium/generated/tokens.css'), combinedCss);
  }
}
