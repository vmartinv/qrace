import { G } from "../state.ts";
import { F, quitAll } from "./registry.ts";
import { End, Label, VBForm } from "../vb/runtime.ts";
import { str as Str } from "../vb/conv.ts";

export class FrmWinners extends VBForm {
  declare lblWinner: Label;
  declare lblRank: Label[];
  declare lblCash: Label[];

  cmdOK_Click() {
    F.frmMenu.Unload();
    F.frmWinners.Unload();
    End();
  }

  Form_Load() {
    const c = G.PlayerCash;
    G.T1 = 0;
    G.T2 = 0;
    G.T3 = 0;
    if (c[0] >= c[1] && c[0] >= c[2]) G.T1 = 0;
    if (c[1] >= c[0] && c[1] >= c[2]) G.T1 = 1;
    if (c[2] >= c[0] && c[2] >= c[1]) G.T1 = 2;
    if (G.T1 !== 0 && (c[0] >= c[1] || c[0] >= c[2])) G.T2 = 0;
    if (G.T1 !== 1 && (c[1] >= c[0] || c[1] >= c[2])) G.T2 = 1;
    if (G.T1 !== 2 && (c[2] >= c[0] || c[2] >= c[1])) G.T2 = 2;
    if (G.T1 !== 0 && G.T2 !== 0) G.T3 = 0;
    if (G.T1 !== 1 && G.T2 !== 1) G.T3 = 1;
    if (G.T1 !== 2 && G.T2 !== 2) G.T3 = 2;
    this.lblWinner.Caption = G.PlayerName[G.T1] + " Has Won the Game!";
    for (G.I = 0; G.I <= 2; G.I++) {
      this.lblCash[G.I].Caption = "$" + Str(c[G.I]);
      if (G.T1 === G.I) this.lblRank[G.I].Caption = "#1";
      if (G.T2 === G.I) this.lblRank[G.I].Caption = "#2";
      if (G.T3 === G.I) this.lblRank[G.I].Caption = "#3";
    }
  }

  Form_QueryUnload(_cancel: number, unloadMode: number) {
    if (unloadMode === 0) {
      quitAll(["frmAvailable", "frmInfo", "frmLoan", "frmOptions", "frmPlayer", "frmRetire", "frmSpecial",
        "frmSponsor", "frmStatus", "frmTarget", "frmUpdate2", "frmMain", "frmMenu", "frmTitle", "frmUpdate",
        "frmWinners"]);
      End();
    }
  }
}
