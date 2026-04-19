declare module 'culori' {
  export type Color = any;
  export function parse(color: string): Color | undefined;
  export function formatHex(color: Color): string;
  export function formatCss(color: Color): string;
  export function converter(target: string): (color: Color | string) => Color;
  export function wcagContrast(color1: Color | string, color2: Color | string): number;
}
