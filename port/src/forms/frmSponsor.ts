import { G } from "../state.ts";
import { F } from "./registry.ts";
import { CommandButton, VBForm } from "../vb/runtime.ts";

export class FrmSponsor extends VBForm {
  declare Command1: CommandButton;

  cmdExit_Click() {
    F.frmSponsor.Hide();
    F.frmMenu.Show();
  }

  // Sponsor a new quibble.
  Command1_Click() {
    F.frmAvailable.Show();
    F.frmSponsor.Hide();
  }

  // Currently sponsored.
  Command2_Click() {
    F.frmSponsor.Hide();
    F.frmStatus.Show();
  }

  Form_Activate() {
    G.Count = 0;
    for (G.I = 0; G.I <= 15; G.I++) if (G.QSponsor[G.I] === G.PlayerName[G.CurPlayer]) G.Count = G.Count + 1;
    if (G.Count >= 3 || G.NoneForSale === 1) this.Command1.Enabled = false;
    else this.Command1.Enabled = true;
  }
}
