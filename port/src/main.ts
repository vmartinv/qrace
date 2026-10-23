import "./style.css";
import layouts from "./forms/layouts.json";
import { artUrl, loadArt } from "./art.ts";
import { loadData } from "./data.ts";
import { F } from "./forms/registry.ts";
import { FrmTitle } from "./forms/frmTitle.ts";
import { FrmMain } from "./forms/frmMain.ts";
import { FrmMenu } from "./forms/frmMenu.ts";
import { FrmAvailable } from "./forms/frmAvailable.ts";
import { FrmInfo } from "./forms/frmInfo.ts";
import { FrmOptions } from "./forms/frmOptions.ts";
import { FrmPlayer } from "./forms/frmPlayer.ts";
import { FrmRetire } from "./forms/frmRetire.ts";
import { FrmSpecial } from "./forms/frmSpecial.ts";
import { FrmSponsor } from "./forms/frmSponsor.ts";
import { FrmStatus } from "./forms/frmStatus.ts";
import { FrmTarget } from "./forms/frmTarget.ts";
import { FrmUpdate } from "./forms/frmUpdate.ts";
import { FrmUpdate2 } from "./forms/frmUpdate2.ts";
import { FrmWinners } from "./forms/frmWinners.ts";
import { FrmLoan } from "./forms/frmLoan.ts";
import { entry, initDesktop, type FormLayout } from "./vb/runtime.ts";
import { setSeed } from "./vb/rnd.ts";
import { G } from "./state.ts";

const L = layouts as unknown as Record<string, FormLayout>;

async function main() {
  await Promise.all([loadArt(), loadData(),
    ...["13px QSans13", "16px QSans16", "20px QSans20",
      "11px QSerif9", "13px QSerif11", "19px QSerif16", "28px QSerif24", "36px QSerif32"].map((f) => document.fonts.load(f).catch(() => []))]);
  const seed = new URLSearchParams(location.search).get("seed");
  if (seed !== null) setSeed(Number(seed));
  initDesktop(document.querySelector("#app")!);
  setFavicon();
  Object.assign(F, {
    frmTitle: new FrmTitle(L.frmTitle),
    frmMain: new FrmMain(L.frmMain),
    frmMenu: new FrmMenu(L.frmMenu),
    frmAvailable: new FrmAvailable(L.frmAvailable),
    frmInfo: new FrmInfo(L.frmInfo),
    frmOptions: new FrmOptions(L.frmOptions),
    frmPlayer: new FrmPlayer(L.frmPlayer),
    frmRetire: new FrmRetire(L.frmRetire),
    frmSpecial: new FrmSpecial(L.frmSpecial),
    frmSponsor: new FrmSponsor(L.frmSponsor),
    frmStatus: new FrmStatus(L.frmStatus),
    frmTarget: new FrmTarget(L.frmTarget),
    frmUpdate: new FrmUpdate(L.frmUpdate),
    frmUpdate2: new FrmUpdate2(L.frmUpdate2),
    frmWinners: new FrmWinners(L.frmWinners),
    frmLoan: new FrmLoan(L.frmLoan),
  });
  // Game state for the test harness.
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__G = G;
  // The startup form.
  entry(() => F.frmTitle.Show());
}

// The page icon is the game's window icon, scaled up without smoothing.
function setFavicon() {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, 64, 64);
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = c.toDataURL();
    document.head.append(link);
  };
  img.src = artUrl("frmTitle.Icon");
}

main();
