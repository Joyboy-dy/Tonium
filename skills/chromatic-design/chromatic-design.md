---
name: chromatic-design
description: >
  Master reference for color science, chromatic management, and design token architecture for UI/web applications.
  Use this skill whenever you need to work with colors in any design or development context — including picking palette colors,
  generating harmonies, checking contrast/accessibility, building dark mode, creating CSS variables, managing design tokens,
  or applying color distribution rules to layouts. Trigger this skill for any task involving: color palettes, OKLCH, HSL,
  color contrast, WCAG compliance, dark mode, design tokens, CSS custom properties, tonal scales, color harmony schemas
  (complementary, analogous, triadic, tetradic), or the 60/30/10 rule. Even if the user just says "pick me some good colors"
  or "make this accessible", consult this skill first.
---

# Chromatic Design Skill

This skill encodes the absolute rules of color science, colorimetry, and chromatography for UI/web development.
It covers the full pipeline: color model selection → harmony generation → tonal scales → design tokens → accessibility validation → dark mode → distribution.

---

## 1. THE GOLDEN RULE: Always Use OKLCH

**Never use HSL as a primary color model for design systems.** HSL is mathematically cylindrical and ignores human eye physiology: at equal `L` values, yellow appears brighter than blue. This causes contrast drift when changing hues.

**OKLCH is mandatory** for any serious color work. It is perceptually uniform:
- `L` (Lightness 0.0–1.0): perceived brightness, consistent across all hues
- `C` (Chroma 0.0–0.4): color saturation/intensity
- `H` (Hue 0–360°): the color angle on the perceptual wheel

```css
/* ✅ Correct */
color: oklch(0.62 0.22 250);

/* ❌ Avoid as source of truth */
color: hsl(220, 80%, 50%);
```

**Key benefit:** Two colors with the same `L` value have genuinely identical perceived brightness — enabling predictive contrast calculation without trial and error.

> For full color model reference and conversion formulas, see `references/color-models.md` 

---

## 2. Harmony Schemas (Hue Rotation Rules)

Generate harmonies by rotating the `H` axis. Always keep `L` and `C` identical across all generated colors for true perceptual balance.

| Schema | Rule | Formula |
|--------|------|---------|
| **Complementary** | Direct opposition | `H + 180°` |
| **Analogous** | Adjacent, smooth transition | `H ± 30°` |
| **Triadic** | Dynamic 3-color balance | `H ± 120°` |
| **Square** | 4 equidistant points | `H + 90°, +180°, +270°` |
| **Tetradic** | 2 complementary pairs | `H + 60°, +180°, +240°` |

**All angles wrap modulo 360°.**

### Example Output (source: oklch(0.60 0.15 250))

```json
{
  "source": "oklch(0.60 0.15 250)",
  "harmonies": {
    "complementary": "oklch(0.60 0.15 70)",
    "analogous": [
      "oklch(0.60 0.15 220)",
      "oklch(0.60 0.15 280)"
    ],
    "triadic": [
      "oklch(0.60 0.15 10)",
      "oklch(0.60 0.15 130)"
    ],
    "tetradic": [
      "oklch(0.60 0.15 310)",
      "oklch(0.60 0.15 70)",
      "oklch(0.60 0.15 130)"
    ]
  }
}
```

---

## 3. Tonal Scale Generation (Steps 50–950)

Every color needs a **10-step tonal ramp** to cover surface backgrounds, hover states, borders, and deep text.

### Pivot Point
- Step **500** is always the pivot at `L ≈ 0.60` — this is the primary action color (button backgrounds, interactive elements)
- Steps **50–400**: lighter variants (surfaces, hover states)
- Steps **600–950**: darker variants (text, pressed states)

### Standard Lightness Map

| Step | Lightness (L) | Role |
|------|--------------|------|
| 50   | 0.96         | Page surface / background |
| 100  | 0.90         | Subtle surface |
| 200  | 0.80         | Hover state |
| 300  | 0.70         | Border / separator |
| 400  | 0.60 (alt)   | Secondary action |
| **500** | **0.60** | **Pivot / Primary action** |
| 600  | 0.50         | Pressed / active |
| 700  | 0.40         | Emphasis |
| 800  | 0.28         | Strong text |
| 900  | 0.18         | Deep text |
| 950  | 0.12         | Maximum contrast text |

### 5-Level Rule
Two steps on the ramp are **guaranteed AA accessible (4.5:1 contrast)** if they are at least **5 steps apart** (e.g., step 100 vs step 600, or step 50 vs step 500).

### Gamut Mapping (Wide-Gamut / P3)
If chroma `C` exceeds sRGB gamut limits, **reduce `C` while preserving `L` exactly**. Never clip `L` — it would destroy contrast guarantees.

```
If oklch(L, C, H) is out-of-gamut:
  → Reduce C by 0.01 increments until in-gamut
  → L and H remain unchanged
```

---

## 4. Design Token Architecture

Tokens must follow a strict two-layer hierarchy: **Primitives → Semantics**.

### Layer 1: Primitives
Raw OKLCH values. Named by hue + step. Never used directly in components.

```css
:root {
  --color-primitive-blue-500: oklch(0.62 0.22 250);
  --color-primitive-blue-50:  oklch(0.96 0.02 250);
  --color-primitive-blue-950: oklch(0.12 0.04 250);
  --color-primitive-gray-900: oklch(0.15 0.01 250);
}
```

### Layer 2: Semantics
Role-based aliases that point to primitives. **These are what components consume.**

**Naming convention (mandatory):** `{object}-{state}-{property}` 

```css
:root {
  /* Button */
  --color-semantic-button-default-bg:   var(--color-primitive-blue-500);
  --color-semantic-button-hover-bg:     oklch(from var(--color-primitive-blue-500) calc(l + 0.05) c h);
  --color-semantic-button-default-text: var(--color-primitive-gray-50);

  /* Text */
  --color-semantic-text-default-primary:   var(--color-primitive-gray-900);
  --color-semantic-text-default-secondary: var(--color-primitive-gray-600);

  /* Surface */
  --color-semantic-surface-default-bg:    var(--color-primitive-blue-50);
  --color-semantic-surface-elevated-bg:   var(--color-primitive-gray-50);
}
```

**Why this matters:** A full brand rebrand only requires remapping primitives. Component code never changes.

---

## 5. WCAG 2.2 Contrast Validation

Always validate **semantic pairs** (background + foreground token), never raw values.

### Contrast Requirements

| Level | UI Components / Large Text (18px+) | Body Text |
|-------|------------------------------------|-----------|
| **AA**  | 3:1 | 4.5:1 |
| **AAA** | 4.5:1 | 7:1 |

### Validation Logic

```
contrast_ratio = (L1 + 0.05) / (L2 + 0.05)
  where L1 > L2 (relative luminance, 0–1)
```

In OKLCH: the `L` channel approximates perceptual luminance closely enough for quick checks. For production, convert to relative luminance using the full sRGB conversion formula.

**Quick check using the 5-Level Rule:** If two tokens are from the same tonal scale and are 5+ steps apart, they are AA-compliant for body text.

### Remediation Pattern

If a pair fails:
1. **Darken foreground**: Move to a lower step (higher L value numerically = lighter → move to step 800+ for dark text)
2. **Lighten background**: Move surface to step 50–100
3. **Report suggested fix** with specific OKLCH values

```
✔ button-default-bg / button-default-text : 5.4:1 (Pass AA)
✖ card-default-bg / text-muted-fg : 2.8:1 (Fail)
  └─ Fix: Change foreground to oklch(0.30 0.02 250) [step 800]
     or increase background to oklch(0.98 0.01 250) [step 50]
```

> OKLCH's perceptual uniformity enables **predictive** contrast — you can estimate ratios by comparing `L` values before computing, eliminating iterative guesswork.

---

## 6. Dark Mode: Semantic Inversion

Dark mode is **not a color inversion**. It is a **semantic reassignment** based on the Elevation Principle.

### Elevation Principle
In dark mode, **lighter surfaces appear closer** to the user. Elevated components (modals, cards, tooltips) use slightly lighter dark backgrounds than the base surface.

### Inversion Rules

| Token Role | Light Mode | Dark Mode |
|------------|-----------|-----------|
| Surface default | step 50 (L 0.96) | step 900 (L 0.18) |
| Surface elevated | step 100 (L 0.90) | step 800 (L 0.28) |
| Text primary | step 950 (L 0.12) | step 50 (L 0.96) |
| Text secondary | step 700 (L 0.40) | step 300 (L 0.70) |
| Action / CTA | step 500 (L 0.60) | step 400 (L 0.65) |

### Chroma Reduction in Dark Mode
**Always reduce chroma by 10–15% in dark mode** to prevent chromatic vibration and eye strain on dark backgrounds.

```css
/* Light */
--color-semantic-action-primary-bg: oklch(0.60 0.22 250);

/* Dark */
--color-semantic-action-primary-bg: oklch(0.65 0.19 250); /* C reduced ~14% */
```

### Multi-Mode Token JSON

```json
{
  "semantic-surface-default-bg": {
    "light": "oklch(0.98 0.01 250)",
    "dark":  "oklch(0.15 0.02 250)"
  },
  "semantic-text-primary-fg": {
    "light": "oklch(0.10 0.01 250)",
    "dark":  "oklch(0.92 0.01 250)"
  },
  "semantic-action-primary-bg": {
    "light": "oklch(0.60 0.22 250)",
    "dark":  "oklch(0.65 0.19 250)"
  }
}
```

---

## 7. The 60/30/10 Distribution Rule

Every UI layout must follow this color distribution to reduce cognitive load and direct user attention.

| Band | Share | Role | Token Examples |
|------|-------|------|---------------|
| **Dominant** | 60% | Neutral surfaces, page backgrounds | step 50–100 (light) or step 900–950 (dark) |
| **Secondary** | 30% | Text, borders, structural elements | step 300–700 |
| **Accent** | 10% | CTAs, alerts, active indicators | step 500 (Chroma 0.20+) |

**Hard rule:** If the accent color exceeds 10% of the visual surface, its attention-directing power is diluted. Reserve it strictly for interactive and critical elements.

### Example Distribution (Dashboard)

```
Layout Recommendation:
- 60% → --surface-default-bg       (step 50  / L 0.96)
- 30% → --text-secondary-fg        (step 400 / L 0.45)
- 10% → --action-primary-bg        (step 500 / L 0.60, C 0.25)
```

---

## 8. CSS Implementation Patterns

### Relative Color Syntax (Modern CSS)
Use CSS `oklch(from ...)` for computed states — keeps tokens DRY:

```css
/* Hover: +5% lightness from base */
--button-hover-bg: oklch(from var(--color-primitive-blue-500) calc(l + 0.05) c h);

/* Disabled: reduced chroma */
--button-disabled-bg: oklch(from var(--color-primitive-blue-500) l calc(c * 0.4) h);

/* Dark mode: chroma reduction */
--action-dark-bg: oklch(from var(--color-primitive-blue-500) calc(l + 0.05) calc(c * 0.86) h);
```

### CSS @layer for Token Architecture

```css
@layer tokens.primitives {
  :root { --color-primitive-blue-500: oklch(0.62 0.22 250); }
}

@layer tokens.semantics {
  :root { --color-semantic-button-default-bg: var(--color-primitive-blue-500); }
}

@layer tokens.modes {
  [data-theme="dark"] {
    --color-semantic-surface-default-bg: oklch(0.15 0.02 250);
  }
}
```

---

## 9. Quick Reference Checklist

Before shipping any color decision, verify:

- [ ] Source color defined in OKLCH (not hex or HSL)
- [ ] Tonal scale generated with pivot at step 500 (L ≈ 0.60)
- [ ] Primitives and semantics are separate layers
- [ ] Semantic naming follows `{object}-{state}-{property}` 
- [ ] All text/background pairs validated against WCAG AA (4.5:1 minimum)
- [ ] Dark mode uses semantic inversion (not CSS `invert()`)
- [ ] Dark mode chroma reduced by 10–15%
- [ ] Out-of-gamut colors have chroma mapped down (L preserved)
- [ ] Color distribution follows 60/30/10

---

## Reference Files

- `references/color-models.md` — OKLCH vs HSL vs sRGB deep dive, conversion formulas, gamut boundaries
- `references/wcag-formulas.md` — Relative luminance calculation, contrast ratio algorithm, APCA preview
