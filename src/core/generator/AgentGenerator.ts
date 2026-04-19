import fs from 'fs-extra';
import path from 'path';
import { ToniumConfig } from './ConfigManager.js';

export class AgentGenerator {
  private baseDir = '.agents/tonium';
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  async generate(config: ToniumConfig): Promise<void> {
    await fs.ensureDir(path.join(this.cwd, this.baseDir));

    await this.generateBrandSystem(config);
    await this.generateDesignRules(config);
  }

  private async generateBrandSystem(config: ToniumConfig): Promise<void> {
    const content = `# Brand System: ${config.brand.name}

## Identity
- **Name**: ${config.brand.name}
- **Sector**: ${config.projectType}
- **Theme Mode**: ${config.options.themeMode}

## Color Palette (Tokens)
- **Primary**: ${config.brand.colors.primary}

## Typography
- **Heading**: ${config.brand.typography?.heading || 'System Default'}
- **Body**: ${config.brand.typography?.body || 'System Default'}

## Visual Signature
This system prioritizes visual consistency using the OKLCH color space. Agents must strictly adhere to WCAG AA contrast standards (minimum 4.5:1 ratio) when generating UI components.
`;
    await fs.writeFile(path.join(this.cwd, this.baseDir, 'brand-system.md'), content);
  }

  private async generateDesignRules(config: ToniumConfig): Promise<void> {
    const content = `# Design Rules (Tonium)

1. **Accessibility**: Never use text with a contrast ratio below 4.5:1 relative to its background.
2. **Color Usage**: Use ONLY the CSS variables defined in \`globals.css\`. Do not use arbitrary hex codes.
3. **Hierarchy**: Follow the generated tonal ramp for interactive states (hover, active, focus, disabled).
4. **Theme**: In ${config.options.themeMode} mode, ensure surfaces respect the established brand polarity.
5. **Layout**: Maintain consistent spacing and alignment as per the project's standard grid.
`;
    await fs.writeFile(path.join(this.cwd, this.baseDir, 'design-rules.md'), content);
  }
}

