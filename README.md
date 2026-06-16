# Tonium v2

Tonium is a safe color-theme CLI for Next.js projects using Tailwind CSS v4 and shadcn/ui.

It audits `globals.css`, generates semantic theme tokens from a palette, moves custom CSS out of the theme file, and maintains a Tonium section in `AGENTS.md`.

## Install

```bash
npm install -D tonium
```

For local development in this repository:

```bash
npm install
npm run build
node dist/bin/tonium.js --help
```

## CLI

```bash
tonium audit
tonium theme "#2563eb" "#f97316" "#111827" --apply
tonium clean --apply
tonium agents --apply
```

### `tonium audit`

Checks the current project for:

- Next.js, Tailwind CSS v4, and shadcn/ui detection
- `app/globals.css` or `src/app/globals.css`
- missing required structural shadcn/ui tokens
- WCAG contrast issues for core token pairs
- custom CSS blocks mixed into `globals.css`

The audit recognizes required, optional, and legacy token names separately. For recent shadcn/ui presets, `--sidebar` is required, `--destructive-foreground` is optional, and legacy `--sidebar-background` is accepted but not required.

Useful options:

```bash
tonium audit --json
tonium audit --strict
```

### `tonium theme`

Generates a complete light and dark shadcn/ui theme from palette colors.

```bash
tonium theme "#2563eb" "#f97316" "#111827" --format oklch --apply
```

Useful options:

- `--format <oklch|hex|rgb|hsl|input>` controls output values.
- `--apply` writes to `globals.css`; without it, Tonium previews only.
- `--yes` skips confirmation prompts.
- `--update-agents` updates `AGENTS.md` after applying the theme.
- `--no-update-agents` skips the `AGENTS.md` update.

Before writing, Tonium creates a `.tonium-backup` copy of `globals.css`.

### `tonium clean`

Moves non-standard top-level CSS blocks out of `globals.css` into:

```text
app/styles/customs.css
```

or:

```text
src/app/styles/customs.css
```

It also inserts:

```css
@import "./styles/customs.css";
```

Use `--apply` to write changes. Without it, Tonium previews only.

### `tonium agents`

Creates or updates the Tonium managed section in `AGENTS.md`.

Content outside these markers is preserved:

```html
<!-- BEGIN:tonium-agent-rules -->
<!-- END:tonium-agent-rules -->
```

## Public API

Tonium also exports its core modules:

```ts
import {
  detectProject,
  parseCssFile,
  detectIntruders,
  parseColors,
  classifyColors,
  mapPaletteToTheme,
  createCli,
} from 'tonium';
```

## Project Layout

```text
src/
  bin/tonium.ts
  cli/
    commands/
      agents.ts
      audit.ts
      clean.ts
      theme.ts
    index.ts
    shared.ts
  core/
    agents/
    colors/
    css/
    project/
    safety/
    theme/
  types/
  utils/
```

## Development

```bash
npm run build
node dist/bin/tonium.js audit
```

The package exposes the CLI at `dist/bin/tonium.js` and the library entry point at `dist/index.js`.
