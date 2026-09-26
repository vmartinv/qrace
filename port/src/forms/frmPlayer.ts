import { G } from "../state.ts";
import { F, quitAll } from "./registry.ts";
import { CommandButton, End, Image, Label, TextBox, VBForm } from "../vb/runtime.ts";

export class FrmPlayer extends VBForm {
  declare lblPlayer: Label;
  declare imgPlayer: Image;
  declare imgP: Image[];
  declare txtName: TextBox;
  declare cmdHuman: CommandButton;
  declare cmdCom: CommandButton;
  declare cmdDone: CommandButton;

  cmdCom_Click() {
    G.PlayerType[G.I] = 2;
    if (G.I === 0) G.PlayerName[G.I] = "Player One";
    if (G.I === 1) G.PlayerName[G.I] = "Player Two";
    if (G.I === 2) G.PlayerName[G.I] = "Player Three";
    G.I = G.I + 1;
    if (G.I === 1) this.lblPlayer.Caption = "Player Two";
    if (G.I === 2) this.lblPlayer.Caption = "Player Three";
    if (G.I === 3) {
      F.frmPlayer.Hide();
      F.frmPlayer.Unload();
      F.frmMenu.Show();
    }
    if (G.I < 3) this.imgPlayer.Picture = this.imgP[G.I].Picture;
  }

  cmdDone_Click() {
    G.PlayerName[G.I] = this.txtName.Text;
    G.I = G.I + 1;
    if (G.I === 1) this.lblPlayer.Caption = "Player Two";
    if (G.I === 2) this.lblPlayer.Caption = "Player Three";
    if (G.I === 3) {
      F.frmPlayer.Hide();
      F.frmPlayer.Unload();
      F.frmMenu.Show();
    }
    if (G.I < 3) this.imgPlayer.Picture = this.imgP[G.I].Picture;
    // After the last seat these reload the (hidden) form, as in the original.
    this.cmdHuman.Enabled = true;
    this.cmdCom.Enabled = true;
    this.txtName.Visible = false;
    this.cmdDone.Visible = false;
  }

  cmdHuman_Click() {
    G.PlayerType[G.I] = 1;
    this.cmdHuman.Enabled = false;
    this.cmdCom.Enabled = false;
    this.txtName.Visible = true;
    this.txtName.Text = "Enter Name";
    this.cmdDone.Visible = true;
    this.txtName.SetFocus();
  }

  Form_Load() {
    G.I = 0;
  }

  Form_QueryUnload(_cancel: number, unloadMode: number) {
    if (unloadMode === 0) {
      quitAll(["frmAvailable", "frmInfo", "frmLoan", "frmMenu", "frmOptions", "frmRetire", "frmSpecial",
        "frmSponsor", "frmStatus", "frmTarget", "frmTitle", "frmUpdate", "frmUpdate2", "frmWinners", "frmMain",
        "frmPlayer"]);
      End();
    }
  }
}
