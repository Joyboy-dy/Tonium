import type { Command } from 'commander';

import { createBackup } from '../../core/safety/backup.js';
import { detectIntruders } from '../../core/css/intruders.js';
import { insertImportLine } from '../../core/css/write.js';
import type { CleanOptions } from '../../types/index.js';
import { writeFileSafe } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import {
  appendCustomCss,
  buildNextActionCommand,
  confirmWrite,
  loadProjectCss,
  printNextAction,
  removeIntruderBlocks,
} from '../shared.js';

export function registerCleanCommand(program: Command): void {
  program
    .command('clean')
    .description('Move non-standard globals.css blocks into app/styles/customs.css.')
    .option('--preview', 'show what would be moved without writing')
    .option('--apply', 'write cleaned globals.css and customs.css')
    .option('-y, --yes', 'skip confirmation prompts')
    .action(async (options: CleanOptions) => {
      try {
        const { project, css } = await loadProjectCss();
        const result = detectIntruders(css);

        if (!result.isConfident) {
          throw new Error(result.ambiguityReason ?? 'CSS structure is ambiguous; clean cannot run safely.');
        }

        if (result.intruders.length === 0) {
          logger.success('No CSS intruders found.');
          return;
        }

        logger.header(options.apply ? 'Clean Apply' : 'Clean Preview');
        for (const intruder of result.intruders) {
          logger.warn(`${intruder.selector} lines ${intruder.startLine}-${intruder.endLine}`);
        }

        if (!options.apply) {
          logger.dim('Preview only. No files were changed.');
          printNextAction(buildNextActionCommand(
            'clean',
            [],
            options.yes ? ['--apply', '--yes'] : ['--apply'],
          ));
          return;
        }

        const ok = await confirmWrite('Move CSS intruders to styles/customs.css?', options.yes);
        if (!ok) {
          logger.warn('Clean cancelled.');
          return;
        }

        await createBackup(project.globalsCssPath);
        const customsPath = await appendCustomCss(project.appDir, project.rootDir, result.intruders);
        const withoutIntruders = removeIntruderBlocks(css.raw, result.intruders);
        const nextCss = insertImportLine(withoutIntruders, './styles/customs.css');
        await writeFileSafe(project.globalsCssPath, nextCss);

        logger.success(`Moved ${result.intruders.length} block(s) to ${logger.filePath(customsPath)}`);
        logger.success(`Updated ${logger.filePath(project.globalsCssPath)}`);
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
