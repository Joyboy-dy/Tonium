import path from 'node:path';
import type { Command } from 'commander';

import { buildAgentsFileContent, readAgentsFile, updateAgentsFile } from '../../core/agents/manage.js';
import type { AgentsOptions } from '../../types/index.js';
import { writeFileSafe } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { buildNextActionCommand, confirmWrite, loadProjectCss, printNextAction } from '../shared.js';

export function registerAgentsCommand(program: Command): void {
  program
    .command('agents')
    .description('Create or update the Tonium managed section in AGENTS.md.')
    .option('--apply', 'write AGENTS.md')
    .option('-y, --yes', 'skip confirmation prompts')
    .action(async (options: AgentsOptions) => {
      try {
        const { project } = await loadProjectCss();
        const agents = options.apply
          ? await updateAgentsFile(project.rootDir, project.appDir)
          : buildAgentsFileContent(await readAgentsFile(project.rootDir), project.appDir);
        const agentsPath = path.join(project.rootDir, 'AGENTS.md');

        logger.header(options.apply ? 'Agents Apply' : 'Agents Preview');
        console.log(agents.content);

        if (!options.apply) {
          logger.dim('Preview only. No files were changed.');
          printNextAction(buildNextActionCommand(
            'agents',
            [],
            options.yes ? ['--apply', '--yes'] : ['--apply'],
          ));
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
