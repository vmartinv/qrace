// VB conversions and formatting.
import { overflow } from "./errors.ts";

// Int(): the largest integer <= x.
export const vbInt = (x: number): number => Math.floor(x);

// Assignment to an Integer: round half to even, overflow outside 16 bits.
export function cint(x: number): number {
  let r = Math.round(x);
  if (Math.abs(x % 1) === 0.5 && r % 2 !== 0) r -= 1;
  if (r < -32768 || r > 32767) throw overflow();
  return r;
}

// A number as VB converts it to a string (CStr, or a Variant number
// assigned to a Caption/Text): up to 15 significant digits, no padding.
export function cstr(x: number | string): string {
  if (typeof x === "string") return x;
  if (Number.isInteger(x) && Math.abs(x) < 1e15) return String(x);
  let s = x.toPrecision(15);
  if (s.includes("e")) {
    const [m, e] = s.split("e");
    const mm = m.includes(".") ? m.replace(/0+$/, "").replace(/\.$/, "") : m;
    const ee = Number(e);
    return `${mm}E${ee < 0 ? "-" : "+"}${String(Math.abs(ee)).padStart(2, "0")}`;
  }
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

// Str$(): like CStr, with a leading space for non-negative numbers and no
// leading zero before the decimal point (" .5", "-.5").
export function str(x: number): string {
  let s = cstr(Math.abs(x));
  if (s.startsWith("0.")) s = s.slice(1);
  return (x < 0 ? "-" : " ") + s;
}

// Val(): the number at the start of the string. Blanks anywhere are
// skipped; parsing stops at the first character that can't continue it.
export function val(s: string): number {
  const t = s.replace(/[ \t\n\r]/g, "");
  const h = /^&([HhOo])([0-9A-Fa-f]*)/.exec(t);
  if (h) {
    const n = parseInt(h[2] || "0", h[1].toUpperCase() === "H" ? 16 : 8);
    return isNaN(n) ? 0 : n;
  }
  const m = /^[+-]?(\d+\.?\d*|\.\d+)([EeDd][+-]?\d+)?/.exec(t);
  return m ? Number(m[0].replace(/[Dd]/, "E")) : 0;
}
