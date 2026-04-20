import fs from 'fs-extra';
import path from 'path';
import { ToniumConfig } from './ConfigManager.js';

export class AgentGenerator {
  private baseDir = '.agents/tonium';
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  async generate(config: ToniumConfig): Promise<string[]> {
    await fs.ensureDir(path.join(this.cwd, this.baseDir));
    const writtenPaths: string[] = [];

    writtenPaths.push(await this.generateBrandSystem(config));
    writtenPaths.push(await this.generateDesignRules(config));
    writtenPaths.push(await this.generateAgentsMd(config));
    writtenPaths.push(...(await this.generateChromaticSkill()));
    writtenPaths.push(...(await this.copyChromaticSkillFile()));

    return writtenPaths;
  }

  private async generateBrandSystem(config: ToniumConfig): Promise<string> {
    const content = `# Brand System: ${config.brand.name}

## Identity
- **Name**: ${config.brand.name}
- **Sector**: ${config.projectType}
- **Theme Mode**: ${config.options.themeMode}

## Color Palette (Tokens)
- **Brand Palette**: ${config.brand.colors.palette.join(', ')}
- **Output Format**: ${config.brand.colors.outputFormat.toUpperCase()}
- **Strict Palette**: ${config.brand.colors.strictPalette ? 'Yes' : 'No'}

## Typography
- **Heading**: ${config.brand.typography?.heading || 'System Default'}
- **Body**: ${config.brand.typography?.body || 'System Default'}
- **Mono**: ${config.brand.typography?.mono || 'System Default'}
- **Keep Existing Fonts**: ${config.brand.typography?.keepExisting ? 'Yes' : 'No'}

## Visual Signature
This system prioritizes visual consistency using the OKLCH color space. Agents must strictly adhere to WCAG AA contrast standards (minimum 4.5:1 ratio) when generating UI components.
`;
    const brandSystemPath = path.join(this.cwd, this.baseDir, 'brand-system.md');
    await fs.writeFile(brandSystemPath, content);
    return brandSystemPath;
  }

  private async generateDesignRules(config: ToniumConfig): Promise<string> {
    const content = `# Design Rules (Tonium)

1. **Accessibility**: Never use text with a contrast ratio below 4.5:1 relative to its background.
2. **Color Usage**: Use ONLY the CSS variables defined in \`globals.css\`. Do not use arbitrary hex codes.
3. **Hierarchy**: Follow the generated tonal ramp for interactive states (hover, active, focus, disabled).
4. **Theme**: In ${config.options.themeMode} mode, ensure surfaces respect the established brand polarity.
5. **Layout**: Maintain consistent spacing and alignment as per the project's standard grid.
`;
    const designRulesPath = path.join(this.cwd, this.baseDir, 'design-rules.md');
    await fs.writeFile(designRulesPath, content);
    return designRulesPath;
  }

  private async generateAgentsMd(config: ToniumConfig): Promise<string> {
    const agentsMdPath = path.join(this.cwd, 'AGENTS.md');
    const toniumBlock = `<!-- BEGIN:tonium -->
# Tonium Agent Context

Read and follow these project-specific design rules before making UI changes.

## Tonium resources
- Brand system: \`.agents/tonium/brand-system.md\`
- Design rules: \`.agents/tonium/design-rules.md\`
- Chromatic design skill: \`.agents/skills/chromatic-design/SKILL.md\`

## Mandatory rules
- Respect the project color tokens defined in \`app/globals.css\`
- Preserve contrast quality and accessibility
- Do not invent arbitrary colors outside the approved brand system
- Reuse existing typography unless a deliberate typography migration is requested
- Before modifying UI colors, inspect current tokens and semantic roles
- Always use OKLCH for color calculations (never HSL as primary model)
- Follow the 60/30/10 distribution rule for layouts
<!-- END:tonium -->`;

    if (await fs.pathExists(agentsMdPath)) {
      // Parse existing content and inject/replace Tonium block
      let existingContent = await fs.readFile(agentsMdPath, 'utf-8');
      const toniumStart = '<!-- BEGIN:tonium -->';
      const toniumEnd = '<!-- END:tonium -->';

      if (existingContent.includes(toniumStart) && existingContent.includes(toniumEnd)) {
        // Replace existing block
        const startIdx = existingContent.indexOf(toniumStart);
        const endIdx = existingContent.indexOf(toniumEnd) + toniumEnd.length;
        existingContent = existingContent.slice(0, startIdx) + toniumBlock + existingContent.slice(endIdx);
      } else {
        // Append new block
        existingContent += '\n\n' + toniumBlock;
      }

      await fs.writeFile(agentsMdPath, existingContent);
    } else {
      // Create new file
      await fs.writeFile(agentsMdPath, toniumBlock);
    }
    return agentsMdPath;
  }

  private async generateChromaticSkill(): Promise<string[]> {
    const skillDir = path.join(this.cwd, '.agents/skills/chromatic-design');
    await fs.ensureDir(skillDir);

    const skillContent = `# Chromatic Design Skill

This skill provides guidance for working with the Tonium design system and color tokens.

## Overview

Tonium uses OKLCH color space for perceptual uniformity and better contrast control. All color calculations are performed internally in OKLCH, then converted to the project's specified output format (HEX, RGB, HSL, or OKLCH).

## Color Token Structure

The design system uses a tonal ramp structure with levels 50-950:
- 50-100: Very light backgrounds
- 200-400: Light surfaces
- 500: Base brand color
- 600-800: Dark surfaces
- 900-950: Very dark backgrounds

## Typography

Typography is managed via next/font/google for Next.js projects. Font variables are defined as CSS custom properties (\`--font-heading\`, \`--font-body\`, \`--font-mono\`).

## Accessibility Rules

- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Always verify contrast before finalizing color choices
- Use the Tonium ColorEngine for accurate contrast calculations

## Usage Guidelines

1. Always reference existing tokens from \`app/globals.css\`
2. Never invent new colors outside the approved brand palette
3. Use semantic roles (primary, secondary, accent) consistently
4. Maintain visual hierarchy through tonal variations
5. Respect the project's theme mode (light, dark, or hybrid)
`;

    const skillPath = path.join(skillDir, 'SKILL.md');
    await fs.writeFile(skillPath, skillContent);
    return [skillPath];
  }

  private async copyChromaticSkillFile(): Promise<string[]> {
    // Copy chromatic-design skill from package to project
    const packageRoot = path.resolve(__dirname, '../../../..');
    const skillSourceDir = path.join(packageRoot, 'skills/chromatic-design');

    const skillDestDir = path.join(this.cwd, '.agents/skills/chromatic-design');
    const copied: string[] = [];

    // Copy entire chromatic-design directory
    if (await fs.pathExists(skillSourceDir)) {
      await fs.ensureDir(skillDestDir);
      const files = await fs.readdir(skillSourceDir);
      for (const file of files) {
        const srcPath = path.join(skillSourceDir, file);
        const destPath = path.join(skillDestDir, file);
        const stat = await fs.stat(srcPath);
        if (stat.isDirectory()) {
          await fs.copy(srcPath, destPath);
        } else {
          await fs.copy(srcPath, destPath);
        }
        copied.push(destPath);
      }
    }
    return copied;
  }
}
