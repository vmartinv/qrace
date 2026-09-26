// VB's Rnd/Randomize: a 24-bit linear congruential generator.
// Rnd: x = (x * 0x43FD43FD + 0xC39EC3) mod 2^24, returns x / 2^24.
// Randomize n: mixes the high dword of the Double n into bits 8..23
// (VB5/6 behavior; to be checked against VB3 with the oracle).

let seed = 0x50000;

export function rnd(): number {
  seed = (Math.imul(seed, 0x43fd43fd) + 0xc39ec3) & 0xffffff;
  return seed / 0x1000000;
}

export function randomize(n: number = timer()): void {
  const b = new DataView(new ArrayBuffer(8));
  b.setFloat64(0, n, true);
  const hi = b.getUint32(4, true);
  seed = (seed & 0xff) | ((((hi & 0xffff) ^ (hi >>> 16)) << 8) & 0xffff00);
}

export function getSeed(): number {
  return seed;
}

export function setSeed(s: number): void {
  seed = s & 0xffffff;
}

// Seconds since midnight as a Single (VB's Timer). A fixed clock can be
// installed for deterministic runs.
let clock: (() => number) | null = null;

export function setClock(f: (() => number) | null): void {
  clock = f;
}

export function timer(): number {
  if (clock) return Math.fround(clock());
  const d = new Date();
  const ms = d.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.fround(ms / 1000);
}
