import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { classifyColors } from '../src/core/colors/classify.js';
import { contrastRatio } from '../src/core/colors/contrast.js';
import { parseColor, parseColors } from '../src/core/colors/parse.js';
import { mapPaletteToTheme } from '../src/core/theme/map.js';
import type { GeneratedTheme, TokenAssignment } from '../src/types/index.js';

interface Fixture {
  name: string;
  palette: string[];
  expectDefaultDestructive?: boolean;
}

const BRAND_TOKENS = [
  'primary',
  'secondary',
  'accent',
  'sidebar-primary',
  'sidebar-accent',
] as const;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.join(__dirname, '..', 'fixtures', 'theme-palettes.json');
const fixtures = JSON.parse(await fs.readFile(fixturesPath, 'utf-8')) as Fixture[];

for (const fixture of fixtures) {
  const theme = mapPaletteToTheme(classifyColors(parseColors(fixture.palette)), 'oklch');
  assertDarkBrandTokens(fixture, theme);
  assertDestructiveTokens(fixture, theme);
  assertSurfaceSeparation(fixture, theme);
}

console.log(`theme fixtures ok (${fixtures.length})`);

function assertDarkBrandTokens(fixture: Fixture, theme: GeneratedTheme): void {
  const darkTokens = new Map(theme.dark.tokens.map((assignment) => [assignment.token, assignment]));

  for (const token of BRAND_TOKENS) {
    const assignment = darkTokens.get(token);
    if (!assignment) {
      throw new Error(`${fixture.name}: missing dark --${token}`);
    }

    if (!['preserved', 'adjusted', 'generated', 'default'].includes(assignment.source)) {
      throw new Error(`${fixture.name}: dark --${token} has invalid source ${assignment.source}`);
    }

    if ((assignment.source === 'preserved' || assignment.source === 'adjusted') && colorLightness(assignment) < 0.35) {
      throw new Error(`${fixture.name}: dark --${token} is too dark (${assignment.value})`);
    }

    const foreground = darkTokens.get(`${token}-foreground` as TokenAssignment['token']);
    if (!foreground) {
      throw new Error(`${fixture.name}: missing dark --${token}-foreground`);
    }

    const bg = parseColor(assignment.value);
    const fg = parseColor(foreground.value);
    if (!bg || !fg) {
      throw new Error(`${fixture.name}: cannot parse dark --${token} pair`);
    }

    const ratio = contrastRatio(fg.oklch, bg.oklch);
    if (ratio < 4.5) {
      throw new Error(`${fixture.name}: dark --${token} foreground contrast ${ratio.toFixed(2)}:1`);
    }
  }
}

function colorLightness(assignment: TokenAssignment): number {
  const parsed = parseColor(assignment.value);
  if (!parsed) {
    throw new Error(`cannot parse ${assignment.token}: ${assignment.value}`);
  }
  return parsed.oklch.l;
}

function assertDestructiveTokens(fixture: Fixture, theme: GeneratedTheme): void {
  for (const mode of [theme.light, theme.dark]) {
    const tokens = new Map(mode.tokens.map((assignment) => [assignment.token, assignment]));
    const destructive = tokens.get('destructive');
    const foreground = tokens.get('destructive-foreground');

    if (!destructive) {
      throw new Error(`${fixture.name}: missing ${mode.mode} --destructive`);
    }

    if (fixture.expectDefaultDestructive && destructive.source !== 'default') {
      throw new Error(`${fixture.name}: expected default ${mode.mode} --destructive, got ${destructive.source}`);
    }

    // Ensure destructive does not duplicate a brand token
    for (const brandToken of ['primary', 'secondary', 'accent'] as const) {
      const brand = tokens.get(brandToken);
      if (brand && brand.value === destructive.value) {
        throw new Error(
          `${fixture.name}: ${mode.mode} --destructive duplicates --${brandToken} (${destructive.value})`,
        );
      }
    }

    if (foreground) {
      const bg = parseColor(destructive.value);
      const fg = parseColor(foreground.value);
      if (!bg || !fg) {
        throw new Error(`${fixture.name}: cannot parse ${mode.mode} destructive pair`);
      }

      const ratio = contrastRatio(fg.oklch, bg.oklch);
      if (ratio < 4.495) {
        throw new Error(`${fixture.name}: ${mode.mode} destructive contrast ${ratio.toFixed(2)}:1`);
      }
    }
  }
}

function assertSurfaceSeparation(fixture: Fixture, theme: GeneratedTheme): void {
  for (const mode of [theme.light, theme.dark]) {
    const tokens = new Map(mode.tokens.map((assignment) => [assignment.token, assignment]));
    const background = parseRequiredSurface(fixture.name, mode.mode, 'background', tokens);
    const card = parseRequiredSurface(fixture.name, mode.mode, 'card', tokens);
    const popover = parseRequiredSurface(fixture.name, mode.mode, 'popover', tokens);
    const muted = parseRequiredSurface(fixture.name, mode.mode, 'muted', tokens);
    const border = parseRequiredSurface(fixture.name, mode.mode, 'border', tokens);
    const input = parseRequiredSurface(fixture.name, mode.mode, 'input', tokens);

    if (mode.mode === 'dark') {
      const sidebar = parseRequiredSurface(fixture.name, mode.mode, 'sidebar', tokens);
      for (const token of ['card', 'popover', 'sidebar'] as const) {
        if (tokens.get(token)?.value === tokens.get('background')?.value) {
          throw new Error(`${fixture.name}: dark --${token} equals --background`);
        }
      }

      if (card.l <= background.l || popover.l < card.l || sidebar.l <= background.l) {
        throw new Error(`${fixture.name}: dark surfaces do not form a visible hierarchy`);
      }
    }

    assertVisibleSurface(fixture.name, mode.mode, 'card', card, background, mode.mode === 'dark' ? 1.08 : 1.04);
    assertVisibleSurface(fixture.name, mode.mode, 'muted', muted, background, mode.mode === 'dark' ? 1.12 : 1.06);
    assertVisibleSurface(fixture.name, mode.mode, 'border', border, background, mode.mode === 'dark' ? 1.2 : 1.13);
    assertVisibleSurface(fixture.name, mode.mode, 'input', input, background, mode.mode === 'dark' ? 1.16 : 1.1);
  }
}

function parseRequiredSurface(
  fixtureName: string,
  mode: string,
  token: TokenAssignment['token'],
  tokens: Map<TokenAssignment['token'], TokenAssignment>,
) {
  const assignment = tokens.get(token);
  const parsed = assignment ? parseColor(assignment.value) : null;
  if (!assignment || !parsed) {
    throw new Error(`${fixtureName}: cannot parse ${mode} --${token}`);
  }

  return parsed.oklch;
}

function assertVisibleSurface(
  fixtureName: string,
  mode: string,
  token: TokenAssignment['token'],
  color: ReturnType<typeof parseRequiredSurface>,
  background: ReturnType<typeof parseRequiredSurface>,
  minRatio: number,
): void {
  const ratio = contrastRatio(color, background);
  if (ratio < minRatio) {
    throw new Error(`${fixtureName}: ${mode} --${token} separation ${ratio.toFixed(2)}:1`);
  }
}
