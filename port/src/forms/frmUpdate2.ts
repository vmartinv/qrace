import { G } from "../state.ts";
import { F } from "./registry.ts";
import { Label, VBForm } from "../vb/runtime.ts";
import { str as Str } from "../vb/conv.ts";

// After the race: each player's result, sponsor bonuses, retirements.
export class FrmUpdate2 extends VBForm {
  declare lblBonus: Label[];
  declare lblText: Label;

  cmdOK_Click() {
    G.BonusBusy = 0;
  }

  Form_Load() {
    G.BonusStep = 0;
    G.BonusBusy = 0;
  }

  private hideBonus() {
    this.lblBonus[0].Visible = false;
    this.lblBonus[1].Visible = false;
    this.lblBonus[2].Visible = false;
  }

  Timer1_Timer() {
    if (G.BonusStep === 9 && G.BonusBusy === 0) {
      G.BonusBusy = 1;
      F.frmMenu.Unload();
      F.frmUpdate2.Hide();
      F.frmMain.Hide();
      F.frmUpdate2.Unload();
      F.frmMain.Unload();
      F.frmMenu.Show();
    }
    if (G.BonusBusy !== 0) return;
    if (G.BonusStep > 2 && G.BonusStep < 6) {
      const p = G.BonusStep - 3;
      if (G.RSponsor[G.Winner] === G.PlayerName[p]) {
        this.hideBonus();
        this.lblText.Visible = true;
        this.lblText.Caption = G.RName[G.Winner] + " earns " + G.PlayerName[p] + " a $100 sponsoring bonus.";
        G.PlayerCash[p] = G.PlayerCash[p] + 100;
        G.BonusBusy = 1;
      }
      G.BonusStep = G.BonusStep + 1;
    }
    if (G.BonusStep > 5) {
      const r = G.BonusStep - 6;
      const alive = G.QAlive.reduce((a, b) => a + b, 0);
      // Original bug, kept: QRaces is indexed by the racer slot, not its quibble.
      if (G.RWinPct[r] <= 15 && G.QRaces[r] >= 8 && alive > 10 && G.Winner !== r) {
        this.hideBonus();
        this.lblText.Caption = G.RName[r] + " has been retired due to repeatedly poor performance.";
        G.QAlive[G.RQuibble[r]] = 0;
        G.QSponsor[G.RQuibble[r]] = "";
        G.BonusBusy = 1;
      }
      G.BonusStep = G.BonusStep + 1;
    }
    if (G.BonusStep < 3) {
      const p = G.BonusStep;
      this.lblBonus[0].Visible = true;
      this.lblBonus[1].Visible = true;
      this.lblBonus[2].Visible = true;
      if (G.PlayerPick[p] === G.Winner) this.lblBonus[p].Caption = G.PlayerName[p] + " won $" + Str(G.PlayerWinnings[p]);
      if (G.PlayerPick[p] !== G.Winner) this.lblBonus[p].Caption = G.PlayerName[p] + " lost $" + Str(G.PlayerBet[p]);
      if (G.BonusStep === 2) G.BonusBusy = 1;
      G.BonusStep = G.BonusStep + 1;
    }
  }
}
