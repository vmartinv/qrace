// The game's two data files. The original's qnames.txt and help.txt load
// in dev mode with `?art=original` (see art.ts); otherwise these stand-ins
// (our own) are used.
import { ASSETS, useOriginal } from "./art.ts";

export let qnames: string[] = [
  "Bumble", "Sprocket", "Dizzy Lou", "Mudpie", "Zippo", "Gherkin", "Old Toby", "Wobbler",
  "Pip", "Crumpet", "Hopscotch", "Noodle", "Sir Squish", "Pickles", "Taffy", "Ruckus",
];

export let helpText = `QUIBBLE RACE — quick help (port)

Up to three players bet on quibble races. Each round three quibbles race.
On your turn you can bet on one of them, sponsor quibbles, train the ones
you sponsor, buy special services (some less legal than others), buy
inside information, or visit the loan shark.

Bets are pooled: the players who backed the winner split the whole pot in
proportion to their bets. Sponsored quibbles earn you money every time
they race, and a bonus when they win.

The game ends after the set number of rounds, or when a player reaches
the cash goal (see Options). Debts are paid off at the end, and the
richest player wins.`;

export async function loadData(): Promise<void> {
  if (!useOriginal()) return;
  const text = async (f: string) => {
    const r = await fetch(`${ASSETS}${f}`);
    if (!r.ok) throw new Error(f);
    return r.text();
  };
  try {
    qnames = (await text("qnames.txt")).split(/\r?\n/);
    helpText = await text("help.txt");
  } catch {
    // keep the stand-ins
  }
}

// Line Input #1 over qnames.txt.
export function openNames() {
  let line = 0;
  return () => qnames[line++] ?? "";
}
