import { G } from "../state.ts";
import { F, quitAll } from "./registry.ts";
import { End, Image, notepad, VBForm } from "../vb/runtime.ts";
import { cint, vbInt as Int } from "../vb/conv.ts";
import { randomize as Randomize, rnd as Rnd } from "../vb/rnd.ts";
import { helpText, openNames } from "../data.ts";

export class FrmTitle extends VBForm {
  declare imgQuibble: Image;
  declare imgJump: Image;
  declare imgSquat: Image;
  private flip = 0; // Timer1_Timer's Static

  cmdStart_Click() {
    for (G.I = 0; G.I <= 2; G.I++) {
      G.PlayerCash[G.I] = G.StartCash;
      G.PlayerDebt[G.I] = 0;
    }
    F.frmTitle.Hide();
    F.frmTitle.Unload();
    F.frmPlayer.Show();
  }

  // HELP: the original runs Notepad on help.txt.
  Command1_Click() {
    G.ShellId = notepad("HELP.TXT", helpText);
  }

  Command2_Click() {
    F.frmOptions.Show();
  }

  Form_Load() {
    Randomize();
    G.GoalType = 2;
    G.Goal = 12;
    G.StartCash = 100;
    G.Interest = 25;
    G.RaceSpeed = 25;
    G.OptSpecial = 1;
    G.OptSpecialLimit = 1;
    G.OptInfo = 1;
    G.OptSponsor = 1;
    G.Round = 0;
    G.NoneForSale = 0;
    const lineInput = openNames();
    for (G.I = 0; G.I <= 15; G.I++) {
      G.QName[G.I] = lineInput();
      G.QAlive[G.I] = 1;
      G.QSpeed[G.I] = Int(40 * Rnd()) + 30;
      G.QRaces[G.I] = cint(Int(5 * Rnd()) + 3);
      G.QWins[G.I] = 0;
      G.QMaxSpeed[G.I] = cint(Int(10 * Rnd()) + 80);
      for (G.J = 1; G.J <= G.QRaces[G.I]; G.J++) {
        G.T1 = Int(40 * Rnd()) + 30;
        G.T2 = Int(40 * Rnd()) + 30;
        if (G.QSpeed[G.I] > G.T1 && G.QSpeed[G.I] > G.T2) G.QWins[G.I] = G.QWins[G.I] + 1;
      }
    }
  }

  Form_QueryUnload(_cancel: number, unloadMode: number) {
    if (unloadMode === 0) {
      quitAll(["frmAvailable", "frmInfo", "frmLoan", "frmOptions", "frmPlayer", "frmRetire", "frmSpecial",
        "frmSponsor", "frmStatus", "frmTarget", "frmUpdate", "frmUpdate2", "frmWinners", "frmMain", "frmMenu",
        "frmTitle"]);
      End();
    }
  }

  Timer1_Timer() {
    this.imgQuibble.Left = this.imgQuibble.Left + 50;
    if (this.imgQuibble.Left >= 5520) this.imgQuibble.Left = -720;
    if (this.flip) this.imgQuibble.Picture = this.imgSquat.Picture;
    else this.imgQuibble.Picture = this.imgJump.Picture;
    this.flip = this.flip ? 0 : -1;
  }
}
