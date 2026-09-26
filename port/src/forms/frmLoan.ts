import { G } from "../state.ts";
import { F } from "./registry.ts";
import { Label, TextBox, VBForm } from "../vb/runtime.ts";
import { val as Val, vbInt as Int } from "../vb/conv.ts";

export class FrmLoan extends VBForm {
  declare lblText: Label;
  declare lblCash: Label;
  declare lblDebt: Label;
  declare txtBorrow: TextBox;

  private showMoney() {
    const p = G.CurPlayer;
    F.frmLoan.lblCash.Caption = G.PlayerCash[p];
    F.frmMenu.lblCash.Caption = G.PlayerCash[p];
    F.frmLoan.lblDebt.Caption = G.PlayerDebt[p];
    F.frmMenu.lblDebt.Caption = G.PlayerDebt[p];
  }

  cmdBorrow_Click() {
    const p = G.CurPlayer;
    if (Val(this.txtBorrow.Text) > 1000) {
      this.lblText.Caption = "I don't think so!  Why don't you try something a little smaller.";
      this.txtBorrow.Text = "";
      return;
    }
    if (Val(this.txtBorrow.Text) < 4) {
      this.lblText.Caption = "Sorry, we don't deal in pennies here.";
      this.txtBorrow.Text = "";
      return;
    }
    if (G.PlayerDebt[p] >= 2000) {
      this.lblText.Caption = "Try paying me back before asking for more cash!";
      this.txtBorrow.Text = "";
    } else {
      if (G.PlayerDebt[p] > 0) this.lblText.Caption = "Back for more?  My wallet isn't bottomless, you know!";
      else this.lblText.Caption = "Pleasure doing business with you.";
      G.PlayerCash[p] = G.PlayerCash[p] + Val(this.txtBorrow.Text);
      G.PlayerDebt[p] = G.PlayerDebt[p] + Int(Val(this.txtBorrow.Text) * 0.01 * (G.Interest + 100));
      this.txtBorrow.Text = "";
      this.showMoney();
    }
  }

  cmdPay_Click() {
    const p = G.CurPlayer;
    if (Val(this.txtBorrow.Text) > G.PlayerCash[p]) {
      this.lblText.Caption = "What are you trying to pay me with?  Invisible money?";
      this.txtBorrow.Text = "";
    } else {
      if (Val(this.txtBorrow.Text) > G.PlayerDebt[p]) this.lblText.Caption = "Thanks for the charity.";
      if (Val(this.txtBorrow.Text) === G.PlayerDebt[p]) this.lblText.Caption = "You actually came through.  I'm surprised.";
      if (Val(this.txtBorrow.Text) < G.PlayerDebt[p]) this.lblText.Caption = "Thanks, but where's the rest?";
      G.PlayerCash[p] = G.PlayerCash[p] - Val(this.txtBorrow.Text);
      G.PlayerDebt[p] = G.PlayerDebt[p] - Val(this.txtBorrow.Text);
      if (G.PlayerDebt[p] < 0) G.PlayerDebt[p] = 0;
      this.txtBorrow.Text = "";
      this.showMoney();
    }
  }

  Command1_Click() {
    F.frmLoan.Hide();
  }
}
