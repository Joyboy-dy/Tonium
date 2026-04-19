#!/usr/bin/env node
import { Command } from 'commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { initCommand } from '../cli/init.js';
import { auditCommand } from '../cli/audit.js';
import { applyCommand } from '../cli/apply.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = fs.readJsonSync(path.join(__dirname, '../../package.json'));
const version = pkg.version;

const program = new Command();

program
  .name('tonium')
  .description('Moteur de cohérence visuelle pour projets Next.js, Tailwind et shadcn/ui')
  .version(version);

program
  .command('init')
  .description('Initialise Tonium dans le projet')
  .action(async () => {
    await initCommand();
  });

program
  .command('audit')
  .description('Analyse les fondations visuelles existantes')
  .action(async () => {
    await auditCommand();
  });

program
  .command('apply')
  .description('Génère et applique les tokens de design')
  .action(async () => {
    await applyCommand();
  });

program.parse();
