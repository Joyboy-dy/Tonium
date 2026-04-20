import fs from 'fs-extra';
import { formatCss, parse } from 'culori';
import { ColorEngine } from '../color/ColorEngine.js';

export interface StyleReport {
  colors: string[];
  vulnerabilities: {
    lowContrast: Array<{ pair: [string, string]; ratio: number }>;
  };
}

export class StyleExtractor {
  private colorEngine = new ColorEngine();
  private cssColorRegex = /#(?:[\da-fA-F]{3,4}|[\da-fA-F]{6}|[\da-fA-F]{8})\b|(?:rgb|rgba|hsl|hsla|oklch)\([^)]+\)|var\(--[\w-]+\)/g;

  async extractColors(cssPath: string): Promise<string[]> {
    if (!(await fs.pathExists(cssPath))) return [];
    const content = await fs.readFile(cssPath, 'utf-8');

    const variableMap = this.extractCssVariables(content);
    const matches = content.match(this.cssColorRegex) || [];

    const normalized = matches
      .map((value) => this.resolveColorValue(value, variableMap))
      .filter((value): value is string => !!value);

    return [...new Set(normalized)];
  }

  private extractCssVariables(content: string): Record<string, string> {
    const map: Record<string, string> = {};
    const variableRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;

    for (const match of content.matchAll(variableRegex)) {
      const [, name, rawValue] = match;
      if (name && rawValue) {
        map[name] = rawValue.trim();
      }
    }

    return map;
  }

  private resolveColorValue(value: string, variableMap: Record<string, string>, depth = 0): string | null {
    const trimmed = value.trim();
    if (depth > 4) return null;

    if (trimmed.startsWith('var(')) {
      const varMatch = trimmed.match(/^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/);
      if (!varMatch) return null;
      const variableValue = variableMap[varMatch[1]];
      if (variableValue) {
        return this.resolveColorValue(variableValue, variableMap, depth + 1);
      }
      if (varMatch[2]) {
        return this.resolveColorValue(varMatch[2], variableMap, depth + 1);
      }
      return null;
    }

    const parsed = parse(trimmed);
    if (!parsed) return null;
    return formatCss(parsed);
  }

  /**
   * Naive analysis of contrast for detected color pairs
   * In a real version, we'd look for background-color/color pairs.
   * Here we just check common pairings if provided.
   */
  async analyzeContrast(colors: string[]): Promise<StyleReport['vulnerabilities']> {
    const lowContrast: StyleReport['vulnerabilities']['lowContrast'] = [];
    
    // Check if black or white are in the list, and compare with everything
    const critical = ['#ffffff', '#000000', '#f8fafc', '#0f172a'];
    
    for (const c of colors) {
      for (const crit of critical) {
        const ratio = this.colorEngine.getContrast(c, crit);
        if (ratio < 4.5 && ratio > 1) {
          lowContrast.push({ pair: [c, crit], ratio });
        }
      }
    }

    return { lowContrast };
  }
}
