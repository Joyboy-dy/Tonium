import fs from 'fs-extra';
import path from 'node:path';

/**
 * Read a file, returning null if it doesn't exist.
 */
export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Check if a file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the first existing path from a list of candidates.
 */
export async function resolveFirstExisting(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Write content to a file, ensuring the parent directory exists.
 */
export async function writeFileSafe(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Get a relative path from the current working directory.
 */
export function toRelative(absolutePath: string, rootDir?: string): string {
  return path.relative(rootDir ?? process.cwd(), absolutePath);
}
