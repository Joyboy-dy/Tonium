import fs from 'fs-extra';
import path from 'path';

export interface DetectedFonts {
  heading?: string;
  body?: string;
  mono?: string;
  headingVariable?: string;
  bodyVariable?: string;
  monoVariable?: string;
}

export interface ProjectInfo {
  name: string;
  version: string;
  isNextJs: boolean;
  isTailwind: boolean;
  isShadcn: boolean;
  appDir: boolean;
  globalCssPath?: string;
  configTailwindPath?: string;
  layoutPath?: string;
  hasAgentsMd: boolean;
  detectedFonts: DetectedFonts;
}

export class Scanner {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = path.resolve(cwd);
  }

  async scan(): Promise<ProjectInfo> {
    const pkgPath = path.join(this.cwd, 'package.json');
    if (!(await fs.pathExists(pkgPath))) {
      throw new Error(`package.json not found in ${this.cwd}. Are you in a Node.js project?`);
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
      hasAgentsMd: false,
      detectedFonts: {},
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

    // Detect Layout file
    const possibleLayoutPaths = [
      'app/layout.tsx',
      'src/app/layout.tsx',
    ];
    for (const layoutPath of possibleLayoutPaths) {
      const p = path.join(this.cwd, layoutPath);
      if (await fs.pathExists(p)) {
        projectInfo.layoutPath = p;
        break;
      }
    }

    // Detect AGENTS.md
    projectInfo.hasAgentsMd = await fs.pathExists(path.join(this.cwd, 'AGENTS.md'));

    // Detect existing fonts from layout.tsx and globals.css
    if (projectInfo.layoutPath) {
      projectInfo.detectedFonts = await this.detectFonts(projectInfo.layoutPath, projectInfo.globalCssPath);
    }

    return projectInfo;
  }

  private async detectFonts(layoutPath: string, globalCssPath?: string): Promise<DetectedFonts> {
    const detected: DetectedFonts = {};

    // Parse layout.tsx for next/font/google imports
    if (await fs.pathExists(layoutPath)) {
      const layoutContent = await fs.readFile(layoutPath, 'utf-8');

      // Detect next/font/google imports like: import { Epilogue } from 'next/font/google'
      const fontImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"]next\/font\/google['"]/g;
      const matches = [...layoutContent.matchAll(fontImportRegex)];

      for (const match of matches) {
        const fontNames = match[1].split(',').map((f: string) => f.trim());
        for (const fontName of fontNames) {
          // Try to infer role from variable assignment
          const varRegex = new RegExp(`const\\s+(\\w+)\\s*=\\s*${fontName}`, 'g');
          const varMatches = [...layoutContent.matchAll(varRegex)];
          
          for (const varMatch of varMatches) {
            const varName = varMatch[1];
            if (!varName) continue;
            
            // Common naming patterns
            if (varName.toLowerCase().includes('heading') || fontName.toLowerCase().includes('epilogue')) {
              detected.heading = fontName;
              detected.headingVariable = `--font-${varName.toLowerCase()}`;
            } else if (varName.toLowerCase().includes('body') || fontName.toLowerCase().includes('sans')) {
              detected.body = fontName;
              detected.bodyVariable = `--font-${varName.toLowerCase()}`;
            } else if (varName.toLowerCase().includes('mono') || fontName.toLowerCase().includes('code')) {
              detected.mono = fontName;
              detected.monoVariable = `--font-${varName.toLowerCase()}`;
            }
          }
        }
      }
    }

    // Parse globals.css for CSS font variables
    if (globalCssPath && await fs.pathExists(globalCssPath)) {
      const cssContent = await fs.readFile(globalCssPath, 'utf-8');

      // Detect CSS variables like: --font-sans: var(--font-dm-sans)
      const fontVarRegex = /--font-(\w+):\s*var\(--font-([^)]+)\)/g;
      const matches = [...cssContent.matchAll(fontVarRegex)];

      for (const match of matches) {
        const role = match[1]; // sans, heading, body, mono
        const varName = match[2]; // dm-sans, epilogue, etc.

        if (role === 'heading' || role === 'h') {
          detected.headingVariable = `--font-${varName}`;
        } else if (role === 'body' || role === 'sans') {
          detected.bodyVariable = `--font-${varName}`;
        } else if (role === 'mono') {
          detected.monoVariable = `--font-${varName}`;
        }
      }
    }

    return detected;
  }
}
