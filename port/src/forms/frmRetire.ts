import { G } from "../state.ts";
import { F } from "./registry.ts";
import { VBForm } from "../vb/runtime.ts";

export class FrmRetire extends VBForm {
  cmdNo_Click() {
    F.frmRetire.Hide();
  }

  cmdYes_Click() {
    G.PlayerType[G.CurPlayer] = 0;
    G.TurnState = 0;
    G.PlayerBet[G.CurPlayer] = 0;
    F.frmRetire.Hide();
  }
}
