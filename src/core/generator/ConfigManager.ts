import fs from 'fs-extra';
import path from 'path';
import { ProjectInfo } from '../scanner/Scanner.js';

export interface ToniumConfig {
  version: string;
  locale: 'fr' | 'en';              // Langue du CLI (Human-facing)
  aiArtifactsLanguage: 'en';        // Langue forcée (AI-facing)
  projectType: string;
  features: {
    ai: boolean;
    mcp: boolean;
    skills: boolean;
    typography: boolean;
  };
  project: ProjectInfo;
  brand: {
    name: string;
    personality: string[];
    colors: {
      palette: string[];
      outputFormat: 'hex' | 'rgb' | 'hsl' | 'oklch';
      strictPalette: boolean;
    };
    typography?: {
      heading: string;
      body: string;
      mono?: string;
      keepExisting: boolean;
    };
  };
  options: {
    themeMode: 'light' | 'dark' | 'hybrid';
    openRouterKey?: string;
  };
}

export class ConfigManager {
  private configDir = '.tonium';
  private configFile = 'config.json';
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = path.resolve(cwd);
  }

  async initDirs(): Promise<void> {
    await fs.ensureDir(path.join(this.cwd, this.configDir));
    await fs.ensureDir(path.join(this.cwd, '.agents/tonium'));
    await fs.ensureDir(path.join(this.cwd, '.agents/skills'));
    await fs.ensureDir(path.join(this.cwd, this.configDir, 'tokens'));
    await fs.ensureDir(path.join(this.cwd, this.configDir, 'generated'));
    await fs.ensureDir(path.join(this.cwd, this.configDir, 'reports'));
    await fs.ensureDir(path.join(this.cwd, this.configDir, 'scan'));
  }

  async saveConfig(config: ToniumConfig): Promise<void> {
    const configPath = path.join(this.cwd, this.configDir, this.configFile);
    await fs.writeJson(configPath, config, { spaces: 2 });
  }

  async loadConfig(): Promise<ToniumConfig | null> {
    const configPath = path.join(this.cwd, this.configDir, this.configFile);
    if (!(await fs.pathExists(configPath))) return null;
    return await fs.readJson(configPath);
  }
}
