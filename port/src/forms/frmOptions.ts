import { G } from "../state.ts";
import { F } from "./registry.ts";
import { CheckBox, Label, OptionButton, TextBox, VBForm } from "../vb/runtime.ts";
import { cint, str as Str, val as Val } from "../vb/conv.ts";

export class FrmOptions extends VBForm {
  declare optCash: OptionButton;
  declare optRound: OptionButton;
  declare lblType: Label;
  declare txtGoal: TextBox;
  declare txtStart: TextBox;
  declare txtInterest: TextBox;
  declare txtSpeed: TextBox;
  declare chkSpecial: CheckBox;
  declare chkSpecialLimit: CheckBox;
  declare chkInfo: CheckBox;
  declare chkSponsor: CheckBox;

  cmdDone_Click() {
    if (this.optCash.Value === -1) G.GoalType = 1;
    if (this.optRound.Value === -1) G.GoalType = 2;
    G.Goal = Val(this.txtGoal.Text);
    G.StartCash = Val(this.txtStart.Text);
    G.Interest = cint(Val(this.txtInterest.Text));
    G.RaceSpeed = Val(this.txtSpeed.Text);
    G.OptSpecial = this.chkSpecial.Value;
    G.OptSpecialLimit = this.chkSpecialLimit.Value;
    G.OptInfo = cint(this.chkInfo.Value);
    G.OptSponsor = this.chkSponsor.Value;
    F.frmOptions.Hide();
  }

  Form_Load() {
    if (G.GoalType === 1) {
      this.optCash.Value = 1;
      this.optRound.Value = 0;
    }
    if (G.GoalType === 2) {
      this.optCash.Value = 0;
      this.optRound.Value = 1;
    }
    this.txtGoal.Text = Str(G.Goal);
    this.txtStart.Text = Str(G.StartCash);
    this.txtInterest.Text = Str(G.Interest);
    this.txtSpeed.Text = Str(G.RaceSpeed);
    this.chkSpecial.Value = G.OptSpecial;
    this.chkSpecialLimit.Value = G.OptSpecialLimit;
    this.chkInfo.Value = G.OptInfo;
    this.chkSponsor.Value = G.OptSponsor;
  }

  optCash_Click() {
    this.lblType.Caption = "Goal:";
    this.txtGoal.Text = "1000";
  }

  optRound_Click() {
    this.lblType.Caption = "Rounds:";
    this.txtGoal.Text = "12";
  }
}
