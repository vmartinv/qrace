// The program's forms, one instance each (VB's predeclared form objects).
// Filled in by main.ts; form code refers to other forms through F.
import type { FrmTitle } from "./frmTitle.ts";
import type { FrmMain } from "./frmMain.ts";
import type { FrmMenu } from "./frmMenu.ts";
import type { FrmAvailable } from "./frmAvailable.ts";
import type { FrmInfo } from "./frmInfo.ts";
import type { FrmOptions } from "./frmOptions.ts";
import type { FrmPlayer } from "./frmPlayer.ts";
import type { FrmRetire } from "./frmRetire.ts";
import type { FrmSpecial } from "./frmSpecial.ts";
import type { FrmSponsor } from "./frmSponsor.ts";
import type { FrmStatus } from "./frmStatus.ts";
import type { FrmTarget } from "./frmTarget.ts";
import type { FrmUpdate } from "./frmUpdate.ts";
import type { FrmUpdate2 } from "./frmUpdate2.ts";
import type { FrmWinners } from "./frmWinners.ts";
import type { FrmLoan } from "./frmLoan.ts";

export interface Forms {
  frmTitle: FrmTitle;
  frmMain: FrmMain;
  frmMenu: FrmMenu;
  frmAvailable: FrmAvailable;
  frmInfo: FrmInfo;
  frmOptions: FrmOptions;
  frmPlayer: FrmPlayer;
  frmRetire: FrmRetire;
  frmSpecial: FrmSpecial;
  frmSponsor: FrmSponsor;
  frmStatus: FrmStatus;
  frmTarget: FrmTarget;
  frmUpdate: FrmUpdate;
  frmUpdate2: FrmUpdate2;
  frmWinners: FrmWinners;
  frmLoan: FrmLoan;
}

export const F = {} as Forms;

// The QueryUnload handlers' "close the whole program" sequence.
export function quitAll(order: (keyof Forms)[]) {
  for (const f of order) F[f].Unload(1);
}
