import fs from 'fs-extra';
import path from 'path';
import { ProjectInfo } from '../scanner/Scanner.js';

export interface ToniumConfig {
  project: ProjectInfo;
  brand: {
    name: string;
    personality: string[];
    colors: {
      primary: string;
      secondary?: string;
      accent?: string;
    };
  };
  options: {
    themeMode: 'light' | 'dark' | 'hybrid';
    iaEnabled: boolean;
    openRouterKey?: string;
  };
}

export class ConfigManager {
  private configDir = '.tonium';
  private configFile = 'config.json';
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  async initDirs(): Promise<void> {
    await fs.ensureDir(path.join(this.cwd, this.configDir));
    await fs.ensureDir(path.join(this.cwd, '.agents/tonium'));
    await fs.ensureDir(path.join(this.cwd, this.configDir, 'tokens'));
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
