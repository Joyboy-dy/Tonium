export { createCli } from './cli/index.js';

export { readAgentsFile, updateAgentsFile, getAgentRulesContent } from './core/agents/manage.js';
export { adjustForContrast, generateForeground } from './core/colors/adjust.js';
export { classifyColor, classifyColors } from './core/colors/classify.js';
export { checkContrast, contrastRatio } from './core/colors/contrast.js';
export { formatColor, oklchToCss } from './core/colors/convert.js';
export { parseColor, parseColors } from './core/colors/parse.js';
export { detectIntruders } from './core/css/intruders.js';
export { parseCssContent, parseCssFile } from './core/css/parse.js';
export { applyTokenChanges, insertImportLine } from './core/css/write.js';
export { detectProject } from './core/project/detect.js';
export { createBackup, hasBackup } from './core/safety/backup.js';
export { LIGHT_DEFAULTS, DARK_DEFAULTS, isDefaultValue } from './core/theme/defaults.js';
export { mapPaletteToTheme } from './core/theme/map.js';
export {
  BRAND_TOKENS,
  INTERACTION_TOKENS,
  STATUS_TOKENS,
  SURFACE_TOKENS,
  TOKEN_PAIRS,
} from './core/theme/tokens.js';
export { ensureDir, fileExists, readFileSafe, resolveFirstExisting, toRelative, writeFileSafe } from './utils/fs.js';
export { logger } from './utils/logger.js';
export * from './types/index.js';
