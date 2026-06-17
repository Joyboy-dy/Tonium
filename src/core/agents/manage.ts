import path from 'node:path';

import { readFileSafe } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';

const BEGIN_MARKER = '<!-- BEGIN:tonium-agent-rules -->';
const END_MARKER = '<!-- END:tonium-agent-rules -->';

export async function readAgentsFile(rootDir: string): Promise<string | null> {
  return readFileSafe(path.join(rootDir, 'AGENTS.md'));
}

export async function updateAgentsFile(
  rootDir: string,
  appDir: string,
): Promise<{ content: string; isNew: boolean }> {
  const existing = await readAgentsFile(rootDir);
  const result = buildAgentsFileContent(existing, appDir);

  if (result.isNew) {
    logger.info('AGENTS.md not found - creating a new file.');
  } else if (existing?.includes(BEGIN_MARKER) && existing.includes(END_MARKER)) {
    logger.info('Tonium section in AGENTS.md updated.');
  } else {
    logger.info('Tonium section appended to AGENTS.md.');
  }

  return result;
}

export function buildAgentsFileContent(
  existing: string | null,
  appDir: string,
): { content: string; isNew: boolean } {
  const rulesBlock = getAgentRulesContent(appDir);

  if (existing === null) {
    return { content: rulesBlock, isNew: true };
  }

  const beginIdx = existing.indexOf(BEGIN_MARKER);
  const endIdx = existing.indexOf(END_MARKER);

  if (beginIdx !== -1 && endIdx !== -1) {
    const before = existing.slice(0, beginIdx);
    const after = existing.slice(endIdx + END_MARKER.length);
    return { content: `${before}${rulesBlock}${after}`, isNew: false };
  }

  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  return { content: `${existing}${separator}${rulesBlock}\n`, isNew: false };
}

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
