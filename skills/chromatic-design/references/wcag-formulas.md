# WCAG Contrast Formulas Reference

## Relative Luminance

```
L = 0.2126 * R + 0.7152 * G + 0.0722 * B
```
Where R, G, B are **linear** (gamma-expanded) sRGB values (0–1).

Gamma expansion per channel `c` (from sRGB `c_srgb`):
```
if c_srgb <= 0.04045 → c = c_srgb / 12.92
else                  → c = ((c_srgb + 0.055) / 1.055) ^ 2.4
```

## Contrast Ratio

```
ratio = (L_lighter + 0.05) / (L_darker + 0.05)
```

Where `L_lighter` and `L_darker` are the relative luminances of the two colors, sorted so `L_lighter >= L_darker`.

## WCAG 2.2 Thresholds

| Use Case | Min Ratio (AA) | Min Ratio (AAA) |
|----------|---------------|----------------|
| Normal text (< 18px / < 14px bold) | **4.5:1** | 7:1 |
| Large text (≥ 18px / ≥ 14px bold) | **3:1** | 4.5:1 |
| UI components, icons, borders | **3:1** | — |
| Decorative elements | None | None |

## OKLCH Quick Contrast Estimation

Because OKLCH `L` ≈ perceived lightness, a rough ratio can be estimated:
```
approx_ratio = (L_light + 0.05) / (L_dark + 0.05)
```
Example: L=0.96 vs L=0.12 → (0.96 + 0.05) / (0.12 + 0.05) = 1.01 / 0.17 ≈ **5.9:1** ✔ AA

This is approximate. Always verify with exact sRGB luminance for production.

## 5-Level Rule (Fast Check)

On a 10-step tonal scale (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950):
- **5+ steps apart** → guaranteed ≥ 4.5:1 (WCAG AA for body text)
- **7+ steps apart** → likely ≥ 7:1 (WCAG AAA)

## APCA (Advanced Perceptual Contrast Algorithm)

OKLCH's perceptual uniformity positions design systems well for **APCA**, the future successor to WCAG contrast ratios. APCA uses a non-symmetric model (dark text on light ≠ light text on dark) and measures in Lc (Lightness Contrast) units:
- Lc 60+ → equivalent to AA body text
- Lc 75+ → equivalent to AAA body text

While WCAG 2.2 is current standard, building with OKLCH makes APCA migration straightforward since `L` maps directly to APCA's lightness calculations.
