import { G } from "../state.ts";
import { F } from "./registry.ts";
import { CommandButton, msgBox, VBForm } from "../vb/runtime.ts";

export class FrmSpecial extends VBForm {
  declare cmdQuit: CommandButton;

  private buy(kind: string, cost: number) {
    if (G.PlayerCash[G.CurPlayer] < cost) {
      msgBox("You don't have enough money.");
    } else {
      G.SpecialKind = kind;
      G.SpecialCost = cost;
      F.frmTarget.Show();
      F.frmSpecial.Hide();
    }
  }

  cmdCripple_Click() { this.buy("cripple", 35); }
  cmdDrug_Click() { this.buy("drug", 75); }
  cmdGuard_Click() { this.buy("guard", 25); }
  cmdPoison_Click() { this.buy("poison", 150); }
  cmdSteroids_Click() { this.buy("steroids", 50); }
  cmdTrain_Click() { this.buy("train", 20); }
  cmdWeights_Click() { this.buy("weights", 30); }

  cmdQuit_Click() {
    F.frmSpecial.Hide();
  }
}
