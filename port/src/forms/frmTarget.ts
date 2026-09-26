import { G } from "../state.ts";
import { F } from "./registry.ts";
import { CommandButton, VBForm } from "../vb/runtime.ts";
import { cint, str as Str, vbInt as Int } from "../vb/conv.ts";
import { rnd as Rnd } from "../vb/rnd.ts";

export class FrmTarget extends VBForm {
  declare cmdQuibble: CommandButton[];
  declare cmdCancel: CommandButton;

  cmdCancel_Click() {
    F.frmTarget.Hide();
    F.frmSpecial.Show();
  }

  cmdQuibble_Click(index: number) {
    const p = G.CurPlayer;
    G.PlayerCash[p] = G.PlayerCash[p] - G.SpecialCost;
    F.frmMenu.lblCash.Caption = Str(G.PlayerCash[p]);
    F.frmLoan.lblCash.Caption = Str(G.PlayerCash[p]);
    if (G.SpecialKind === "steroids") {
      G.RSteroids[index] = 1;
      G.RSteroidsBy[index] = p;
    }
    if (G.SpecialKind === "weights") {
      G.RWeights[index] = 1;
      G.RWeightsBy[index] = cint(p);
    }
    if (G.SpecialKind === "poison") {
      G.RPoison[index] = 1;
      G.RPoisonBy[index] = p;
    }
    if (G.SpecialKind === "train") {
      G.RTrain[index] = 1;
      G.RTrainBy[index] = p;
    }
    if (G.SpecialKind === "cripple") {
      G.RCripple[index] = 1;
      G.RCrippleBy[index] = cint(p);
    }
    if (G.SpecialKind === "drug") {
      G.RDrug[index] = 1;
      G.RDrugBy[index] = p;
    }
    // (VB's And evaluates every operand: Rnd is drawn whatever the kind.)
    const caught = Int(Rnd() * 5) !== 1;
    if (G.SpecialKind === "guard" && caught) {
      G.RGuard[index] = 1;
      G.RGuardBy[index] = cint(p);
    }
    if (G.OptSpecialLimit === 1) F.frmMenu.cmdSpecial.Enabled = false;
    F.frmTarget.Hide();
  }

  Form_Activate() {
    for (G.I = 0; G.I <= 2; G.I++) this.cmdQuibble[G.I].Caption = G.RName[G.I];
    this.cmdCancel.SetFocus();
  }
}
