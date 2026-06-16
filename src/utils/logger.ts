import chalk from 'chalk';

const PREFIX = chalk.bold.hex('#a855f7')('tonium');

export const logger = {
  info(msg: string): void {
    console.log(`${PREFIX} ${chalk.blue('ℹ')} ${msg}`);
  },

  success(msg: string): void {
    console.log(`${PREFIX} ${chalk.green('✓')} ${msg}`);
  },

  warn(msg: string): void {
    console.log(`${PREFIX} ${chalk.yellow('⚠')} ${chalk.yellow(msg)}`);
  },

  error(msg: string): void {
    console.error(`${PREFIX} ${chalk.red('✗')} ${chalk.red(msg)}`);
  },

  dim(msg: string): void {
    console.log(`${PREFIX}   ${chalk.dim(msg)}`);
  },

  header(msg: string): void {
    console.log();
    console.log(`${PREFIX} ${chalk.bold.white(msg)}`);
    console.log(`${PREFIX} ${chalk.dim('─'.repeat(Math.min(msg.length, 60)))}`);
  },

  table(rows: [string, string][]): void {
    const maxKey = Math.max(...rows.map(([k]) => k.length));
    for (const [key, value] of rows) {
      console.log(`${PREFIX}   ${chalk.dim(key.padEnd(maxKey))}  ${value}`);
    }
  },

  blank(): void {
    console.log();
  },

  /** Format a contrast ratio with pass/fail indicator */
  contrast(ratio: number, threshold: number): string {
    const formatted = ratio.toFixed(2);
    if (ratio >= threshold) {
      return chalk.green(`${formatted}:1 ✓`);
    }
    return chalk.red(`${formatted}:1 ✗`);
  },

  /** Format a token name */
  token(name: string): string {
    return chalk.cyan(`--${name}`);
  },

  /** Format a color value */
  colorValue(value: string): string {
    return chalk.hex('#facc15')(value);
  },

  /** Format a file path */
  filePath(path: string): string {
    return chalk.underline.dim(path);
  },
};
