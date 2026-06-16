declare module 'culori' {
  export interface Color {
    mode?: string;
    alpha?: number;
    [channel: string]: string | number | undefined;
  }

  export interface Oklch extends Color {
    mode: 'oklch';
    l: number;
    c: number;
    h?: number;
  }

  export interface Rgb extends Color {
    mode?: 'rgb';
    r: number;
    g: number;
    b: number;
  }

  export interface Hsl extends Color {
    mode?: 'hsl';
    h?: number;
    s?: number;
    l?: number;
  }

  export function parse(input: string): Color | undefined;
  export function oklch(color: Color): Oklch | undefined;
  export function rgb(color: Color): Rgb;
  export function hsl(color: Color): Hsl;
  export function formatHex(color: Color): string;
  export function formatHex8(color: Color): string;
}
