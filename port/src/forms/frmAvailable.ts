import { G } from "../state.ts";
import { F } from "./registry.ts";
import { CommandButton, Image, Label, msgBox, VBForm } from "../vb/runtime.ts";
import { cint, str as Str, vbInt as Int } from "../vb/conv.ts";
import { rnd as Rnd } from "../vb/rnd.ts";

export class FrmAvailable extends VBForm {
  declare cmdSponsor: CommandButton[];
  declare lblPrice: Label[];
  declare lblRaces: Label[];
  declare lblWin: Label[];
  declare lblQname: Label[];
  declare imgQuibble: Image[];

  cmdExit_Click() {
    F.frmAvailable.Hide();
    F.frmSponsor.Show();
  }

  cmdSponsor_Click(index: number) {
    const p = G.CurPlayer;
    if (G.PlayerCash[p] < G.AvailPrice[index]) {
      msgBox("You can't afford that.");
    } else {
      G.PlayerCash[p] = G.PlayerCash[p] - G.AvailPrice[index];
      F.frmMenu.lblCash.Caption = Str(G.PlayerCash[p]);
      G.QSponsor[G.AvailQuibble[index]] = G.PlayerName[p];
      this.imgQuibble[index].Visible = false;
      this.lblQname[index].Visible = false;
      this.lblWin[index].Visible = false;
      this.lblRaces[index].Visible = false;
      this.lblPrice[index].Visible = false;
      this.cmdSponsor[index].Visible = false;
      G.AvailOpen[index] = 0;
      F.frmAvailable.Hide();
      F.frmStatus.Show();
    }
  }

  Form_Activate() {
    for (G.I = 0; G.I <= 2; G.I++) {
      const show = G.AvailOpen[G.I] !== 0;
      this.imgQuibble[G.I].Visible = show;
      this.lblQname[G.I].Visible = show;
      this.lblWin[G.I].Visible = show;
      this.lblRaces[G.I].Visible = show;
      this.lblPrice[G.I].Visible = show;
      this.cmdSponsor[G.I].Visible = show;
      const q = G.AvailQuibble[G.I];
      this.lblQname[G.I].Caption = G.QName[q];
      this.lblWin[G.I].Caption = "Win %:  " + Str(Int((G.QWins[q] / G.QRaces[q]) * 100));
      this.lblRaces[G.I].Caption = "Races:  " + Str(G.QRaces[q]);
      G.AvailPrice[G.I] = Int((G.QWins[q] / G.QRaces[q]) * 100) + G.QSpeed[q];
      this.lblPrice[G.I].Caption = "Price:  $" + Str(G.AvailPrice[G.I]);
    }
  }

  // Never called in the original (AISponsorPending is never set).
  AISponsor() {
    if (G.AISponsorPending === 1 && G.PlayerType[G.CurPlayer] === 2) {
      this.Form_Activate();
      G.AISponsorPick = Int(3 * Rnd());
      if (G.PlayerCash[G.CurPlayer] >= G.AvailPrice[G.AISponsorPick] && this.cmdSponsor[G.AISponsorPick].Visible)
        this.cmdSponsor_Click(cint(G.AISponsorPick));
      G.AISponsorPending = 0;
    }
  }
}
