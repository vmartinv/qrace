import { G } from "../state.ts";
import { F, quitAll } from "./registry.ts";
import { End, Label, VBForm } from "../vb/runtime.ts";
import { cint } from "../vb/conv.ts";

// The pre-race news: each racer's pending specials take effect, one
// message at a time (OK continues).
export class FrmUpdate extends VBForm {
  declare lblText: Label;

  cmdOK_Click() {
    G.UpdateBusy = 0;
  }

  Form_Load() {
    G.J = 0;
    G.UpdateBusy = 0;
  }

  Form_QueryUnload(_cancel: number, unloadMode: number) {
    if (unloadMode === 0) {
      quitAll(["frmAvailable", "frmInfo", "frmLoan", "frmOptions", "frmPlayer", "frmRetire", "frmSpecial",
        "frmSponsor", "frmStatus", "frmTarget", "frmUpdate2", "frmWinners", "frmMain", "frmMenu", "frmTitle",
        "frmUpdate"]);
      End();
    }
  }

  // A fine: the shortfall below 0 goes into the player's debt.
  private fine(by: number, amount: number, debtFrom = by) {
    G.PlayerCash[by] = G.PlayerCash[by] - amount;
    if (G.PlayerCash[by] < 0) {
      G.PlayerDebt[by] = G.PlayerDebt[debtFrom] + Math.abs(G.PlayerCash[by]);
      G.PlayerCash[by] = 0;
    }
  }

  Timer1_Timer() {
    if (G.J === 3 && G.UpdateBusy === 0) {
      G.UpdateBusy = 1;
      F.frmUpdate.Hide();
      F.frmUpdate.Unload();
      F.frmMain.Show();
      F.frmUpdate.Unload();
    }
    if (G.UpdateBusy !== 0) return;
    const r = G.J, name = G.RName[r], guarded = G.RGuard[r] === 1;
    const say = (t: string) => (this.lblText.Caption = t);
    if (G.RSteroids[r] === 1 && !guarded) {
      say(name + " has undergone a massive increase in size and stength.");
      G.RSpeed[r] = G.RSpeed[r] + 10;
      G.UpdateBusy = 1;
      G.RSteroids[r] = 0;
    }
    if (G.UpdateBusy === 1) return;
    if (G.RSteroids[r] === 1 && guarded) {
      say(G.PlayerName[G.RSteroidsBy[r]] + " has been apprehended attempting to slip steroids into " + name +
        "'s food, and has been fined $25.");
      // Original bug, kept: the debt base is read from seat RSteroids(r) (= 1).
      this.fine(G.RSteroidsBy[r], 25, G.RSteroids[r]);
      G.UpdateBusy = 1;
      G.RSteroids[r] = 0;
    }
    if (G.UpdateBusy === 1) return;
    if (G.RWeights[r] === 1 && !guarded) {
      say("Large ankle weights have been fastened to " + name + "'s feet.");
      G.RSpeed[r] = G.RSpeed[r] - 10;
      G.UpdateBusy = 1;
      G.RWeights[r] = 0;
    }
    if (G.UpdateBusy === 1) return;
    if (G.RWeights[r] === 1 && guarded) {
      say(G.PlayerName[G.RWeightsBy[r]] + " has been apprehended attempting to fasten ankle weights on " + name +
        "'s legs, and has been fined $25.");
      this.fine(G.RWeightsBy[r], 25);
      G.UpdateBusy = 1;
      G.RWeights[r] = 0;
    }
    if (G.UpdateBusy === 1) return;
    if (G.RDrug[r] === 1 && !guarded) {
      say(name + " has been acting agitated and confused lately.");
      G.UpdateBusy = 1;
      G.RDrug[r] = 0;
      G.RConfused[r] = 1;
    }
    if (G.UpdateBusy === 1) return;
    if (G.RDrug[r] === 1 && guarded) {
      say(G.PlayerName[G.RDrugBy[r]] + " has been apprehended attempting to drug " + name +
        ", and has been fined $25.");
      this.fine(G.RDrugBy[r], 25);
      G.UpdateBusy = 1;
      G.RDrug[r] = 0;
    }
    if (G.UpdateBusy === 1) return;
    if (G.RCripple[r] === 1 && !guarded) {
      say(name + " has been permanently injured by an unknown assailant.");
      G.RSpeed[r] = G.RSpeed[r] - 10;
      G.QSpeed[G.RQuibble[r]] = G.QSpeed[G.RQuibble[r]] - 10;
      G.QMaxSpeed[G.RQuibble[r]] = cint(G.QMaxSpeed[G.RQuibble[r]] - 10);
      G.UpdateBusy = 1;
      G.RCripple[r] = 0;
    }
    if (G.UpdateBusy === 1) return;
    if (G.RCripple[r] === 1 && guarded) {
      say(G.PlayerName[G.RCrippleBy[r]] + " has been apprehended attempting to injure " + name +
        ", and has been fined $50.");
      this.fine(G.RCrippleBy[r], 50);
      G.UpdateBusy = 1;
      G.RCripple[r] = 0;
    }
    if (G.UpdateBusy === 1) return;
    if (G.RTrain[r] === 1) {
      say("Thanks to an anonymous grant, " + name +
        " has been put through extensive training and should be in prime condition to enter the race.");
      G.RSpeed[r] = G.RSpeed[r] + 5;
      G.QSpeed[G.RQuibble[r]] = G.QSpeed[G.RQuibble[r]] + 5;
      G.UpdateBusy = 1;
      G.RTrain[r] = 0;
    }
    if (G.UpdateBusy === 1) return;
    if (G.RPoison[r] === 1 && !guarded) {
      say(name + " has died of unknown causes.");
      G.RRunning[r] = 0;
      G.QAlive[G.RQuibble[r]] = 0;
      G.QSponsor[G.RQuibble[r]] = "";
      G.UpdateBusy = 1;
      G.RPoison[r] = 0;
    }
    if (G.UpdateBusy === 1) return;
    if (G.RPoison[r] === 1 && guarded) {
      say(G.PlayerName[G.RPoisonBy[r]] + " has been apprehended attempting to poison " + name +
        ", and has been fined $75.");
      this.fine(G.RPoisonBy[r], 75);
      G.UpdateBusy = 1;
      G.RPoison[r] = 0;
    }
    if (G.UpdateBusy === 1) return;
    G.J = G.J + 1;
  }
}
