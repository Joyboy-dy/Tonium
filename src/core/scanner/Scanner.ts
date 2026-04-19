import fs from 'fs-extra';
import path from 'path';

export interface ProjectInfo {
  name: string;
  version: string;
  isNextJs: boolean;
  isTailwind: boolean;
  isShadcn: boolean;
  appDir: boolean;
  globalCssPath?: string;
  configTailwindPath?: string;
}

export class Scanner {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  async scan(): Promise<ProjectInfo> {
    const pkgPath = path.join(this.cwd, 'package.json');
    if (!(await fs.pathExists(pkgPath))) {
      throw new Error('package.json not found. Are you in a Node.js project?');
    }

    const pkg = await fs.readJson(pkgPath);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const isNextJs = !!deps['next'];
    const isTailwind = !!deps['tailwindcss'];
    const isShadcn = await fs.pathExists(path.join(this.cwd, 'components.json'));
    const isAppDir = await fs.pathExists(path.join(this.cwd, 'app'));

    const projectInfo: ProjectInfo = {
      name: pkg.name || 'unknown',
      version: pkg.version || '0.0.0',
      isNextJs,
      isTailwind,
      isShadcn,
      appDir: isAppDir,
    };

    // Detect Tailwind Config
    const twConfigs = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.cjs'];
    for (const config of twConfigs) {
      const p = path.join(this.cwd, config);
      if (await fs.pathExists(p)) {
        projectInfo.configTailwindPath = p;
        break;
      }
    }

    // Detect Global CSS (Naive search)
    const possibleCssPaths = [
      'app/globals.css',
      'src/app/globals.css',
      'styles/globals.css',
      'src/styles/globals.css',
      'src/index.css',
    ];
    for (const cssPath of possibleCssPaths) {
      const p = path.join(this.cwd, cssPath);
      if (await fs.pathExists(p)) {
        projectInfo.globalCssPath = p;
        break;
      }
    }

    return projectInfo;
  }
}
