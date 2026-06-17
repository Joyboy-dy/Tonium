import type { Command } from 'commander';

import {
  buildAuditReport,
  buildNextActionCommand,
  loadProjectCss,
  printAuditReport,
  printNextAction,
} from '../shared.js';
import type { AuditOptions } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export function registerAuditCommand(program: Command): void {
  program
    .command('audit')
    .description('Audit project setup, globals.css tokens, contrast pairs, and custom CSS intruders.')
    .option('--json', 'print the audit report as JSON')
    .option('--strict', 'exit with code 1 when warnings or issues are found')
    .action(async (options: AuditOptions) => {
      try {
        const { project, css } = await loadProjectCss();
        const report = buildAuditReport(project, css);

        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          printAuditReport(report);
          if (report.intruders.length > 0) {
            printNextAction(buildNextActionCommand('clean', [], ['--preview']));
          }
        }

        if (options.strict && report.score !== 'healthy') {
          process.exitCode = 1;
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      }
    });
}
