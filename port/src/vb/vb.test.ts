import { describe, expect, it } from "vitest";
import { cint, cstr, str, val, vbInt } from "./conv.ts";
import { rnd, setSeed, getSeed } from "./rnd.ts";

describe("conv", () => {
  it("Int floors", () => {
    expect(vbInt(2.7)).toBe(2);
    expect(vbInt(-2.1)).toBe(-3);
  });
  it("Integer assignment rounds half to even and overflows", () => {
    expect(cint(2.5)).toBe(2);
    expect(cint(3.5)).toBe(4);
    expect(cint(-2.5)).toBe(-2);
    expect(cint(2.6)).toBe(3);
    expect(() => cint(32768)).toThrow("Overflow");
  });
  it("Str$ pads non-negative numbers", () => {
    expect(str(12)).toBe(" 12");
    expect(str(-3)).toBe("-3");
    expect(str(0.5)).toBe(" .5");
    expect(str(0)).toBe(" 0");
    expect(cstr(12)).toBe("12");
    expect(cstr(1 / 3)).toBe("0.333333333333333");
  });
  it("Val parses a leading number", () => {
    expect(val(" 12")).toBe(12);
    expect(val("1 2abc")).toBe(12);
    expect(val("Enter Name")).toBe(0);
    expect(val("-4.5e1x")).toBe(-45);
    expect(val("&H10")).toBe(16);
  });
});

describe("rnd", () => {
  it("follows the 24-bit LCG from the default seed", () => {
    setSeed(0x50000);
    const a = rnd();
    expect(getSeed()).toBe((0x50000 * 0x43fd43fd + 0xc39ec3) % 0x1000000);
    expect(a).toBe(getSeed() / 0x1000000);
  });
});
