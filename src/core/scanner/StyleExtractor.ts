import fs from 'fs-extra';
import { ColorEngine } from '../color/ColorEngine.js';

export interface StyleReport {
  colors: string[];
  vulnerabilities: {
    lowContrast: Array<{ pair: [string, string]; ratio: number }>;
  };
}

export class StyleExtractor {
  private colorEngine = new ColorEngine();

  /**
   * Extract hex colors from a CSS file string
   */
  async extractColors(cssPath: string): Promise<string[]> {
    if (!(await fs.pathExists(cssPath))) return [];
    const content = await fs.readFile(cssPath, 'utf-8');
    
    // Naive regex for hex colors
    const hexRegex = /#([A-Fa-f0-9]{3,8})\b/g;
    const matches = content.match(hexRegex) || [];
    
    return [...new Set(matches)]; // Unique colors
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
