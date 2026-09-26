import { G } from "../state.ts";
import { F, quitAll } from "./registry.ts";
import { End, Image, Label, Timer, VBForm } from "../vb/runtime.ts";
import { cint, str as Str, vbInt as Int } from "../vb/conv.ts";
import { randomize as Randomize, rnd as Rnd } from "../vb/rnd.ts";
import { RaceView } from "../race/RaceScene.ts";

export class FrmMain extends VBForm {
  declare Timer2: Timer;
  declare lblKey: Label;
  declare lblMessage: Label;
  declare lblQuibble: Label[];
  declare lblPlayerName: Label[];
  declare lblBet: Label[];
  declare lblBetLabel: Label[];
  declare lblRacerName: Label[];
  declare lblPickLabel: Label[];
  declare imgP: Image[];
  declare imgQuibble: Image[];
  declare imgJump: Image;
  declare imgSquat: Image;
  private view: RaceView | null = null;

  constructor(layout: ConstructorParameters<typeof VBForm>[0]) {
    super(layout);
    this.imagesOnCanvas = true;
  }

  protected onLoaded() {
    this.view = new RaceView(this);
  }

  protected onUnloaded() {
    this.view?.destroy();
    this.view = null;
  }

  // Any click or key once the race is won pays out.
  private proceed() {
    if (G.RaceState === 2) G.RaceState = 3;
  }
  Form_Click() { this.proceed(); }
  Form_KeyDown() { this.proceed(); }
  Form_MouseDown() { this.proceed(); }
  imgP_Click() { this.proceed(); }
  imgQuibble_Click() { this.proceed(); }
  imgTrack1_Click() { this.proceed(); }
  imgTrack2_Click() { this.proceed(); }
  imgTrack3_Click() { this.proceed(); }
  lblBet_Click() { this.proceed(); }
  lblBetLabel_Click() { this.proceed(); }
  lblMessage_Click() { this.proceed(); }
  lblPickLabel_Click() { this.proceed(); }
  lblPlayerName_Click() { this.proceed(); }
  lblQuibble_Click() { this.proceed(); }
  lblRacerName_Click() { this.proceed(); }

  Form_Load() {
    F.frmUpdate.Unload();
    G.RaceState = 0;
    if (G.RaceSpeed >= 29) G.RaceSpeed = 29;
    this.Timer2.Interval = 30 - G.RaceSpeed;
    for (G.I = 0; G.I <= 2; G.I++) {
      if (G.PlayerType[G.I] === 0) {
        this.lblPlayerName[G.I].Visible = false;
        this.lblBet[G.I].Visible = false;
        this.lblBetLabel[G.I].Visible = false;
        this.lblRacerName[G.I].Visible = false;
        this.lblPickLabel[G.I].Visible = false;
        this.imgP[G.I].Visible = false;
      } else {
        this.lblPlayerName[G.I].Caption = G.PlayerName[G.I];
        this.lblBet[G.I].Caption = "$" + Str(G.PlayerBet[G.I]);
        this.lblRacerName[G.I].Caption = G.PlayerPickName[G.I];
      }
    }
    for (G.I = 0; G.I <= 2; G.I++) {
      this.lblQuibble[G.I].Caption = G.RName[G.I];
      G.RSpeed[G.I] = G.RSpeed[G.I] + 0;
      G.QRaces[G.RQuibble[G.I]] = cint(G.QRaces[G.RQuibble[G.I]] + 1);
      if (G.RRunning[G.I] === 0) this.imgQuibble[G.I].Visible = false;
      if (G.RRunning[G.I] === 0) this.lblQuibble[G.I].Visible = false;
    }
  }

  Form_QueryUnload(_cancel: number, unloadMode: number) {
    if (unloadMode === 0) {
      quitAll(["frmAvailable", "frmInfo", "frmLoan", "frmMenu", "frmOptions", "frmPlayer", "frmRetire", "frmSpecial",
        "frmSponsor", "frmStatus", "frmTarget", "frmTitle", "frmUpdate", "frmUpdate2", "frmWinners", "frmMain"]);
      End();
    }
  }

  // The countdown.
  Timer1_Timer() {
    if (this.lblMessage.Caption === "Get set...") {
      this.lblMessage.Caption = "Go!";
      G.RaceState = 1;
      this.lblQuibble[0].Visible = false;
      this.lblQuibble[1].Visible = false;
      this.lblQuibble[2].Visible = false;
    }
    if (this.lblMessage.Caption === "On your mark...") this.lblMessage.Caption = "Get set...";
    if (this.lblMessage.Caption === "") this.lblMessage.Caption = "On your mark...";
  }

  // The race tick, then the payout once a click/key confirms the win.
  Timer2_Timer() {
    Randomize();
    if (G.RaceState === 1) {
      for (G.I = 0; G.I <= 2; G.I++) {
        const i = G.I;
        if (Int(100 * Rnd()) + 1 < G.RSpeed[i]) {
          // VB's And evaluates every operand, so both Rnd draws always happen.
          const a = Int(5 * Rnd()) === 1;
          if (a && G.RConfused[i] === 1 && G.RDir[i] === 1) G.RDir[i] = -1;
          const b = Int(2 * Rnd()) === 1;
          if (b && G.RConfused[i] === 1 && G.RDir[i] === -1) G.RDir[i] = 1;
          this.imgQuibble[i].Left = this.imgQuibble[i].Left + 100 * G.RDir[i];
          if (this.imgQuibble[i].Picture === this.imgSquat.Picture) this.imgQuibble[i].Picture = this.imgJump.Picture;
          else this.imgQuibble[i].Picture = this.imgSquat.Picture;
          if (this.imgQuibble[i].Left === 8400 && G.RRunning[i] === 1) {
            G.RaceState = 2;
            this.lblQuibble[i].Caption = "Winner!";
            this.lblQuibble[i].Visible = true;
            this.lblMessage.Caption = G.RName[i] + " has won!";
            this.lblKey.Visible = true;
            G.QWins[G.RQuibble[i]] = G.QWins[G.RQuibble[i]] + 1;
            G.Winner = cint(i);
          }
        }
      }
    }
    if (G.RaceState === 3) {
      const pool = cint(cint(G.RBetTotal[0] + G.RBetTotal[1]) + G.RBetTotal[2]); // Integer sum: can overflow
      for (G.I = 0; G.I <= 2; G.I++) {
        if (G.PlayerPick[G.I] === G.Winner) {
          const share = (G.PlayerBet[G.I] / G.RBetTotal[G.Winner]) * pool;
          G.PlayerWinnings[G.I] = Int(share) - G.PlayerBet[G.I];
          G.PlayerCash[G.I] = G.PlayerCash[G.I] + Int(share);
        }
      }
      F.frmUpdate2.Unload();
      F.frmUpdate2.Show();
      G.RaceState = 0;
    }
  }
}
