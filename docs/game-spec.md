# Quibble Race v1.5 — game spec

Our own description of the rules recovered from the decompiled program.
Names follow `names.json`. Money and stats are VB Variants (Doubles in
practice) unless marked *Integer*. Positions are in twips (15 twips = 1 px).

## Entities

- **Players** (3 seats): type (0 = out/retired, 1 = human, 2 = computer),
  name, cash, debt, bet, pick (racer 0–2), winnings of the last race,
  sponsor purchases so far (computer only).
- **Quibbles** (16, names from `qnames.txt`, one per line): alive flag,
  speed, max speed (*Integer*), wins, races (*Integer*), sponsor (a player
  name or empty).
- **Racers** (3 per race): the quibble index, speed for this race, win %
  (*Integer*), bet count, bet pool total (*Integer*), sponsor, running flag,
  direction (+1/−1, *Integer*), a confused flag, and per sabotage kind a
  pending flag plus the player who bought it.

## Settings (Options form; defaults set at startup)

| setting | default | notes |
|---|---|---|
| goal type | 2 (rounds) | 1 = first to cash − debt ≥ goal |
| goal | 12 | option buttons reset it to 1000 (cash) / 12 (rounds) |
| starting cash | 100 | |
| loan interest % | 25 | |
| race speed | 25 | race tick interval = 30 − min(speed, 29) ms |
| specials / one special per turn / info broker / sponsoring | on / on / on / on | |

## Startup (title form)

`Randomize`. For each quibble i = 0..15, in this order: read its name, then
alive = 1, speed = Int(40·Rnd)+30, races = Int(5·Rnd)+3, wins = 0,
max speed = Int(10·Rnd)+80. Then simulate its past races: for each, roll
two rivals Int(40·Rnd)+30 each (in that order); a win counts when speed
beats both strictly. START gives every player the starting cash and zero
debt, then opens player setup: for each seat, Human (enter a name) or
Computer (named "Player One/Two/Three").

## Round (menu form load)

1. Round += 1. Clamp every quibble's speed to its max speed.
2. Pick 3 distinct alive racers by rejection sampling: `Int(16·Rnd)`
   redrawn until valid, racer 0 then 1 then 2.
3. Count the quibbles that are alive, unsponsored and not racing. If fewer
   than 3, mark none for sale. Otherwise pick 3 distinct such quibbles for
   sale the same way. Price = Int(100·wins/races) + speed, with the
   division done first: Int((wins/races)·100) + speed.
4. Racer setup: name, sponsor, speed = quibble speed, win % =
   Int(100·(wins/races)). All bets and sabotage cleared, running = 1,
   direction = +1.
5. Seed the pools. Each seeding "bet" adds 1 to a racer's bet count and
   Int(20·Rnd)+90 to its pool (*Integer*):
   - one on racer Int(3·Rnd);
   - by speed: the fastest racer (highest index among ties) gets 3, then
     the "second" gets 1. The second is the highest-index racer ≠ fastest
     that is ≥ at least one other racer;
   - by win %: the same, but the lowest index wins ties, for both the
     top racer and the second;
   - one on each racer.
6. Sponsor income: for each racer whose quibble's sponsor is a player's
   name, that player gets + the racer's win %.

## Turns (menu form, `Timer2`, 1 ms)

A state machine walks the seats 0..2. When a seat is a computer, it plays
its whole turn in one tick. When a seat is human, the turn waits for Done.
After seat 2 the race starts.

Checked each time a new human turn starts: the game ends when any of these
hold. (a) Goal type 1 and some player's cash − debt ≥ goal. (b) Goal type 2
and goal + 1 = round. (c) Fewer than 2 players with type ≠ 0: the sum of
types < 2 (sic: computers count 2). At the end, every player's debt is
subtracted from their cash and the winners form opens.

**Human turn** (menu buttons, each opens its form):
- **Bet**: amount (Max fills in the cash) on the selected racer (click its
  picture). Rejected if > cash ("too high") or ≤ 0 ("too low"). On Done:
  bet count +1, the pool += bet, cash −= bet, and the side forms close.
- **Sponsor**: *Available* lists the quibbles for sale, and buying one sets
  its sponsor. Disabled when the player already sponsors 3 or none are for
  sale. *Status* lists up to 3 of the player's quibbles, and a player can
  rename them. **Train** costs Int(speed/2) and gives speed +5, once per
  turn per quibble. It's hidden once speed ≥ max speed. (The menu's copy of
  this list hides Train at speed ≥ 85.)
- **Special** (sabotage). Choose a kind, then a target racer. Cost is
  deducted immediately. With "one special per turn" set, the button
  disables after a purchase. Costs: steroids 50, weights 30, poison 150,
  train 20, cripple 35, drug 75, guard 25. Guard only takes effect when
  Int(Rnd·5) ≠ 1.
- **Information** (10 each): bet counts and pools of all racers, or a
  speed ranking ("safe bet / likely second / risk"), computed like step 5.
- **Loan shark**: borrow 4..1000 while debt < 2000. Debt +=
  Int(amount·0.01·(interest+100)). Pay back up to cash; debt floors at 0.
- **Retire**: seat type = 0, bet = 0.

**Computer turn**:
1. If cash < 100 + 20·round, set cash = 100 + 50·round.
2. If (Int(Rnd·3) = 1 or it has never sponsored) and something is for sale:
   refresh the for-sale list, pick k = Int(Rnd·3), and buy it if it's
   affordable, still open, and it has bought < 3 so far.
3. If Int(Rnd·3) ≠ 1: train each of its quibbles it can afford (speed +5).
4. Bet: draw r = Int(Rnd·total bet count)+1 and pick the racer whose
   cumulative bet-count range contains r. Bet = Int((count/total)·cash).
   Pay it and update the pools.
5. Sabotage: s = Int(Rnd·10)+1. The rival is the fastest (by race speed)
   racer other than its pick, with the first index winning ties. Then:
   1 steroids on its pick (cash ≥ 50), 2 guard on its pick (≥ 25),
   3 weights on the rival (≥ 30), 4 poison on the rival (≥ 150), 5 train its
   pick (≥ 20), 6 cripple the rival (≥ 35), 7 drug the rival (≥ 75).
   Computer guards always take effect.

## Pre-race updates (update form, `Timer1`, 1 ms)

For each racer 0..2, one message at a time (OK continues). First match
wins, and a racer with nothing pending is skipped:

| pending | not guarded | guarded |
|---|---|---|
| steroids | race speed +10 | buyer fined 25 |
| weights | race speed −10 | buyer fined 25 |
| drug | confused | buyer fined 25 |
| cripple | race speed −10; quibble speed and max speed −10 | buyer fined 50 |
| train | race speed +5, quibble speed +5 (guard ignored) | — |
| poison | not running; the quibble dies, unsponsored | buyer fined 75 |

A fine that takes cash below 0 moves the shortfall into debt and sets cash
to 0. Original bug, kept: for steroids, the buyer's debt becomes seat 1's
debt + the shortfall (it reads the flag, always 1, as a seat).

## Race (main form)

On load each racing quibble's races +1, and racers that aren't running are hidden.
Countdown on `Timer1` (1200 ms): "On your mark...", "Get set...", "Go!".
Each `Timer2` tick calls `Randomize`, then for
racer 0..2, if Int(100·Rnd)+1 < race speed:
- if confused and direction +1 and Int(5·Rnd) = 1: direction −1;
  if confused and direction −1 and Int(2·Rnd) = 1: direction +1. Both
  rolls happen on every move, confused or not (VB's `And` evaluates every
  operand), so the RNG sequence depends on them;
- move 100·direction twips, toggle the jump/squat frame;
- a running racer whose Left = 8400 exactly wins: "Winner!", "<name> has
  won!", its quibble's wins +1. Later racers in the same tick are still
  moved, and a second finish overwrites the winner.

Any click or key after the win continues. Every player who picked the
winner gets winnings = Int((bet / pool[winner]) · (sum of pools)) − bet,
and cash += Int((bet / pool[winner]) · sum of pools). Players who picked
wrong already lost their bet when betting.

## After the race (update2 form)

1. Each player: "<name> won $<winnings>" or "lost $<bet>".
2. Each player who sponsors the winner: "+$100 sponsoring bonus".
3. For each racer other than the winner: if win % ≤ 15, races ≥ 8, and
   more than 10 quibbles are alive, it retires (dies, unsponsored). The
   check reads racer slot 0..2's win % but quibble 0..2's race count
   (original bug, kept).

Then back to the menu for the next round.

## Game over (winners form)

Ranks by cash (ties: the later index wins #1). Shows "<name> Has Won the
Game!", each player's "$ cash" and rank. OK quits.

## VB semantics the port must keep

- `Int` = floor. Assigning to an *Integer* rounds half to even and
  overflows past ±32767 (runtime error 6, which ends the game).
- `Str$(n)`: a leading space for n ≥ 0, no leading zero (" .5").
  `String + Variant` concatenates without that space
  (`"Train $" + Int(x)`), and a Variant number assigned to a caption is
  also formatted without it.
- `Val` parses a leading number and ignores the rest (0 if none).
- `Rnd`: 24-bit LCG `x = (x·0x43FD43FD + 0xC39EC3) mod 2^24`, returns
  x/2^24, initial x = 0x50000. `Randomize` mixes in `Timer` (the exact
  mixing follows VB5/6 and is unverified for VB3).
- Timers can't tick faster than the OS timer. The port ticks at
  max(interval, 55) ms, like SetTimer on Windows 3.x/9x.
