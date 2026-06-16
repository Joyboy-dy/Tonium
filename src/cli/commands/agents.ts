import path from 'node:path';
import type { Command } from 'commander';

import { updateAgentsFile } from '../../core/agents/manage.js';
import type { AgentsOptions } from '../../types/index.js';
import { writeFileSafe } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { confirmWrite, loadProjectCss } from '../shared.js';

export function registerAgentsCommand(program: Command): void {
  program
    .command('agents')
    .description('Create or update the Tonium managed section in AGENTS.md.')
    .option('--apply', 'write AGENTS.md')
    .option('-y, --yes', 'skip confirmation prompts')
    .action(async (options: AgentsOptions) => {
      try {
        const { project } = await loadProjectCss();
        const agents = await updateAgentsFile(project.rootDir, project.appDir);
        const agentsPath = path.join(project.rootDir, 'AGENTS.md');

        logger.header('AGENTS.md Preview');
        console.log(agents.content);

        if (!options.apply) {
          logger.dim('Preview only. Re-run with --apply to write AGENTS.md.');
          return;
        }

        const ok = await confirmWrite('Write Tonium rules to AGENTS.md?', options.yes);
        if (!ok) {
          logger.warn('AGENTS.md update cancelled.');
          return;
        }

        await writeFileSafe(agentsPath, agents.content);
        logger.success(agents.isNew ? 'AGENTS.md created.' : 'AGENTS.md updated.');
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
