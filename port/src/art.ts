// Pictures. The port ships placeholder art drawn here (re-authored, same
// sizes as the original's 8 pictures). In dev mode `?art=original` loads
// the original pictures from port/original-assets/ (local only, generated
// by tools/gen_layouts.py from your own copy of the game); so does a build
// with VITE_ART=original (`npm run build:original`, never deployed from git).

// A picture value. Controls get their own at load, and assigning one
// control's Picture to another shares it, so `=` compares identity as
// VB compares picture handles.
export class Picture {
  constructor(readonly key: string) {}
}

export type ArtKind = "jump" | "squat" | "track" | "p0" | "p1" | "p2" | "broker" | "shark" | "icon";

// Picture key (`frmMain.imgP(1)`) -> which of the 8 pictures it is.
export function artKind(key: string): ArtKind {
  const [form, ctl] = key.split(".");
  if (ctl === "Icon") return "icon";
  if (ctl.startsWith("imgTrack")) return "track";
  const p = /^imgP\((\d)\)$/.exec(ctl);
  if (p) return `p${p[1]}` as ArtKind;
  if (ctl === "imgPlayer") return "p0";
  if (ctl === "Image1") return form === "frmInfo" ? "broker" : "shark";
  if (ctl === "imgJump") return "jump";
  if (ctl === "imgSquat") return "squat";
  return form === "frmTitle" || form === "frmMain" ? "squat" : "jump";
}

const urls = new Map<string, string>();
let original: Record<string, string> | null = null;
// Preloaded pictures, kept referenced so they stay decoded.
const loaded: HTMLImageElement[] = [];

export function artUrl(key: string): string {
  if (original?.[key]) return `${ASSETS}${original[key]}`;
  const kind = artKind(key);
  if (!urls.has(kind)) urls.set(kind, draw(kind));
  return urls.get(kind)!;
}

export const ASSETS = `${import.meta.env.BASE_URL}original-assets/`;

export const useOriginal = () =>
  import.meta.env.VITE_ART === "original" ||
  (import.meta.env.DEV && new URLSearchParams(location.search).get("art") === "original");

export async function loadArt(): Promise<void> {
  if (!useOriginal()) return;
  try {
    original = await (await fetch(`${ASSETS}manifest.json`)).json();
  } catch {
    original = null;
  }
  // Load and decode every picture up front, as the exe has them all in its
  // resources: forms then show them without waiting on the network.
  await Promise.all([...new Set(Object.values(original ?? {}))].map((f) => {
    const img = new Image();
    img.src = `${ASSETS}${f}`;
    loaded.push(img);
    return img.decode().catch(() => {});
  }));
  // Real Times New Roman pixel fonts (tools/serif2woff.py --times), if made.
  await Promise.all(SERIF_PX.map(async (px) => {
    try {
      const face = new FontFace(`QTimes${px}`, `url(${ASSETS}fonts/times-${px}.woff)`);
      document.fonts.add(await face.load());
    } catch { /* not generated: the Liberation pixel fonts stand in */ }
  }));
}

const SERIF_PX = [9, 11, 16, 24, 32];

// ---------------------------------------------------------------- placeholders

const TRACK_BANDS = ["#6b3a12", "#7a4518", "#8a5220", "#7a4518", "#5e3210"];

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function dirt(g: CanvasRenderingContext2D, w: number, h: number) {
  const band = h / TRACK_BANDS.length;
  TRACK_BANDS.forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(0, i * band, w, band + 1);
  });
  g.fillStyle = "rgba(0,0,0,0.12)";
  for (let x = 0; x < w; x += 6) for (let y = (x / 6) % 2 ? 3 : 0; y < h; y += 7) g.fillRect(x, y, 2, 1);
}

// A round critter with an antenna, on the track's dirt.
function critter(g: CanvasRenderingContext2D, jump: boolean) {
  dirt(g, 75, 75);
  const y = jump ? 30 : 38;
  g.fillStyle = "rgba(0,0,0,0.45)";
  g.beginPath();
  g.ellipse(36, 66, jump ? 12 : 17, 3, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#3f8f2f";
  g.beginPath();
  g.ellipse(34, y, 17, jump ? 20 : 17, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#62b84a";
  g.beginPath();
  g.ellipse(29, y - 6, 7, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#2d6b21";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(36, y - 17);
  g.quadraticCurveTo(40, y - 27, 46, y - 28);
  g.stroke();
  g.fillStyle = "#e0c020";
  g.beginPath();
  g.arc(46, y - 28, 3, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(44, y - 4, 5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#000";
  g.beginPath();
  g.arc(46, y - 4, 2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#d8a020";
  const feet = jump ? [[24, 58], [42, 56]] : [[22, 62], [44, 62]];
  for (const [fx, fy] of feet) {
    g.beginPath();
    g.ellipse(fx, fy, 7, 3.5, 0, 0, Math.PI * 2);
    g.fill();
  }
}

// A head-and-shoulders portrait on black.
function portrait(g: CanvasRenderingContext2D, skin: string, coat: string, extra: (g: CanvasRenderingContext2D) => void) {
  g.fillStyle = "#000";
  g.fillRect(0, 0, 75, 75);
  g.fillStyle = coat;
  g.beginPath();
  g.ellipse(37, 80, 30, 22, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = skin;
  g.beginPath();
  g.ellipse(37, 34, 20, 23, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff";
  g.fillRect(27, 27, 7, 6);
  g.fillRect(41, 27, 7, 6);
  g.fillStyle = "#000";
  g.fillRect(30, 29, 3, 3);
  g.fillRect(44, 29, 3, 3);
  extra(g);
}

function draw(kind: ArtKind): string {
  if (kind === "track") {
    const [c, g] = canvas(750, 75);
    dirt(g, 750, 75);
    g.fillStyle = "rgba(255,255,255,0.5)";
    for (let y = 0; y < 75; y += 8) g.fillRect(700, y, 4, 4);
    return c.toDataURL();
  }
  if (kind === "icon") {
    const [c, g] = canvas(16, 16);
    g.fillStyle = "#3f8f2f";
    g.beginPath();
    g.ellipse(8, 9, 6, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.fillRect(9, 6, 3, 3);
    g.fillStyle = "#000";
    g.fillRect(10, 7, 1, 1);
    g.fillStyle = "#e0c020";
    g.fillRect(7, 1, 2, 2);
    return c.toDataURL();
  }
  const [c, g] = canvas(75, 75);
  const mouth = (w: number, col = "#400") => (g: CanvasRenderingContext2D) => {
    g.fillStyle = col;
    g.fillRect(37 - w / 2, 44, w, 4);
  };
  switch (kind) {
    case "jump":
    case "squat":
      critter(g, kind === "jump");
      break;
    case "p0":
      portrait(g, "#7cc040", "#7a1830", (g) => {
        mouth(12)(g);
        g.fillStyle = "#7cc040";
        g.fillRect(24, 4, 2, 10);
        g.fillRect(49, 4, 2, 10);
      });
      break;
    case "p1":
      portrait(g, "#f0a080", "#8030a0", (g) => {
        mouth(18)(g);
        g.fillStyle = "#f0a080";
        g.beginPath();
        g.ellipse(15, 18, 6, 11, -0.4, 0, Math.PI * 2);
        g.ellipse(59, 18, 6, 11, 0.4, 0, Math.PI * 2);
        g.fill();
      });
      break;
    case "p2":
      portrait(g, "#f08030", "#5070a0", (g) => {
        g.fillStyle = "#fff";
        g.fillRect(21, 40, 32, 10);
        g.fillStyle = "#400";
        for (let x = 21; x < 53; x += 5) g.fillRect(x, 40, 1, 10);
      });
      break;
    case "broker":
      g.fillStyle = "#000";
      g.fillRect(0, 0, 75, 75);
      g.strokeStyle = "#aaa";
      g.lineWidth = 3;
      g.strokeRect(14, 14, 47, 50);
      g.fillStyle = "#d04060";
      g.beginPath();
      g.ellipse(37, 38, 17, 12, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#902030";
      g.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.arc(30 + i * 5, 36 + (i % 2) * 4, 4, 0, Math.PI);
        g.stroke();
      }
      break;
    case "shark":
      portrait(g, "#c8a0a0", "#608070", (g) => {
        mouth(14, "#600")(g);
        g.fillStyle = "#a02020";
        for (let i = 0; i < 6; i++) g.fillRect(24 + (i % 3) * 10, 10 + Math.floor(i / 3) * 6, 5, 3);
      });
      break;
  }
  return c.toDataURL();
}
