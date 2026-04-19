import chalk from 'chalk';

export const logger = {
  info: (message: string) => console.log(chalk.blue('ℹ ') + message),
  success: (message: string) => console.log(chalk.green('✔ ') + message),
  warn: (message: string) => console.log(chalk.yellow('⚠ ') + message),
  error: (message: string | Error) => {
    const msg = message instanceof Error ? message.message : message;
    console.error(chalk.red('✖ ') + msg);
  },
  bold: (message: string) => console.log(chalk.bold(message)),
  dim: (message: string) => console.log(chalk.dim(message)),
};
