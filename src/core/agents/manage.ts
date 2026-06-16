import path from 'node:path';

import { fileExists, readFileSafe, writeFileSafe } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';

/**
 * Section markers used to delimit tonium's managed block inside AGENTS.md.
 */
const BEGIN_MARKER = '<!-- BEGIN:tonium-agent-rules -->';
const END_MARKER = '<!-- END:tonium-agent-rules -->';

/**
 * Read the AGENTS.md file from the project root.
 *
 * @param rootDir - Absolute path to the project root.
 * @returns The file content, or `null` if the file does not exist.
 */
export async function readAgentsFile(rootDir: string): Promise<string | null> {
  const agentsPath = path.join(rootDir, 'AGENTS.md');
  return readFileSafe(agentsPath);
}

/**
 * Generate the updated content for AGENTS.md.
 *
 * Behaviour:
 * - If AGENTS.md exists and contains the tonium section markers,
 *   **only the content between the markers** is replaced.
 * - If AGENTS.md exists but has no tonium section, the section is
 *   **appended** at the end.
 * - If AGENTS.md does not exist, a new file is created with just
 *   the tonium section.
 *
 * Content outside the tonium markers is **never** altered or removed.
 *
 * @param rootDir - Absolute path to the project root.
 * @param appDir  - Relative app directory (`"app"` or `"src/app"`).
 * @returns The final content and whether the file is newly created.
 */
export async function updateAgentsFile(
  rootDir: string,
  appDir: string,
): Promise<{ content: string; isNew: boolean }> {
  const agentsPath = path.join(rootDir, 'AGENTS.md');
  const rulesBlock = getAgentRulesContent(appDir);

  const existing = await readFileSafe(agentsPath);

  // ── AGENTS.md does not exist → create from scratch ───────────────
  if (existing === null) {
    logger.info('AGENTS.md not found — creating a new file.');
    return { content: rulesBlock, isNew: true };
  }

  // ── Section markers already present → replace in-place ───────────
  const beginIdx = existing.indexOf(BEGIN_MARKER);
  const endIdx = existing.indexOf(END_MARKER);

  if (beginIdx !== -1 && endIdx !== -1) {
    const before = existing.slice(0, beginIdx);
    const after = existing.slice(endIdx + END_MARKER.length);

    const content = `${before}${rulesBlock}${after}`;
    logger.info('Tonium section in AGENTS.md updated.');
    return { content, isNew: false };
  }

  // ── No markers found → append the section ────────────────────────
  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  const content = `${existing}${separator}${rulesBlock}\n`;
  logger.info('Tonium section appended to AGENTS.md.');
  return { content, isNew: false };
}

/**
 * Return the tonium agent-rules block with the correct `appDir` interpolated.
 *
 * @param appDir - Relative app directory (`"app"` or `"src/app"`).
 * @returns The full rules block including section markers.
 */
export function getAgentRulesContent(appDir: string): string {
  return `${BEGIN_MARKER}
# Tonium Design System Guidelines

This project uses shadcn/ui, Tailwind CSS and semantic CSS tokens in ${appDir}/globals.css.

Use semantic tokens such as background, foreground, primary, secondary, muted, accent, destructive, border, input and ring. Do not create physical color tokens like blue, green or brand-purple for core UI styling.

Use colors by role:
- background/foreground: page base and text
- card/card-foreground: cards and panels
- popover/popover-foreground: floating UI
- primary/primary-foreground: main actions
- secondary/secondary-foreground: secondary actions
- muted/muted-foreground: subtle UI and metadata
- accent/accent-foreground: hover and emphasis
- destructive/destructive-foreground: dangerous actions
- border/input/ring: structure, forms and focus states

Reusable visual changes belong in local shadcn/ui component variants, usually via cva. Avoid heavy external className overrides. Custom CSS may exist in ${appDir}/styles/customs.css; inspect before removing it.

Decision order:
1. global theme token
2. component variant
3. reusable internal wrapper
4. one-off className override
${END_MARKER}`;
}
