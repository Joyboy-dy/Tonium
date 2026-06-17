# Tonium v2

Tonium is a safe color-theme CLI for Next.js projects using Tailwind CSS v4 and shadcn/ui.

It audits `globals.css`, generates semantic light and dark theme tokens from a palette, preserves the shadcn/ui structure, checks contrast, separates visual surfaces, moves custom CSS out of the theme file, and can maintain Tonium rules in `AGENTS.md`.

## Features

- Audit Next.js, Tailwind CSS v4 and shadcn/ui setup.
- Detect `app/globals.css` or `src/app/globals.css`.
- Check required, optional and legacy shadcn/ui tokens.
- Generate semantic light and dark theme tokens from a palette.
- Preserve the theme file structure instead of rewriting the full CSS file.
- Validate core WCAG contrast pairs.
- Keep readable brand colors in dark mode when possible.
- Separate `background`, `card`, `popover`, `muted`, `border`, `input` and `sidebar` surfaces.
- Protect `destructive` from unsafe or duplicated semantic colors.
- Move custom top-level CSS blocks into `app/styles/customs.css` or `src/app/styles/customs.css`.
- Add or update a Tonium managed section in `AGENTS.md`.
- Create a `.tonium-backup` copy before writing to `globals.css`.

## Installation

```bash
npm install -D tonium
npx tonium@latest --help
pnpm dlx tonium@latest --help
```

## Quick usage

```bash
tonium audit
tonium theme "#2563eb" "#f97316" "#111827" --preview
tonium theme "#2563eb" "#f97316" "#111827" --apply
tonium clean --preview
tonium clean --apply
tonium agents
tonium agents --apply
```

## Commands

### `tonium audit`

Checks framework setup, the theme file location, missing shadcn/ui tokens, optional or legacy token names, WCAG contrast issues and custom CSS mixed into `globals.css`.

```bash
tonium audit --json
tonium audit --strict
```

Recent shadcn/ui presets use `--sidebar` as the required sidebar token. `--destructive-foreground` is optional. Legacy `--sidebar-background` is accepted but not required. When actionable issues are found, Tonium prints a `Next Action`.

### `tonium theme`

Generates a complete light and dark shadcn/ui theme from palette colors.

```bash
tonium theme "#2563eb" "#f97316" "#111827" --preview
tonium theme "#2563eb" "#f97316" "#111827" --apply
tonium theme "#2563eb" "#f97316" "#111827" --format oklch --preview
tonium theme "#2563eb" "#f97316" "#111827" --format hex --preview
tonium theme "#2563eb" "#f97316" "#111827" --apply --yes
tonium theme "#2563eb" "#f97316" "#111827" --apply --update-agents
```

Options: `--format <oklch|hex|rgb|hsl|input>`, `--preview`, `--apply`, `--yes`, `--update-agents`, `--no-update-agents`.

Before writing, Tonium creates a `.tonium-backup` copy of `globals.css`.

### Theme behavior

Tonium maps palette colors to semantic shadcn/ui roles:

```text
background, foreground, card, card-foreground, popover, popover-foreground
primary, primary-foreground, secondary, secondary-foreground
muted, muted-foreground, accent, accent-foreground
destructive, destructive-foreground, border, input, ring
sidebar, sidebar-primary, sidebar-accent, chart-1 to chart-5
```

Tonium does not try to use every palette color. It selects semantic roles, preserves shadcn/ui defaults when they are better, and generates missing values only when needed.

In dark mode, brand colors are preserved when they pass contrast checks and adjusted only when needed. Dark surfaces are separated so cards, popovers, muted areas, borders, inputs and sidebars remain distinct from the page background.

The `destructive` token must remain a danger color, cannot duplicate `primary`, `secondary` or `accent`, and cannot automatically use pastel, blue, green, cyan or violet colors. If no distinct danger color is available, Tonium keeps the shadcn/ui default. `destructive-foreground` is generated or corrected when present.

### `tonium clean`

Moves non-standard top-level CSS blocks out of `globals.css` into `app/styles/customs.css` or `src/app/styles/customs.css`.

When needed, Tonium inserts:

```css
@import "./styles/customs.css";
```

```bash
tonium clean --preview
tonium clean --apply
tonium clean --apply --yes
```

### `tonium agents`

Creates or updates the Tonium managed section in `AGENTS.md`.

```bash
tonium agents
tonium agents --apply
```

Content outside these markers is preserved:

```html
<!-- BEGIN:tonium-agent-rules -->
<!-- END:tonium-agent-rules -->
```

## Public API

```ts
import { detectProject, parseCssFile, detectIntruders, parseColors, classifyColors, mapPaletteToTheme, createCli } from "tonium";
```

## Project layout

```text
src/
  bin/tonium.ts
  cli/{commands,index.ts,shared.ts}
  core/{agents,colors,css,project,safety,theme}/
  types/
  utils/
```

## Development

```bash
npm install
npm run build
npm run test:theme-fixtures
node dist/bin/tonium.js --help
```

Windows PowerShell fallback:

```bash
npm.cmd run build
npm.cmd run test:theme-fixtures
npm.cmd pack --dry-run
```

Package outputs: `dist/bin/tonium.js` for the CLI and `dist/index.js` for the library.

## Release notes

### 2.0.1

Tonium 2.0.1 improves safe theme generation, dark mode output and CLI consistency:

- Brand colors are preserved in dark mode when contrast allows it.
- Light and dark surfaces are separated to avoid visual collapse.
- `destructive` must remain a real danger color and cannot duplicate `primary`, `secondary` or `accent`.
- Preview commands display a clear `Next Action`.
- Apply commands print `Theme Apply`, `Clean Apply` or `Agents Apply`.
- `theme --apply --yes` updates `AGENTS.md` only with `--update-agents`.
- Fixtures cover pastel, neon, surface-depth and destructive-token edge cases.
