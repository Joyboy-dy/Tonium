import { Command } from 'commander';

import { registerAgentsCommand } from './commands/agents.js';
import { registerAuditCommand } from './commands/audit.js';
import { registerCleanCommand } from './commands/clean.js';
import { registerThemeCommand } from './commands/theme.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('tonium')
    .description('Safe color-theme assistant for Next.js, Tailwind CSS v4, and shadcn/ui.')
    .version('2.0.1');

  registerAuditCommand(program);
  registerThemeCommand(program);
  registerCleanCommand(program);
  registerAgentsCommand(program);

  return program;
}
