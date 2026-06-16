import type { Command } from 'commander';

import { createBackup } from '../../core/safety/backup.js';
import { classifyColors } from '../../core/colors/classify.js';
import { parseColors } from '../../core/colors/parse.js';
import { applyTokenChanges } from '../../core/css/write.js';
import { mapPaletteToTheme } from '../../core/theme/map.js';
import { updateAgentsFile } from '../../core/agents/manage.js';
import type { ThemeOptions } from '../../types/index.js';
import { writeFileSafe } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import {
  confirmWrite,
  ensureTokenDeclarations,
  loadProjectCss,
  printThemePreview,
  themeToChangeMaps,
  validateOutputFormat,
} from '../shared.js';

interface ThemeCommandOptions extends Omit<ThemeOptions, 'palette' | 'format'> {
  palette?: string[];
  format?: string;
}

export function registerThemeCommand(program: Command): void {
  program
    .command('theme')
    .description('Generate a shadcn/ui theme from a color palette and optionally apply it to globals.css.')
    .argument('[colors...]', 'palette colors, for example "#2563eb" "oklch(0.7 0.2 250)"')
    .option('-p, --palette <colors...>', 'palette colors; can be used instead of positional colors')
    .option('-f, --format <format>', 'output format: oklch, hex, rgb, hsl, or input', 'oklch')
    .option('--preview', 'show the generated theme without writing')
    .option('--apply', 'write generated tokens to globals.css')
    .option('--update-agents', 'update AGENTS.md after theme generation')
    .option('--no-update-agents', 'skip AGENTS.md update')
    .option('-y, --yes', 'skip confirmation prompts')
    .action(async (colors: string[], options: ThemeCommandOptions) => {
      try {
        const palette = options.palette?.length ? options.palette : colors;
        if (!palette.length) {
          throw new Error('Provide at least one palette color.');
        }

        const format = validateOutputFormat(options.format ?? 'oklch');
        const parsed = parseColors(palette);
        if (!parsed.length) {
          throw new Error('No valid palette colors were provided.');
        }

        const { project } = await loadProjectCss();
        const theme = mapPaletteToTheme(classifyColors(parsed), format);
        printThemePreview(theme);

        if (!options.apply) {
          logger.dim('Preview only. Re-run with --apply to write globals.css.');
          return;
        }

        const ok = await confirmWrite('Apply generated theme to globals.css?', options.yes);
        if (!ok) {
          logger.warn('Theme apply cancelled.');
          return;
        }

        const { rootChanges, darkChanges } = themeToChangeMaps(theme);
        await createBackup(project.globalsCssPath);
        const changedCss = await applyTokenChanges(project.globalsCssPath, rootChanges, darkChanges);
        const nextCss = ensureTokenDeclarations(changedCss, rootChanges, darkChanges);
        await writeFileSafe(project.globalsCssPath, nextCss);
        logger.success(`Theme applied to ${logger.filePath(project.globalsCssPath)}`);

        if (options.updateAgents !== false) {
          const agents = await updateAgentsFile(project.rootDir, project.appDir);
          await writeFileSafe(`${project.rootDir}/AGENTS.md`, agents.content);
          logger.success(agents.isNew ? 'AGENTS.md created.' : 'AGENTS.md updated.');
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
