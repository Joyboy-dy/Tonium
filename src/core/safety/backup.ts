import fs from 'fs-extra';
import path from 'node:path';

import { fileExists } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';

/**
 * Default backup suffix appended to the original filename.
 */
const BACKUP_SUFFIX = '.tonium-backup';

/**
 * Glob-style pattern used to detect any existing tonium backup for a file.
 */
const BACKUP_PATTERN = '.tonium-backup';

/**
 * Create a backup of the given file.
 *
 * Naming strategy:
 * - First backup  → `<filename>.tonium-backup`
 * - Subsequent    → `<filename>.tonium-backup-<timestamp>`
 *
 * An existing backup is **never** overwritten.
 *
 * @param filePath - Absolute path to the file to back up.
 * @returns The absolute path of the newly created backup file.
 * @throws If the source file does not exist or the copy fails.
 */
export async function createBackup(filePath: string): Promise<string> {
  const exists = await fileExists(filePath);
  if (!exists) {
    throw new Error(`Cannot back up "${filePath}" — file does not exist.`);
  }

  // Try the clean backup name first
  let backupPath = `${filePath}${BACKUP_SUFFIX}`;

  if (await fileExists(backupPath)) {
    // A backup already exists — append a timestamp to guarantee uniqueness
    backupPath = `${filePath}${BACKUP_SUFFIX}-${Date.now()}`;
  }

  await fs.copy(filePath, backupPath, { overwrite: false });

  const relativePath = path.relative(process.cwd(), backupPath);
  logger.success(`Backup created → ${logger.filePath(relativePath)}`);

  return backupPath;
}

/**
 * Check whether at least one tonium backup exists for the given file.
 *
 * Looks for any sibling file whose name starts with the original filename
 * followed by the `.tonium-backup` suffix.
 *
 * @param filePath - Absolute path to the original file.
 * @returns `true` if one or more backups exist.
 */
export async function hasBackup(filePath: string): Promise<boolean> {
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath);

  try {
    const entries = await fs.readdir(dir);
    return entries.some((entry) => entry.startsWith(`${baseName}${BACKUP_PATTERN}`));
  } catch {
    // Directory doesn't exist or is unreadable — no backup possible
    return false;
  }
}
