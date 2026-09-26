import { G } from "../state.ts";
import { F } from "./registry.ts";
import { Label, VBForm } from "../vb/runtime.ts";
import { str as Str } from "../vb/conv.ts";

export class FrmInfo extends VBForm {
  declare lblLine: Label[];
  declare lblText: Label;

  // Bets placed so far.
  cmdBet_Click() {
    if (G.PlayerCash[G.CurPlayer] < 10) {
      this.lblText.Caption = "You can't afford that.";
    } else {
      this.lblText.Caption = "";
      for (G.I = 0; G.I <= 2; G.I++) {
        this.lblLine[G.I].Visible = true;
        this.lblLine[G.I].Caption = G.RName[G.I] + ":  " + Str(G.RBetCount[G.I]) + " bets, totalling $" +
          Str(G.RBetTotal[G.I]) + ".";
      }
      G.PlayerCash[G.CurPlayer] = G.PlayerCash[G.CurPlayer] - 10;
      F.frmMenu.lblCash.Caption = G.PlayerCash[G.CurPlayer];
    }
  }

  cmdQuit_Click() {
    for (G.I = 0; G.I <= 2; G.I++) this.lblLine[G.I].Visible = false;
    this.lblText.Caption = "So it's information you want, eh?  Well you've come to the right man.  I can provide you " +
      "with inside information on the race, but it won't be cheap.  What're you looking for?";
    F.frmInfo.Hide();
  }

  // Speed ranking.
  cmdRank_Click() {
    for (G.I = 0; G.I <= 2; G.I++) this.lblLine[G.I].Visible = false;
    if (G.PlayerCash[G.CurPlayer] < 10) {
      this.lblText.Caption = "You can't afford that.";
    } else {
      G.PlayerCash[G.CurPlayer] = G.PlayerCash[G.CurPlayer] - 10;
      F.frmMenu.lblCash.Caption = G.PlayerCash[G.CurPlayer];
      const sp = (r: number) => G.QSpeed[G.RQuibble[r]];
      if (sp(0) >= sp(1) && sp(0) >= sp(2)) G.T1 = 0;
      if (sp(1) >= sp(0) && sp(1) >= sp(2)) G.T1 = 1;
      if (sp(2) >= sp(0) && sp(2) >= sp(1)) G.T1 = 2;
      if (G.T1 !== 0 && (sp(0) >= sp(1) || sp(0) >= sp(2))) G.T2 = 0;
      if (G.T1 !== 1 && (sp(1) >= sp(0) || sp(1) >= sp(2))) G.T2 = 1;
      if (G.T1 !== 2 && (sp(2) >= sp(0) || sp(2) >= sp(1))) G.T2 = 2;
      if (G.T1 !== 0 && G.T2 !== 0) G.T3 = 0;
      if (G.T1 !== 1 && G.T2 !== 1) G.T3 = 1;
      if (G.T1 !== 2 && G.T2 !== 2) G.T3 = 2;
      this.lblText.Caption = "A safe bet is " + G.RName[G.T1] + ".  Likely second place is " + G.RName[G.T2] +
        ".  If your willing to take a risk, go with " + G.RName[G.T3] + ", but don't say I didn't warn you.";
    }
  }
}
