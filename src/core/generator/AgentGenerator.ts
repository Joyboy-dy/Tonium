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
    const content = `# Système de Marque : ${config.brand.name}

## Identité
- **Nom** : ${config.brand.name}
- **Thème** : ${config.options.themeMode}

## Palette de Couleurs (Tokens)
- **Primaire** : ${config.brand.colors.primary}

## Signature Visuelle
Ce système privilégie la cohérence chromatique via OKLCH. Les agents doivent respecter les contrastes WCAG AA lors de la génération d'interfaces.
`;
    await fs.writeFile(path.join(this.cwd, this.baseDir, 'brand-system.md'), content);
  }

  private async generateDesignRules(config: ToniumConfig): Promise<void> {
    const content = `# Règles de Design (Tonium)

1. **Accessibilité** : Ne jamais utiliser de texte avec un ratio de contraste < 4.5:1 sur son arrière-plan.
2. **Couleurs** : Utiliser uniquement les variables CSS définies dans \`globals.css\`.
3. **Hiérarchie** : Respecter la rampe tonale générée pour les états (hover, active, disabled).
4. **Mode** : En mode ${config.options.themeMode}, s'assurer que les surfaces respectent la polarité choisie.
`;
    await fs.writeFile(path.join(this.cwd, this.baseDir, 'design-rules.md'), content);
  }
}
