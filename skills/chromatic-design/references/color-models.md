# Color Models Reference

## OKLCH vs HSL: Why It Matters

### HSL Limitations
HSL (Hue, Saturation, Lightness) uses a cylindrical model derived from RGB. Its `L` axis is *mathematically* uniform but **perceptually non-uniform**:
- `hsl(60, 100%, 50%)` (yellow) appears much brighter than `hsl(240, 100%, 50%)` (blue) at the same `L` 
- This causes unpredictable contrast when hues change, requiring manual correction per-color

### OKLCH Advantages
OKLCH is derived from the CIELAB perceptual space, calibrated to human vision:
- `L` = perceived lightness (identical `L` = identical perceived brightness across ALL hues)
- `C` = chroma (colorfulness; 0 = gray, 0.4 = maximum saturation for most hues)
- `H` = hue angle (0–360°, perceptual wheel, not RGB wheel)

### Gamut Boundaries (approximate)
| Color Space | Max Chroma (C) |
|-------------|---------------|
| sRGB | ~0.15–0.20 (varies by hue) |
| Display P3 | ~0.22–0.28 |
| Rec. 2020 | ~0.35+ |

Out-of-gamut detection: try rendering `oklch(L, C, H)` — if browser clamps, reduce `C`.

## sRGB Conversion (for Luminance Calculation)

To compute WCAG relative luminance from OKLCH:

1. Convert OKLCH → OKLab → linear sRGB → gamma-encoded sRGB
2. Apply gamma expansion per channel:
   ```
   if channel <= 0.04045:
     linear = channel / 12.92
   else:
     linear = ((channel + 0.055) / 1.055) ^ 2.4
   ```
3. Relative luminance:
   ```
   Y = 0.2126 * R_linear + 0.7152 * G_linear + 0.0722 * B_linear
   ```

## Useful OKLCH Anchors

| Color | OKLCH |
|-------|-------|
| Pure white | oklch(1.0 0 0) |
| Pure black | oklch(0.0 0 0) |
| Mid-gray (neutral) | oklch(0.60 0 0) |
| Vivid red | oklch(0.55 0.25 25) |
| Vivid green | oklch(0.75 0.22 145) |
| Vivid blue | oklch(0.55 0.25 264) |
| Vivid yellow | oklch(0.90 0.20 100) |
| Vivid orange | oklch(0.70 0.22 55) |
| Vivid purple | oklch(0.55 0.25 295) |
