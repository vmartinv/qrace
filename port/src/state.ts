// The game's global variables (MODULE1.BAS), named per names.json.
// VB arrays `x(2)` have indexes 0..2. Variants start Empty, which reads as
// 0 or "", so each starts as whichever it's used as. Fields commented
// *Integer* are Integer in the original: assign them through cint().

const dim = <T>(upper: number, v: T): T[] => Array.from({ length: upper + 1 }, () => v);

export const G = {
  // players (3 seats)
  PlayerType: dim(2, 0), // 0 out, 1 human, 2 computer
  PlayerCash: dim(2, 0),
  PlayerBet: dim(2, 0),
  PlayerPick: dim(2, 0), // racer 0..2
  PlayerDebt: dim(2, 0),
  PlayerWinnings: dim(2, 0),
  PlayerName: dim(2, ""),
  PlayerPickName: dim(2, ""),
  AISponsorCount: dim(2, 0),
  StatusSlot: dim(2, 0), // *Integer*: frmStatus row -> quibble

  // quibbles (16)
  QAlive: dim(15, 0),
  QSpeed: dim(15, 0),
  QWins: dim(15, 0),
  QRaces: dim(15, 0), // *Integer*
  QName: dim(15, ""),
  QSponsor: dim(15, ""),
  QMaxSpeed: dim(15, 0), // *Integer*

  // racers (3 per race)
  RQuibble: dim(2, 0),
  RSpeed: dim(2, 0),
  RWinPct: dim(2, 0), // *Integer*
  RName: dim(2, ""),
  RSponsor: dim(2, ""),
  RBetCount: dim(2, 0),
  RBetTotal: dim(2, 0), // *Integer*
  RRunning: dim(2, 0),
  RDir: dim(2, 0), // *Integer*
  RConfused: dim(2, 0),
  RSteroids: dim(2, 0),
  RSteroidsBy: dim(2, 0),
  RWeights: dim(2, 0),
  RWeightsBy: dim(2, 0), // *Integer*
  RPoison: dim(2, 0),
  RPoisonBy: dim(2, 0),
  RGuard: dim(2, 0),
  RGuardBy: dim(2, 0), // *Integer*
  RDrug: dim(2, 0),
  RDrugBy: dim(2, 0),
  RCripple: dim(2, 0),
  RCrippleBy: dim(2, 0), // *Integer*
  RTrain: dim(2, 0),
  RTrainBy: dim(2, 0),

  // quibbles for sale
  AvailQuibble: dim(2, 0),
  AvailPrice: dim(2, 0),
  AvailOpen: dim(2, 0), // *Integer*

  // options
  GoalType: 0, // 1 cash, 2 rounds
  Goal: 0,
  StartCash: 0,
  Interest: 0, // *Integer*
  RaceSpeed: 0,
  OptSpecial: 0,
  OptSpecialLimit: 0,
  OptInfo: 0, // *Integer*
  OptSponsor: 0,

  // flow
  Round: 0, // *Integer*
  TurnState: 0, // menu state machine: 0 next seat, 1 start human turn, 2 waiting, 6 done
  CurPlayer: 0,
  RaceState: 0, // *Integer*: 0 countdown, 1 running, 2 won, 3 paying out
  Winner: 0, // *Integer*
  UpdateBusy: 0,
  BonusBusy: 0,
  BonusStep: 0,
  NoneForSale: 0,
  AISponsorPending: 0,
  AITrainPending: 0,
  AISponsorPick: 0,
  SpecialKind: "",
  SpecialCost: 0, // *Integer*
  RandRacer: 0,
  ShellId: 0,

  // scratch variables the original shares between procedures
  I: 0,
  J: 0,
  K: 0,
  M: 0, // *Integer*
  T1: 0,
  T2: 0,
  T3: 0,
  Count: 0,
};
