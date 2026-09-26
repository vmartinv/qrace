import { G } from "../state.ts";
import { F, quitAll } from "./registry.ts";
import { CommandButton, End, Image, Label, msgBox, Shape, TextBox, VBForm } from "../vb/runtime.ts";
import { cint, cstr, str as Str, val as Val, vbInt as Int } from "../vb/conv.ts";
import { rnd as Rnd } from "../vb/rnd.ts";

export class FrmMenu extends VBForm {
  declare lblQname: Label[];
  declare lblWin: Label[];
  declare lblRaces: Label[];
  declare lblSponsor: Label[];
  declare imgQuibble: Image[];
  declare imgJump: Image;
  declare imgSquat: Image;
  declare shpBox: Shape;
  declare txtBet: TextBox;
  declare lblPlayer: Label;
  declare lblCash: Label;
  declare lblDebt: Label;
  declare cmdSpecial: CommandButton;
  declare cmdSponsor: CommandButton;
  declare cmdInfo: CommandButton;
  private flip = 0; // Timer1_Timer's Static

  // Fills frmAvailable with the quibbles for sale and their prices.
  RefreshAvailable() {
    const A = F.frmAvailable;
    for (G.I = 0; G.I <= 2; G.I++) {
      const show = G.AvailOpen[G.I] !== 0;
      A.imgQuibble[G.I].Visible = show;
      A.lblQname[G.I].Visible = show;
      A.lblWin[G.I].Visible = show;
      A.lblRaces[G.I].Visible = show;
      A.lblPrice[G.I].Visible = show;
      A.cmdSponsor[G.I].Visible = show;
      const q = G.AvailQuibble[G.I];
      A.lblQname[G.I].Caption = G.QName[q];
      A.lblWin[G.I].Caption = "Win %:  " + Str(Int((G.QWins[q] / G.QRaces[q]) * 100));
      A.lblRaces[G.I].Caption = "Races:  " + Str(G.QRaces[q]);
      G.AvailPrice[G.I] = Int((G.QWins[q] / G.QRaces[q]) * 100) + G.QSpeed[q];
      A.lblPrice[G.I].Caption = "Price:  $" + Str(G.AvailPrice[G.I]);
    }
  }

  // Fills frmStatus with the current player's quibbles (up to 3).
  RefreshStatus() {
    const S = F.frmStatus;
    for (G.I = 0; G.I <= 2; G.I++) {
      G.StatusSlot[G.I] = -1;
      S.lblNotice.Visible = true;
      S.imgQuibble[G.I].Visible = false;
      S.txtName[G.I].Visible = false;
      S.lblWin[G.I].Visible = false;
      S.lblRaces[G.I].Visible = false;
      S.lblSpeed[G.I].Visible = false;
      S.cmdTrain[G.I].Visible = false;
    }
    for (G.I = 0; G.I <= 15; G.I++) {
      if (G.QSponsor[G.I] === G.PlayerName[G.CurPlayer] && G.QAlive[G.I] !== 0) {
        const fill = (s: number) => {
          S.lblNotice.Visible = false;
          S.imgQuibble[s].Visible = true;
          S.txtName[s].Visible = true;
          S.txtName[s].Text = G.QName[G.I];
          S.lblWin[s].Visible = true;
          S.lblWin[s].Caption = "Win %:  " + Str(Int(100 * (G.QWins[G.I] / G.QRaces[G.I])));
          S.lblRaces[s].Visible = true;
          S.lblRaces[s].Caption = "Races:  " + Str(G.QRaces[G.I]);
          S.lblSpeed[s].Visible = true;
          S.lblSpeed[s].Caption = "Speed:  " + Str(G.QSpeed[G.I]);
          S.cmdTrain[s].Visible = true;
          if (G.QSpeed[G.I] >= 85) S.cmdTrain[s].Visible = false;
          S.cmdTrain[s].Caption = "Train $" + cstr(Int(G.QSpeed[G.I] / 2));
          G.StatusSlot[s] = cint(G.I);
        };
        // (VB's And evaluates every operand; these have no side effects.)
        if (G.StatusSlot[0] < 0) fill(0);
        if (G.StatusSlot[1] < 0 && G.StatusSlot[0] !== G.I) fill(1);
        if (G.StatusSlot[2] < 0 && G.StatusSlot[0] !== G.I && G.StatusSlot[1] !== G.I) fill(2);
      }
    }
  }

  cmdDone_Click() {
    if (Val(this.txtBet.Text) > G.PlayerCash[G.CurPlayer]) {
      msgBox("Your bet is too high.");
    } else if (Val(this.txtBet.Text) <= 0) {
      msgBox("Your bet is too low.");
    } else {
      const p = G.CurPlayer;
      G.PlayerBet[p] = Val(this.txtBet.Text);
      if (this.shpBox.Top === 720) G.PlayerPick[p] = 0;
      if (this.shpBox.Top === 2040) G.PlayerPick[p] = 1;
      if (this.shpBox.Top === 3360) G.PlayerPick[p] = 2;
      G.PlayerPickName[p] = G.RName[G.PlayerPick[p]];
      G.RBetCount[G.PlayerPick[p]] = G.RBetCount[G.PlayerPick[p]] + 1;
      G.RBetTotal[G.PlayerPick[p]] = cint(G.RBetTotal[G.PlayerPick[p]] + G.PlayerBet[p]);
      G.PlayerCash[p] = G.PlayerCash[p] - G.PlayerBet[p];
      F.frmLoan.Hide();
      F.frmRetire.Hide();
      F.frmSpecial.Hide();
      F.frmInfo.Hide();
      F.frmSponsor.Hide();
      F.frmAvailable.Hide();
      F.frmStatus.Hide();
      G.TurnState = 0;
      F.frmLoan.Unload();
      F.frmRetire.Unload();
      F.frmSpecial.Unload();
      F.frmInfo.Unload();
      F.frmSponsor.Unload();
      F.frmAvailable.Unload();
      F.frmStatus.Unload();
    }
  }

  cmdInfo_Click() {
    F.frmInfo.Show();
  }

  cmdLoan_Click() {
    if (G.PlayerDebt[G.CurPlayer] === 0) {
      F.frmLoan.lblText.Caption = "Need a little money, do ya?  I can give you a loan.  Of course, there's interest -- " +
        Str(G.Interest) + "%, so you'd better be able to pay up when the time comes.    ";
    } else {
      F.frmLoan.lblText.Caption = "I sure as hell hope you're here to pay me back!";
    }
    F.frmLoan.lblCash.Caption = Str(G.PlayerCash[G.CurPlayer]);
    F.frmLoan.lblDebt.Caption = Str(G.PlayerDebt[G.CurPlayer]);
    F.frmLoan.Show();
  }

  cmdMax_Click() {
    this.txtBet.Text = Str(G.PlayerCash[G.CurPlayer]);
  }

  cmdRetire_Click() {
    F.frmRetire.Show();
  }

  cmdSpecial_Click() {
    F.frmSpecial.Show();
    F.frmSpecial.cmdQuit.SetFocus();
  }

  cmdSponsor_Click() {
    F.frmSponsor.Show();
  }

  SetCripple() {
    G.SpecialKind = "cripple";
    G.SpecialCost = 35;
  }

  SetDrug() {
    G.SpecialKind = "drug";
    G.SpecialCost = 75;
  }

  SetGuard() {
    G.SpecialKind = "guard";
    G.SpecialCost = 25;
  }

  SetPoison() {
    G.SpecialKind = "poison";
    G.SpecialCost = 150;
  }

  SetSteroids() {
    G.SpecialKind = "steroids";
    G.SpecialCost = 50;
  }

  SetTrain() {
    G.SpecialKind = "train";
    G.SpecialCost = 20;
  }

  SetWeights() {
    G.SpecialKind = "weights";
    G.SpecialCost = 30;
  }

  // A computer player's special, like frmTarget's cmdQuibble_Click (but
  // guards always work).
  ApplySpecial(racer: number) {
    const p = G.CurPlayer;
    G.PlayerCash[p] = G.PlayerCash[p] - G.SpecialCost;
    F.frmMenu.lblCash.Caption = Str(G.PlayerCash[p]);
    F.frmLoan.lblCash.Caption = Str(G.PlayerCash[p]);
    if (G.SpecialKind === "steroids") {
      G.RSteroids[racer] = 1;
      G.RSteroidsBy[racer] = p;
    }
    if (G.SpecialKind === "weights") {
      G.RWeights[racer] = 1;
      G.RWeightsBy[racer] = cint(p);
    }
    if (G.SpecialKind === "poison") {
      G.RPoison[racer] = 1;
      G.RPoisonBy[racer] = p;
    }
    if (G.SpecialKind === "train") {
      G.RTrain[racer] = 1;
      G.RTrainBy[racer] = p;
    }
    if (G.SpecialKind === "cripple") {
      G.RCripple[racer] = 1;
      G.RCrippleBy[racer] = cint(p);
    }
    if (G.SpecialKind === "drug") {
      G.RDrug[racer] = 1;
      G.RDrugBy[racer] = p;
    }
    if (G.SpecialKind === "guard") {
      G.RGuard[racer] = 1;
      G.RGuardBy[racer] = cint(p);
    }
    if (G.OptSpecialLimit === 1) F.frmMenu.cmdSpecial.Enabled = false;
  }

  Form_Load() {
    F.frmPlayer.Unload();
    G.TurnState = 0;
    G.CurPlayer = -1;
    G.Round = cint(G.Round + 1);
    for (G.I = 0; G.I <= 15; G.I++) if (G.QSpeed[G.I] > G.QMaxSpeed[G.I]) G.QSpeed[G.I] = G.QMaxSpeed[G.I];

    // Three distinct live racers.
    do G.RQuibble[0] = Int(16 * Rnd()); while (G.QAlive[G.RQuibble[0]] === 0);
    do G.RQuibble[1] = Int(16 * Rnd());
    while (G.RQuibble[0] === G.RQuibble[1] || G.QAlive[G.RQuibble[1]] === 0);
    do G.RQuibble[2] = Int(16 * Rnd());
    while (G.RQuibble[0] === G.RQuibble[2] || G.RQuibble[1] === G.RQuibble[2] || G.QAlive[G.RQuibble[2]] === 0);

    // Three distinct quibbles for sale: alive, unsponsored, not racing.
    G.Count = 0;
    for (G.I = 0; G.I <= 15; G.I++) {
      G.Count = G.Count + 1;
      if (G.QAlive[G.I] === 0 || G.QSponsor[G.I] !== "" || G.RQuibble[0] === G.I || G.RQuibble[1] === G.I ||
        G.RQuibble[2] === G.I) G.Count = G.Count - 1;
    }
    if (G.Count < 3) {
      G.NoneForSale = 1;
    } else {
      const taken = (q: number) =>
        G.QAlive[q] === 0 || G.QSponsor[q] !== "" || q === G.RQuibble[0] || q === G.RQuibble[1] || q === G.RQuibble[2];
      do G.AvailQuibble[0] = Int(16 * Rnd()); while (taken(G.AvailQuibble[0]));
      do G.AvailQuibble[1] = Int(16 * Rnd());
      while (G.AvailQuibble[0] === G.AvailQuibble[1] || taken(G.AvailQuibble[1]));
      do G.AvailQuibble[2] = Int(16 * Rnd());
      while (G.AvailQuibble[0] === G.AvailQuibble[2] || G.AvailQuibble[1] === G.AvailQuibble[2] ||
        taken(G.AvailQuibble[2]));
    }

    for (G.I = 0; G.I <= 2; G.I++) {
      const q = G.RQuibble[G.I];
      G.RName[G.I] = G.QName[q];
      G.RSponsor[G.I] = G.QSponsor[q];
      G.RSpeed[G.I] = G.QSpeed[q];
      G.RWinPct[G.I] = cint(Int(100 * (G.QWins[q] / G.QRaces[q])));
      G.RBetCount[G.I] = 0;
      G.RBetTotal[G.I] = 0;
      G.RSteroids[G.I] = 0;
      G.RSteroidsBy[G.I] = 0;
      G.RWeights[G.I] = 0;
      G.RWeightsBy[G.I] = 0;
      G.RPoison[G.I] = 0;
      G.RPoisonBy[G.I] = 0;
      G.RGuard[G.I] = 0;
      G.RGuardBy[G.I] = 0;
      G.RDrug[G.I] = 0;
      G.RDrugBy[G.I] = 0;
      G.RConfused[G.I] = 0;
      G.RCripple[G.I] = 0;
      G.RCrippleBy[G.I] = 0;
      G.RTrain[G.I] = 0;
      G.RTrainBy[G.I] = 0;
      G.RRunning[G.I] = 1;
      G.RDir[G.I] = 1;
      this.lblQname[G.I].Caption = G.RName[G.I];
      this.lblWin[G.I].Caption = "Win %:  " + Str(G.RWinPct[G.I]);
      this.lblRaces[G.I].Caption = "Races:  " + Str(G.QRaces[q]);
      if (G.RSponsor[G.I] !== "") this.lblSponsor[G.I].Caption = G.RSponsor[G.I];
      else this.lblSponsor[G.I].Caption = "";
      G.AvailOpen[G.I] = 1;
    }

    // Seed the betting pools.
    const seed = (r: number) => {
      G.RBetCount[r] = G.RBetCount[r] + 1;
      G.RBetTotal[r] = cint(G.RBetTotal[r] + Int(20 * Rnd()) + 90);
    };
    G.RandRacer = Int(3 * Rnd());
    seed(G.RandRacer);
    const sp = (r: number) => G.QSpeed[G.RQuibble[r]];
    if (sp(0) >= sp(1) && sp(0) >= sp(2)) G.T1 = 0;
    if (sp(1) >= sp(0) && sp(1) >= sp(2)) G.T1 = 1;
    if (sp(2) >= sp(0) && sp(2) >= sp(1)) G.T1 = 2;
    if (G.T1 !== 0 && (sp(0) >= sp(1) || sp(0) >= sp(2))) G.T2 = 0;
    if (G.T1 !== 1 && (sp(1) >= sp(0) || sp(1) >= sp(2))) G.T2 = 1;
    if (G.T1 !== 2 && (sp(2) >= sp(0) || sp(2) >= sp(1))) G.T2 = 2;
    for (G.I = 1; G.I <= 3; G.I++) seed(G.T1);
    seed(G.T2);
    const wp = G.RWinPct;
    if (wp[2] >= wp[0] && wp[2] >= wp[1]) G.T1 = 2;
    if (wp[1] >= wp[0] && wp[1] >= wp[2]) G.T1 = 1;
    if (wp[0] >= wp[1] && wp[0] >= wp[2]) G.T1 = 0;
    if (G.T1 !== 2 && (wp[2] >= wp[0] || wp[2] >= wp[1])) G.T2 = 2;
    if (G.T1 !== 1 && (wp[1] >= wp[0] || wp[1] >= wp[2])) G.T2 = 1;
    if (G.T1 !== 0 && (wp[0] >= wp[1] || wp[0] >= wp[2])) G.T2 = 0;
    for (G.I = 1; G.I <= 3; G.I++) seed(G.T1);
    seed(G.T2);
    for (G.I = 0; G.I <= 2; G.I++) seed(G.I);

    // Sponsors earn their racers' win %.
    for (G.I = 0; G.I <= 2; G.I++)
      for (G.J = 0; G.J <= 2; G.J++)
        if (G.QSponsor[G.RQuibble[G.I]] === G.PlayerName[G.J]) G.PlayerCash[G.J] = G.PlayerCash[G.J] + G.RWinPct[G.I];
  }

  Form_QueryUnload(_cancel: number, unloadMode: number) {
    if (unloadMode === 0) {
      quitAll(["frmAvailable", "frmInfo", "frmLoan", "frmOptions", "frmPlayer", "frmRetire", "frmSpecial",
        "frmSponsor", "frmStatus", "frmTarget", "frmTitle", "frmUpdate", "frmUpdate2", "frmWinners", "frmMain",
        "frmMenu"]);
      End();
    }
  }

  imgQuibble_Click(index: number) {
    if (index === 0) this.shpBox.Top = 720;
    if (index === 1) this.shpBox.Top = 2040;
    if (index === 2) this.shpBox.Top = 3360;
  }

  Timer1_Timer() {
    for (G.I = 0; G.I <= 2; G.I++) {
      if (this.flip) this.imgQuibble[G.I].Picture = this.imgSquat.Picture;
      else this.imgQuibble[G.I].Picture = this.imgJump.Picture;
    }
    this.flip = this.flip ? 0 : -1;
  }

  // The turn state machine: 0 = move to the next seat, 1 = start a human
  // turn, 2 = waiting for the human, 6 = all seats done (race).
  Timer2_Timer() {
    if (G.TurnState === 0 && G.CurPlayer < 3) {
      G.CurPlayer = G.CurPlayer + 1;
      if (G.CurPlayer === 3) {
        F.frmMenu.Hide();
        F.frmMenu.Unload();
        F.frmMain.Unload();
        F.frmUpdate.Unload();
        F.frmUpdate.Show();
        G.TurnState = 6;
      } else {
        if (G.PlayerType[G.CurPlayer] === 1) G.TurnState = 1;
        if (G.PlayerType[G.CurPlayer] === 2) this.computerTurn();
      }
    }
    if (G.TurnState === 1) {
      const c = G.PlayerCash, d = G.PlayerDebt;
      if ((G.GoalType === 1 && (c[0] - d[0] >= G.Goal || c[1] - d[1] >= G.Goal || c[2] - d[2] >= G.Goal)) ||
        (G.GoalType === 2 && G.Goal + 1 === G.Round) ||
        G.PlayerType[0] + G.PlayerType[1] + G.PlayerType[2] < 2) {
        c[0] = c[0] - d[0];
        c[1] = c[1] - d[1];
        c[2] = c[2] - d[2];
        F.frmMenu.Hide();
        F.frmWinners.Show();
      }
      this.lblPlayer.Caption = G.PlayerName[G.CurPlayer] + "'s turn.";
      this.lblCash.Caption = Str(G.PlayerCash[G.CurPlayer]);
      this.lblDebt.Caption = cstr(G.PlayerDebt[G.CurPlayer]);
      this.txtBet.Text = "0";
      G.TurnState = 2;
      this.shpBox.Top = 720;
      if (G.OptSpecial === 1) this.cmdSpecial.Enabled = true;
      if (G.OptSpecial === 0) this.cmdSpecial.Enabled = false;
      if (G.OptSponsor === 0) this.cmdSponsor.Enabled = false;
      if (G.OptInfo === 0) this.cmdInfo.Enabled = false;
      for (G.I = 0; G.I <= 2; G.I++) F.frmStatus.cmdTrain[G.I].Enabled = true;
    }
  }

  private computerTurn() {
    const p = G.CurPlayer;
    if (G.PlayerCash[p] < 100 + G.Round * 20) G.PlayerCash[p] = 100 + G.Round * 50;
    // Sponsor. (VB's Or/And evaluate every operand: Rnd is always drawn.)
    const r1 = Int(Rnd() * 3) === 1;
    if ((r1 || G.AISponsorCount[p] === 0) && G.NoneForSale === 0) {
      this.RefreshAvailable();
      G.K = Int(Rnd() * 3);
      if (G.PlayerCash[p] >= G.AvailPrice[G.K] && G.AvailOpen[G.K] === 1 && G.AISponsorCount[p] < 3) {
        G.PlayerCash[p] = G.PlayerCash[p] - G.AvailPrice[G.K];
        F.frmMenu.lblCash.Caption = Str(G.PlayerCash[p]);
        G.QSponsor[G.AvailQuibble[G.K]] = G.PlayerName[p];
        G.AvailOpen[G.K] = 0;
        G.AISponsorCount[p] = G.AISponsorCount[p] + 1;
      }
    }
    // Train.
    if (Int(Rnd() * 3) !== 1) {
      this.RefreshStatus();
      for (G.K = 0; G.K <= 2; G.K++) {
        if (G.StatusSlot[G.K] > -1) {
          G.SpecialCost = cint(Int(G.QSpeed[G.StatusSlot[G.K]] / 2));
          if (G.PlayerCash[p] >= G.SpecialCost) {
            G.PlayerCash[p] = G.PlayerCash[p] - G.SpecialCost;
            F.frmMenu.lblCash.Caption = Str(G.PlayerCash[p]);
            G.QSpeed[G.StatusSlot[G.K]] = G.QSpeed[G.StatusSlot[G.K]] + 5;
          }
        }
      }
    }
    // Bet on a racer drawn by bet count.
    G.T1 = G.RBetCount[0];
    G.T2 = G.RBetCount[0] + G.RBetCount[1];
    G.T3 = G.RBetCount[0] + G.RBetCount[1] + G.RBetCount[2];
    G.K = Int(Rnd() * G.T3) + 1;
    if (G.K <= G.T1) G.PlayerPick[p] = 0;
    if (G.K > G.T1 && G.K <= G.T2) G.PlayerPick[p] = 1;
    if (G.K > G.T2) G.PlayerPick[p] = 2;
    const pick = G.PlayerPick[p];
    G.PlayerBet[p] = Int((G.RBetCount[pick] / G.T3) * G.PlayerCash[p]);
    G.PlayerCash[p] = G.PlayerCash[p] - G.PlayerBet[p];
    G.RBetCount[pick] = G.RBetCount[pick] + 1;
    G.RBetTotal[pick] = cint(G.RBetTotal[pick] + G.PlayerBet[p]);
    G.PlayerPickName[p] = G.RName[pick];
    // Sabotage: s = 1..10; the rival is the fastest other racer.
    G.K = Int(Rnd() * 10) + 1;
    if (pick !== 0) G.T1 = 0;
    else G.T1 = 1;
    for (G.I = 0; G.I <= 2; G.I++) if (G.I !== pick && G.RSpeed[G.I] > G.RSpeed[G.T1]) G.T1 = G.I;
    const cash = G.PlayerCash[p];
    if (G.K === 1 && cash >= 50) {
      this.SetSteroids();
      this.ApplySpecial(pick);
    }
    if (G.K === 2 && G.PlayerCash[p] >= 25) {
      this.SetGuard();
      this.ApplySpecial(G.PlayerPick[p]);
    }
    if (G.K === 3 && G.PlayerCash[p] >= 30) {
      this.SetWeights();
      this.ApplySpecial(G.T1);
    }
    if (G.K === 4 && G.PlayerCash[p] >= 150) {
      this.SetPoison();
      this.ApplySpecial(G.T1);
    }
    if (G.K === 5 && G.PlayerCash[p] >= 20) {
      this.SetTrain();
      this.ApplySpecial(G.PlayerPick[p]);
    }
    if (G.K === 6 && G.PlayerCash[p] >= 35) {
      this.SetCripple();
      this.ApplySpecial(G.T1);
    }
    if (G.K === 7 && G.PlayerCash[p] >= 75) {
      this.SetDrug();
      this.ApplySpecial(G.T1);
    }
  }
}
