import fs from 'fs-extra';
import path from 'node:path';

import type { ProjectInfo } from '../../types/index.js';
import { fileExists, readFileSafe, resolveFirstExisting } from '../../utils/fs.js';

/**
 * Next.js config file candidates (checked in order).
 */
const NEXT_CONFIG_FILES = [
  'next.config.js',
  'next.config.ts',
  'next.config.mjs',
] as const;

/**
 * Candidate paths for globals.css, ordered by priority.
 * The first match wins and also determines `usesSrcDir`.
 */
const GLOBALS_CSS_CANDIDATES = [
  'app/globals.css',
  'src/app/globals.css',
] as const;

/**
 * Detect the user's project setup.
 *
 * Inspects the filesystem and `package.json` to determine:
 * - whether this is a Next.js project
 * - whether Tailwind CSS v4+ is installed
 * - whether shadcn/ui is configured
 * - the resolved path to `globals.css`
 * - whether the project uses a `src/` directory layout
 *
 * @param rootDir - Project root (defaults to `process.cwd()`).
 * @returns A `ProjectInfo` descriptor.
 */
export async function detectProject(rootDir?: string): Promise<ProjectInfo> {
  const root = rootDir ?? process.cwd();

  // ── Read package.json ────────────────────────────────────────────
  const pkgPath = path.join(root, 'package.json');
  const pkgJson = await readPackageJson(pkgPath);

  // ── Next.js detection ────────────────────────────────────────────
  const isNextJs = await detectNextJs(root, pkgJson);

  // ── globals.css resolution ───────────────────────────────────────
  const absoluteCandidates = GLOBALS_CSS_CANDIDATES.map((c) => path.join(root, c));
  const globalsCssPath = await resolveFirstExisting(absoluteCandidates);

  const usesSrcDir = globalsCssPath !== null
    ? globalsCssPath.includes(`${path.sep}src${path.sep}`)
    : false;

  const appDir = usesSrcDir ? 'src/app' : 'app';

  // ── Read globals.css content for further detection ───────────────
  const globalsCssContent = globalsCssPath
    ? await readFileSafe(globalsCssPath)
    : null;

  // ── Tailwind v4 detection ────────────────────────────────────────
  const isTailwindV4 = detectTailwindV4(pkgJson, globalsCssContent);

  // ── shadcn/ui detection ──────────────────────────────────────────
  const isShadcnUi = await detectShadcnUi(root, globalsCssContent);

  return {
    isNextJs,
    isTailwindV4,
    isShadcnUi,
    globalsCssPath,
    usesSrcDir,
    appDir,
    rootDir: root,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────

/**
 * Minimal shape of the fields we inspect in `package.json`.
 */
interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Read and parse `package.json`, returning an empty object on failure.
 */
async function readPackageJson(pkgPath: string): Promise<PackageJson> {
  try {
    const raw = await fs.readFile(pkgPath, 'utf-8');
    return JSON.parse(raw.replace(/^\uFEFF/, '')) as PackageJson;
  } catch {
    return {};
  }
}

/**
 * Detect Next.js by config files or `package.json` dependency.
 */
async function detectNextJs(root: string, pkg: PackageJson): Promise<boolean> {
  // Check config files
  for (const configFile of NEXT_CONFIG_FILES) {
    if (await fileExists(path.join(root, configFile))) {
      return true;
    }
  }

  // Check package.json dependencies
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return 'next' in allDeps;
}

/**
 * Detect Tailwind CSS v4+.
 *
 * Two strategies:
 * 1. `tailwindcss` in package.json with a major version ≥ 4.
 * 2. `@import "tailwindcss"` directive found in globals.css.
 */
function detectTailwindV4(pkg: PackageJson, globalsCss: string | null): boolean {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const twVersion = allDeps['tailwindcss'];

  if (twVersion) {
    // Extract major version from semver-ish strings like "^4.0.0", "4.1.2", "~4.0"
    const majorMatch = twVersion.match(/(\d+)/);
    if (majorMatch && parseInt(majorMatch[1], 10) >= 4) {
      return true;
    }
  }

  // Fallback: check globals.css for the v4 import directive
  if (globalsCss && globalsCss.includes('@import "tailwindcss"')) {
    return true;
  }

  return false;
}

/**
 * Detect shadcn/ui by `components.json` or the Tailwind v4 import directive.
 */
async function detectShadcnUi(root: string, globalsCss: string | null): Promise<boolean> {
  // Check for components.json (shadcn/ui config)
  if (await fileExists(path.join(root, 'components.json'))) {
    return true;
  }

  // Check globals.css for the shadcn Tailwind v4 import
  if (globalsCss && globalsCss.includes('@import "shadcn/tailwind.css"')) {
    return true;
  }

  return false;
}
