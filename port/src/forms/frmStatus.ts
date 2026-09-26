import { G } from "../state.ts";
import { F } from "./registry.ts";
import { CommandButton, Image, Label, msgBox, TextBox, VBForm } from "../vb/runtime.ts";
import { cint, cstr, str as Str, vbInt as Int } from "../vb/conv.ts";

export class FrmStatus extends VBForm {
  declare txtName: TextBox[];
  declare cmdTrain: CommandButton[];
  declare lblNotice: Label;
  declare imgQuibble: Image[];
  declare lblWin: Label[];
  declare lblRaces: Label[];
  declare lblSpeed: Label[];

  // Keeps the (possibly renamed) names.
  cmdExit_Click() {
    for (G.I = 0; G.I <= 2; G.I++) if (G.StatusSlot[G.I] > -1) G.QName[G.StatusSlot[G.I]] = this.txtName[G.I].Text;
    F.frmStatus.Hide();
    F.frmSponsor.Show();
  }

  cmdTrain_Click(index: number) {
    const p = G.CurPlayer, q = G.StatusSlot[index];
    G.SpecialCost = cint(Int(G.QSpeed[q] / 2));
    if (G.PlayerCash[p] < G.SpecialCost) {
      if (G.PlayerType[p] === 1) msgBox("You can't afford that.");
    } else {
      G.PlayerCash[p] = G.PlayerCash[p] - G.SpecialCost;
      F.frmMenu.lblCash.Caption = Str(G.PlayerCash[p]);
      G.QSpeed[q] = G.QSpeed[q] + 5;
      this.lblSpeed[index].Caption = "Speed:  " + Str(G.QSpeed[q]);
      this.cmdTrain[index].Enabled = false;
    }
  }

  Form_Activate() {
    for (G.I = 0; G.I <= 2; G.I++) {
      G.StatusSlot[G.I] = -1;
      this.lblNotice.Visible = true;
      this.imgQuibble[G.I].Visible = false;
      this.txtName[G.I].Visible = false;
      this.lblWin[G.I].Visible = false;
      this.lblRaces[G.I].Visible = false;
      this.lblSpeed[G.I].Visible = false;
      this.cmdTrain[G.I].Visible = false;
    }
    for (G.I = 0; G.I <= 15; G.I++) {
      if (G.QSponsor[G.I] === G.PlayerName[G.CurPlayer] && G.QAlive[G.I] !== 0) {
        const fill = (s: number) => {
          this.lblNotice.Visible = false;
          this.imgQuibble[s].Visible = true;
          this.txtName[s].Visible = true;
          this.txtName[s].Text = G.QName[G.I];
          this.lblWin[s].Visible = true;
          this.lblWin[s].Caption = "Win %:  " + Str(Int(100 * (G.QWins[G.I] / G.QRaces[G.I])));
          this.lblRaces[s].Visible = true;
          this.lblRaces[s].Caption = "Races:  " + Str(G.QRaces[G.I]);
          this.lblSpeed[s].Visible = true;
          this.lblSpeed[s].Caption = "Speed:  " + Str(G.QSpeed[G.I]);
          this.cmdTrain[s].Visible = true;
          if (G.QSpeed[G.I] >= G.QMaxSpeed[G.I]) this.cmdTrain[s].Visible = false;
          this.cmdTrain[s].Caption = "Train $" + cstr(Int(G.QSpeed[G.I] / 2));
          G.StatusSlot[s] = cint(G.I);
        };
        if (G.StatusSlot[0] < 0) fill(0);
        if (G.StatusSlot[1] < 0 && G.StatusSlot[0] !== G.I) fill(1);
        if (G.StatusSlot[2] < 0 && G.StatusSlot[0] !== G.I && G.StatusSlot[1] !== G.I) fill(2);
      }
    }
  }

  // Never called in the original (AITrainPending is never set).
  AITrain() {
    if (G.AITrainPending === 1 && G.PlayerType[G.CurPlayer] === 2) {
      this.Form_Activate();
      for (G.M = 0; G.M <= 2; G.M++)
        if (this.cmdTrain[G.M].Visible && this.cmdTrain[G.M].Enabled) this.cmdTrain_Click(G.M);
      G.AITrainPending = 0;
    }
  }
}
