// A small model of the VB3 runtime: forms as Windows 3.1-style windows on
// a 800x600 desktop, the standard controls this game uses, timers, MsgBox
// and End. Geometry is kept in twips like VB (15 twips = 1 px).
//
// Event handlers are the form classes' methods, named as in VB
// (`cmdDone_Click`, `Form_Load`, `Timer1_Timer`); a control array's
// handlers take the index first.
import { artUrl, Picture } from "../art.ts";
import { VBError } from "./errors.ts";
import { cstr } from "./conv.ts";

export const TWIPS = 15;
// Windows 95 sizable frame (SM_CYFRAME) and caption (SM_CYCAPTION: 18 px
// bar + 1 px line) heights, px.
const FRAME = 4;
const CAPTION = 19;
const px = (tw: number) => `${tw / TWIPS}px`;

// The OS timer's resolution: SetTimer on Windows 3.x/9x ticks at ~55 ms.
export const TIMER_MIN_MS = Number(new URLSearchParams(location.search).get("tick") ?? 55);

type Props = Record<string, string | number>;
export interface ControlLayout {
  type: string;
  name: string;
  index?: number;
  props: Props;
  picSize?: [number, number];
}
export interface FormLayout extends ControlLayout {
  controls: ControlLayout[];
}

// ---------------------------------------------------------------- colors

const SYS_COLORS = [
  "#c0c0c0", "#008080", "#000080", "#ffffff", "#ffffff", "#ffffff", "#000000", "#000000", "#000000",
  "#ffffff", "#c0c0c0", "#c0c0c0", "#ffffff", "#000080", "#ffffff", "#c0c0c0", "#808080", "#808080",
  "#000000",
];

export function cssColor(c: number): string {
  if (c >= 0x80000000) return SYS_COLORS[c & 0xff] ?? "#000000";
  const r = c & 0xff, g = (c >> 8) & 0xff, b = (c >> 16) & 0xff;
  return `rgb(${r},${g},${b})`;
}

// MS Sans Serif at 8, 10 and 12 pt uses the bitmap fonts in public/fonts
// (converted from Wine's clone; the em is the bitmap cell, so they're set
// at that pixel size). Other sizes and the serif faces use TrueType
// look-alikes (Liberation has Arial / Times New Roman metrics).
const SANS = '"Liberation Sans", Arial, sans-serif';
const SERIF = '"Times New Roman", "Liberation Serif", Times, serif';

export function fontCss(name: string, pt: number): { family: string; size: string } {
  if (name === "MS Sans Serif") {
    if (pt <= 9) return { family: `QSans13, ${SANS}`, size: "13px" };
    if (pt <= 11) return { family: `QSans16, ${SANS}`, size: "16px" };
    if (pt <= 13) return { family: `QSans20, ${SANS}`, size: "20px" };
    return { family: SANS, size: `${(pt * 96) / 72}px` };
  }
  return { family: /serif/i.test(name) || /Times/.test(name) ? SERIF : SANS, size: `${(pt * 96) / 72}px` };
}

// Caption text with `&` access keys: "&&" is a literal "&", "&x" underlines x.
function setMnemonicText(el: HTMLElement, text: string) {
  el.textContent = "";
  let i = 0;
  while (i < text.length) {
    const j = text.indexOf("&", i);
    if (j < 0 || j === text.length - 1) {
      el.append(text.slice(i));
      break;
    }
    el.append(text.slice(i, j));
    if (text[j + 1] === "&") el.append("&");
    else {
      const u = document.createElement("u");
      u.textContent = text[j + 1];
      el.append(u);
    }
    i = j + 2;
  }
}

// Centered text can land on half pixels, which blurs the pixel fonts: text
// sits in a span.vb-text that is shifted back onto whole pixels after layout.
const toSnap = new Set<HTMLElement>();
let snapPending = false;

function textSpan(el: HTMLElement, text: string) {
  let span = el.querySelector<HTMLElement>(":scope > .vb-text");
  if (!span) {
    span = document.createElement("span");
    span.className = "vb-text";
    el.textContent = "";
    el.append(span);
  }
  setMnemonicText(span, text);
  span.style.left = span.style.top = "0";
  toSnap.add(span);
  if (!snapPending) {
    snapPending = true;
    queueMicrotask(snapAll);
  }
}

function snapAll() {
  snapPending = false;
  for (const span of toSnap) {
    const parent = span.parentElement;
    const r = span.getClientRects()[0];
    if (!parent || !r || !span.isConnected) continue;
    const pr = parent.getBoundingClientRect();
    const zoom = pr.width / (parent.offsetWidth || 1) || 1;
    const fx = (((r.left - pr.left) / zoom) % 1 + 1) % 1;
    const fy = (((r.top - pr.top) / zoom) % 1 + 1) % 1;
    span.style.left = `${-(fx > 0.5 ? fx - 1 : fx)}px`;
    span.style.top = `${-(fy > 0.5 ? fy - 1 : fy)}px`;
  }
  toSnap.clear();
}

// ---------------------------------------------------------------- program state

class EndSignal extends Error {}

let ended = false;
const forms: VBForm[] = [];
let zOrder: VBForm[] = []; // visible forms, back to front
let active: VBForm | null = null;
let modal: HTMLElement | null = null;
export let desktop: HTMLElement;

export function initDesktop(root: HTMLElement) {
  // Credits, in the screen corner like Windows' version watermark: behind
  // the (transparent) desktop, and outside it so the phone zoom never pushes
  // it off screen.
  const credit = document.createElement("div");
  credit.className = "vb-credit";
  credit.innerHTML = 'Quibble Race &copy; Derek Yu / Blackeye Software<br>' +
    'Unofficial fan port &middot; <a href="https://derekyu.com" target="_blank" rel="noopener">derekyu.com</a>';
  root.append(credit);
  desktop = document.createElement("div");
  desktop.className = "vb-desktop";
  root.append(desktop);
  window.addEventListener("resize", refit);
  refit();
  document.fonts?.ready.then(resnap);
  document.fonts?.addEventListener("loadingdone", resnap);
  document.addEventListener("keydown", (e) => {
    if (modal) {
      if (e.key === "Enter" || e.key === "Escape") modal.querySelector("button")?.click();
      return;
    }
    const f = active;
    if (!f || !f.loaded) return;
    const t = e.target as HTMLElement;
    if (t.closest?.(".vb-window") && t.matches("input, textarea, button")) return;
    entry(() => f.fire("Form_KeyDown", e.keyCode, (e.shiftKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.altKey ? 4 : 0)));
  });
}

// The 800x600 screen fills the window by default; ?zoom=N fixes the factor
// (whole numbers keep the pixel fonts perfectly even). A phone (a side
// under PHONE px) zooms onto the visible windows instead (all of
// them, so a small popup never cuts off the window behind it), framing at least FOCUS_MIN px so small dialogs don't
// jump in size.
const ZOOM = Number(new URLSearchParams(location.search).get("zoom")) || 0;
const PHONE = 500, FOCUS_MIN = 440, FOCUS_PAD = 8;
let scale = 0;

function refit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let s = ZOOM || Math.min(vw / 800, vh / 600);
  let cx = 400, cy = 300;
  const box = !ZOOM && Math.min(vw, vh) < PHONE && focusBox();
  if (box) {
    s = Math.min(vw / (Math.max(box.w, FOCUS_MIN) + 2 * FOCUS_PAD), vh / (Math.max(box.h, FOCUS_MIN * 0.6) + 2 * FOCUS_PAD));
    cx = box.x + box.w / 2;
    cy = box.y + box.h / 2;
  }
  // Centre on the focus, but keep the desktop's edges outside the view.
  const place = (v: number, size: number, c: number) =>
    size * s <= v ? (v - size * s) / 2 : Math.min(0, Math.max(v - size * s, v / 2 - c * s));
  desktop.style.transform = `scale(${s})`;
  desktop.style.left = `${place(vw, 800, cx)}px`;
  desktop.style.top = `${place(vh, 600, cy)}px`;
  if (s !== scale) {
    scale = s;
    resnap();
  }
}

// The bounding box, in desktop pixels, of the visible windows.
function focusBox() {
  const wins = [...zOrder.map((f) => f.win), ...desktop.querySelectorAll<HTMLElement>(".vb-msgbox, .vb-notepad")];
  const d = desktop.getBoundingClientRect(), z = d.width / 800 || 1;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const w of wins) {
    if (!w || !w.isConnected) continue;
    const r = w.getBoundingClientRect();
    if (!r.width) continue;
    x0 = Math.min(x0, (r.left - d.left) / z);
    y0 = Math.min(y0, (r.top - d.top) / z);
    x1 = Math.max(x1, (r.right - d.left) / z);
    y1 = Math.max(y1, (r.bottom - d.top) / z);
  }
  return x0 < x1 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

function resnap() {
  for (const span of desktop.querySelectorAll<HTMLElement>(".vb-text")) {
    span.style.left = span.style.top = "0";
    toSnap.add(span);
  }
  snapAll();
}

// Every entry from the outside (DOM events, timers) goes through here: a
// VB run-time error shows its message and ends the program; End stops the
// current handler.
export function entry(fn: () => void) {
  if (ended) return;
  try {
    fn();
  } catch (e) {
    if (e instanceof EndSignal) return;
    if (e instanceof VBError) {
      msgBox(`Run-time error '${e.code}':\n\n${e.message}`, "QUIBBLES", () => End(false));
      return;
    }
    throw e;
  }
}

// The End statement: every form goes away and the program stops.
export function End(throwSignal = true): never | void {
  ended = true;
  for (const f of forms) f.destroy();
  zOrder = [];
  active = null;
  modal?.remove();
  modal = null;
  const done = document.createElement("div");
  done.className = "vb-ended";
  done.innerHTML = `<p>The program has ended.</p>`;
  const again = document.createElement("button");
  again.className = "vb-button";
  again.textContent = "Run again";
  again.onclick = () => location.reload();
  done.append(again);
  desktop.append(done);
  if (throwSignal) throw new EndSignal();
}

// Dragging a window by its title bar (not its icon or close button). Mouse
// movement is divided by the desktop zoom, and the window stays entirely
// on the 800x600 screen.
function makeDraggable(win: HTMLElement, bar: HTMLElement) {
  bar.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(".vb-close, .vb-icon")) return;
    const zoom = desktop.getBoundingClientRect().width / 800 || 1;
    const r = win.getBoundingClientRect(), d = desktop.getBoundingClientRect();
    const x0 = (r.left - d.left) / zoom, y0 = (r.top - d.top) / zoom;
    win.classList.add("vb-moved"); // drops the MsgBox's centring transform
    win.style.left = `${x0}px`;
    win.style.top = `${y0}px`;
    const move = (m: PointerEvent) => {
      const x = x0 + (m.clientX - e.clientX) / zoom, y = y0 + (m.clientY - e.clientY) / zoom;
      win.style.left = `${Math.round(Math.max(0, Math.min(x, 800 - win.offsetWidth)))}px`;
      win.style.top = `${Math.round(Math.max(0, Math.min(y, 600 - win.offsetHeight)))}px`;
    };
    const up = () => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
    };
    bar.setPointerCapture(e.pointerId);
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    e.preventDefault();
  });
}

function activate(f: VBForm | null) {
  if (f === active) return;
  active = f;
  for (const g of forms) g.win?.classList.toggle("active", g === f);
  refit();
  f?.fire("Form_Activate");
}

function restack() {
  zOrder.forEach((f, i) => (f.win.style.zIndex = String(10 + i)));
}

// MsgBox: a modal message window with OK. Code after a MsgBox call runs
// only once it's dismissed (then), though every call in this game ends
// its handler anyway.
export function msgBox(text: string, title = "QUIBBLES", then?: () => void) {
  const shade = document.createElement("div");
  shade.className = "vb-modal";
  const w = document.createElement("div");
  w.className = "vb-window active vb-msgbox";
  w.innerHTML = `<div class="vb-caption"><span class="vb-title"></span><button class="vb-close"></button></div>
    <div class="vb-msgbody"><p></p></div>`;
  w.querySelector(".vb-title")!.textContent = title;
  w.querySelector("p")!.textContent = text;
  const ok = document.createElement("button");
  ok.className = "vb-button";
  ok.textContent = "OK";
  ok.onclick = () => {
    shade.remove();
    modal = null;
    refit();
    if (then) entry(then);
  };
  w.querySelector(".vb-msgbody")!.append(ok);
  w.querySelector(".vb-close")!.addEventListener("click", () => ok.click());
  shade.append(w);
  desktop.append(shade);
  makeDraggable(w, w.querySelector<HTMLElement>(".vb-caption")!);
  modal = shade;
  refit();
  ok.focus();
}

// ---------------------------------------------------------------- controls

export abstract class Control {
  el: HTMLElement | null = null;
  readonly name: string;
  readonly index: number | undefined;
  protected p: Props;

  constructor(readonly form: VBForm, readonly layout: ControlLayout) {
    this.name = layout.name;
    this.index = layout.index;
    this.p = { Visible: -1, Enabled: -1, ...this.defaults(), ...layout.props };
  }

  protected defaults(): Props {
    return {};
  }

  // Creates the element (if any) inside the form's client area.
  abstract mount(parent: HTMLElement): void;

  protected place(el: HTMLElement) {
    this.el = el;
    el.style.position = "absolute";
    this.applyGeometry();
    this.applyFont();
    el.style.display = this.Visible ? "" : "none";
  }

  protected applyGeometry() {
    if (!this.el) return;
    const s = this.el.style;
    s.left = px(Number(this.p.Left ?? 0));
    s.top = px(Number(this.p.Top ?? 0));
    if (this.p.Width !== undefined) s.width = px(Number(this.p.Width));
    if (this.p.Height !== undefined) s.height = px(Number(this.p.Height));
  }

  protected applyFont() {
    if (!this.el || this.p.FontName === undefined) return;
    const s = this.el.style;
    const f = fontCss(String(this.p.FontName), Number(this.p.FontSize ?? 8.25));
    s.fontFamily = f.family;
    s.fontSize = f.size;
    s.fontWeight = Number(this.p.FontBold ?? -1) ? "bold" : "normal";
    s.fontStyle = Number(this.p.FontItalic ?? 0) ? "italic" : "normal";
    s.textDecoration = Number(this.p.FontUnderline ?? 0) ? "underline" : "none";
  }

  // Click on the control -> `<name>_Click` (with the index for arrays).
  protected click = () => {
    if (!this.Enabled || modal) return;
    entry(() => this.fireEvent("Click"));
  };

  // From outside VB code (the race canvas): ignored under a MsgBox.
  fireEventSafe(ev: string) {
    if (!modal) entry(() => this.fireEvent(ev));
  }

  fireEvent(ev: string, ...args: unknown[]) {
    const h = `${this.name}_${ev}`;
    if (this.index !== undefined) this.form.fire(h, this.index, ...args);
    else this.form.fire(h, ...args);
  }

  get Left() { return Number(this.p.Left ?? 0); }
  set Left(v: number) { this.p.Left = v; this.applyGeometry(); }
  get Top() { return Number(this.p.Top ?? 0); }
  set Top(v: number) { this.p.Top = v; this.applyGeometry(); }
  get Width() { return Number(this.p.Width ?? 0); }
  set Width(v: number) { this.p.Width = v; this.applyGeometry(); }
  get Height() { return Number(this.p.Height ?? 0); }
  set Height(v: number) { this.p.Height = v; this.applyGeometry(); }

  get Visible(): boolean { return !!Number(this.p.Visible); }
  set Visible(v: boolean | number) {
    this.p.Visible = v ? -1 : 0;
    if (this.el) {
      this.el.style.display = v ? "" : "none";
      const t = this.el.querySelector<HTMLElement>(":scope > .vb-text");
      if (v && t) textSpan(this.el, String(this.p.Caption ?? ""));
    }
  }
  get Enabled(): boolean { return !!Number(this.p.Enabled); }
  set Enabled(v: boolean | number) {
    this.p.Enabled = v ? -1 : 0;
    this.applyEnabled();
  }
  protected applyEnabled() {
    this.el?.classList.toggle("disabled", !this.Enabled);
  }

  SetFocus() {
    (this.el as HTMLElement | null)?.focus();
  }
}

export class Label extends Control {
  protected defaults(): Props {
    return { BackColor: 0x80000005, ForeColor: 0x80000008, BackStyle: 1, Alignment: 0, FontName: "MS Sans Serif" };
  }
  mount(parent: HTMLElement) {
    const el = document.createElement("div");
    el.className = "vb-label";
    el.addEventListener("click", this.click);
    this.place(el);
    this.applyStyle();
    this.applyCaption();
    parent.append(el);
  }
  private applyStyle() {
    const s = this.el!.style;
    s.color = cssColor(Number(this.p.ForeColor));
    s.background = Number(this.p.BackStyle) ? cssColor(Number(this.p.BackColor)) : "transparent";
    s.textAlign = ["left", "right", "center"][Number(this.p.Alignment)] ?? "left";
    if (Number(this.p.BorderStyle ?? 0)) s.border = "1px solid black";
  }
  private applyCaption() {
    if (this.el) textSpan(this.el, String(this.p.Caption ?? ""));
  }
  get Caption(): string { return String(this.p.Caption ?? ""); }
  set Caption(v: string | number) { this.p.Caption = cstr(v); this.applyCaption(); }
}

export class CommandButton extends Control {
  protected defaults(): Props {
    return { FontName: "MS Sans Serif" };
  }
  mount(parent: HTMLElement) {
    const el = document.createElement("button");
    el.className = "vb-button";
    el.addEventListener("click", this.click);
    this.place(el);
    textSpan(el, this.Caption);
    this.applyEnabled();
    parent.append(el);
  }
  protected applyEnabled() {
    super.applyEnabled();
    if (this.el) (this.el as HTMLButtonElement).disabled = !this.Enabled;
  }
  get Caption(): string { return String(this.p.Caption ?? ""); }
  set Caption(v: string | number) {
    this.p.Caption = cstr(v);
    if (this.el) textSpan(this.el, this.p.Caption);
  }
}

export class TextBox extends Control {
  protected defaults(): Props {
    return { BackColor: 0x80000005, ForeColor: 0x80000008, FontName: "MS Sans Serif", Text: "" };
  }
  mount(parent: HTMLElement) {
    const el = document.createElement(Number(this.p.MultiLine ?? 0) ? "textarea" : "input");
    el.className = "vb-textbox";
    el.style.color = cssColor(Number(this.p.ForeColor));
    el.style.background = cssColor(Number(this.p.BackColor));
    (el as HTMLInputElement).value = String(this.p.Text);
    el.addEventListener("input", () => (this.p.Text = (el as HTMLInputElement).value));
    this.place(el);
    this.applyEnabled();
    parent.append(el);
  }
  get Text(): string { return String(this.p.Text); }
  set Text(v: string | number) {
    this.p.Text = cstr(v);
    if (this.el) (this.el as HTMLInputElement).value = this.p.Text;
  }
}

// CheckBox (Value 0/1/2) and OptionButton (Value True/False). Setting
// Value from code fires Click like a user click does.
export class CheckBox extends Control {
  protected input!: HTMLInputElement;
  protected defaults(): Props {
    return { BackColor: 0x80000005, ForeColor: 0x80000008, FontName: "MS Sans Serif", Value: 0 };
  }
  protected kind = "checkbox";
  mount(parent: HTMLElement) {
    const el = document.createElement("label");
    el.className = "vb-check";
    el.style.color = cssColor(Number(this.p.ForeColor));
    el.style.background = cssColor(Number(this.p.BackColor));
    this.input = document.createElement("input");
    this.input.type = this.kind;
    this.input.checked = !!Number(this.p.Value);
    this.input.addEventListener("click", (e) => {
      if (modal) return e.preventDefault();
      entry(() => this.userClick());
    });
    const span = document.createElement("span");
    setMnemonicText(span, String(this.p.Caption ?? ""));
    el.append(this.input, span);
    this.place(el);
    this.applyEnabled();
    parent.append(el);
  }
  protected userClick() {
    this.Value = this.input.checked ? 1 : 0;
  }
  get Value(): number { return Number(this.p.Value); }
  set Value(v: number | boolean) {
    const n = Number(v);
    const changed = n !== Number(this.p.Value);
    this.p.Value = n;
    if (this.input) this.input.checked = !!n;
    if (changed) this.fireEvent("Click");
  }
}

export class OptionButton extends CheckBox {
  protected kind = "radio";
  protected userClick() {
    this.Value = true;
  }
  get Value(): number { return Number(this.p.Value) ? -1 : 0; }
  set Value(v: number | boolean) {
    const on = !!Number(v);
    const was = !!Number(this.p.Value);
    this.p.Value = on ? -1 : 0;
    if (this.input) this.input.checked = on;
    if (on) {
      for (const c of this.form.allControls())
        if (c !== this && c instanceof OptionButton && Number(c.p.Value)) c.Value = false;
      if (!was) this.fireEvent("Click");
    }
  }
}

export class Image extends Control {
  private pic: Picture | null = null;
  constructor(form: VBForm, layout: ControlLayout) {
    super(form, layout);
    if (layout.props.Picture) this.pic = new Picture(String(layout.props.Picture));
    if (layout.picSize) {
      this.p.Width ??= layout.picSize[0] * TWIPS;
      this.p.Height ??= layout.picSize[1] * TWIPS;
    }
  }
  mount(parent: HTMLElement) {
    if (this.form.imagesOnCanvas) return; // drawn by the form's canvas (frmMain's race)
    const el = document.createElement("img");
    el.className = "vb-image";
    el.draggable = false;
    el.addEventListener("click", this.click);
    this.place(el);
    this.applyPicture();
    parent.append(el);
  }
  private applyPicture() {
    const el = this.el as HTMLImageElement | null;
    if (!el) return;
    if (this.pic) el.src = artUrl(this.pic.key);
    else el.removeAttribute("src");
  }
  get Picture(): Picture | null { return this.pic; }
  set Picture(v: Picture | null) { this.pic = v; this.applyPicture(); }
}

export class Shape extends Control {
  protected defaults(): Props {
    return { BorderColor: 0x80000008, BorderWidth: 1, BackStyle: 0, BackColor: 0x80000005 };
  }
  mount(parent: HTMLElement) {
    const el = document.createElement("div");
    el.className = "vb-shape";
    el.style.border = `${this.p.BorderWidth}px solid ${cssColor(Number(this.p.BorderColor))}`;
    el.style.boxSizing = "border-box";
    if (Number(this.p.BackStyle)) el.style.background = cssColor(Number(this.p.BackColor));
    this.place(el);
    parent.append(el);
  }
}

export class Timer extends Control {
  private handle: number | undefined;
  protected defaults(): Props {
    return { Interval: 0 };
  }
  mount() {
    this.restart();
  }
  restart() {
    this.stop();
    if (!this.Enabled || !this.Interval || !this.form.loaded) return;
    this.handle = window.setInterval(() => {
      if (this.form.loaded) entry(() => this.fireEvent("Timer"));
    }, Math.max(this.Interval, TIMER_MIN_MS));
  }
  stop() {
    if (this.handle !== undefined) window.clearInterval(this.handle);
    this.handle = undefined;
  }
  get Interval(): number { return Number(this.p.Interval); }
  set Interval(v: number) { this.p.Interval = v; this.restart(); }
  protected applyEnabled() {
    this.restart();
  }
}

const CLASSES: Record<string, new (f: VBForm, l: ControlLayout) => Control> = {
  Label, CommandButton, TextBox, CheckBox, OptionButton, Image, Shape, Timer,
};

// ---------------------------------------------------------------- forms

export class VBForm {
  loaded = false;
  visible = false;
  win!: HTMLElement;
  client!: HTMLElement;
  // frmMain draws its Image controls on a canvas (the race scene).
  imagesOnCanvas = false;
  private ctls = new Map<string, Control | Control[]>();
  private p: Props = {};

  constructor(readonly layout: FormLayout) {
    forms.push(this);
    // Referencing a control loads the form (VB's implicit Load).
    for (const c of layout.controls) {
      if (Object.prototype.hasOwnProperty.call(this, c.name)) continue;
      Object.defineProperty(this, c.name, {
        get: () => {
          this.Load();
          return this.ctls.get(c.name);
        },
      });
    }
  }

  get name() {
    return this.layout.name;
  }

  allControls(): Control[] {
    return [...this.ctls.values()].flatMap((c) => (Array.isArray(c) ? c.filter(Boolean) : [c]));
  }

  fire(handler: string, ...args: unknown[]) {
    const f = (this as unknown as Record<string, unknown>)[handler];
    if (typeof f === "function") f.apply(this, args);
  }

  fireSafe(handler: string, ...args: unknown[]) {
    if (!modal) entry(() => this.fire(handler, ...args));
  }

  Load() {
    if (this.loaded || ended) return;
    this.loaded = true;
    this.p = { ...this.layout.props };
    this.buildWindow();
    this.ctls.clear();
    // FRM order is front to back: mount back to front.
    for (const cl of [...this.layout.controls].reverse()) {
      const C = CLASSES[cl.type];
      if (!C) continue;
      const c = new C(this, cl);
      if (cl.index !== undefined) {
        const arr = (this.ctls.get(cl.name) as Control[] | undefined) ?? [];
        arr[cl.index] = c;
        this.ctls.set(cl.name, arr);
      } else this.ctls.set(cl.name, c);
    }
    const lightweight = (c: Control) => c instanceof Label || c instanceof Image || c instanceof Shape;
    const all = [...this.layout.controls].reverse().map((cl) => {
      const c = this.ctls.get(cl.name);
      return Array.isArray(c) ? c[cl.index!] : c;
    }).filter((c): c is Control => !!c);
    for (const c of all.filter(lightweight)) c.mount(this.client);
    for (const c of all.filter((c) => !lightweight(c))) c.mount(this.client);
    this.onLoaded();
    this.fire("Form_Load");
  }

  // Hook for subclasses that add rendering (frmMain's race canvas).
  protected onLoaded() {}
  protected onUnloaded() {}

  private buildWindow() {
    const p = this.layout.props;
    const w = document.createElement("div");
    w.className = "vb-window";
    w.style.display = "none";
    const caption = document.createElement("div");
    caption.className = "vb-caption";
    const close = () => {
      if (!modal) entry(() => this.Unload(0));
    };
    const hasBox = !!Number(p.ControlBox ?? -1);
    if (hasBox) {
      const icon = document.createElement("img");
      icon.className = "vb-icon";
      icon.src = artUrl(String(p.Icon ?? `${this.name}.Icon`));
      icon.addEventListener("dblclick", close);
      caption.append(icon);
    }
    const title = document.createElement("span");
    title.className = "vb-title";
    title.textContent = String(p.Caption ?? "");
    caption.append(title);
    if (hasBox) {
      const x = document.createElement("button");
      x.className = "vb-close";
      x.title = "Close";
      x.addEventListener("click", close);
      caption.append(x);
    }
    const client = document.createElement("div");
    client.className = "vb-client";
    client.style.width = px(Number(p.ClientWidth));
    client.style.height = px(Number(p.ClientHeight));
    client.style.background = cssColor(Number(p.BackColor ?? 0x80000005));
    client.addEventListener("click", (e) => {
      if (e.target === client && !modal) entry(() => this.fire("Form_Click"));
    });
    client.addEventListener("mousedown", (e) => {
      if (e.target === client && !modal)
        entry(() => this.fire("Form_MouseDown", e.button === 2 ? 2 : 1, 0, e.offsetX * TWIPS, e.offsetY * TWIPS));
    });
    w.append(caption, client);
    makeDraggable(w, caption);
    w.addEventListener("mousedown", () => {
      if (this.visible && !modal) {
        entry(() => {
          zOrder = [...zOrder.filter((f) => f !== this), this];
          restack();
          activate(this);
        });
      }
    });
    w.style.left = `${Number(p.ClientLeft) / TWIPS - FRAME}px`;
    w.style.top = `${Number(p.ClientTop) / TWIPS - FRAME - CAPTION}px`;
    desktop.append(w);
    this.win = w;
    this.client = client;
  }

  Show() {
    this.Load();
    if (ended) return;
    if (!this.visible) {
      this.visible = true;
      this.win.style.display = "";
    }
    zOrder = [...zOrder.filter((f) => f !== this), this];
    restack();
    activate(this);
    refit();
  }

  Hide() {
    this.Load();
    if (!this.visible) return;
    this.visible = false;
    this.win.style.display = "none";
    zOrder = zOrder.filter((f) => f !== this);
    if (active === this) activate(zOrder[zOrder.length - 1] ?? null);
    refit();
  }

  // The Unload statement (mode 1) or the user closing the window (mode 0).
  Unload(mode = 1) {
    if (!this.loaded) return;
    this.fire("Form_QueryUnload", 0, mode);
    if (ended || !this.loaded) return;
    this.fire("Form_Unload", 0);
    const wasActive = active === this;
    this.destroy();
    zOrder = zOrder.filter((f) => f !== this);
    if (wasActive) {
      active = null;
      activate(zOrder[zOrder.length - 1] ?? null);
    }
    refit();
  }

  destroy() {
    if (!this.loaded) return;
    for (const c of this.allControls()) if (c instanceof Timer) c.stop();
    this.onUnloaded();
    this.win.remove();
    this.ctls.clear();
    this.loaded = false;
    this.visible = false;
  }

  get Caption(): string { return String(this.p.Caption ?? ""); }
}

// VB's Unload statement.
export const Unload = (f: VBForm) => f.Unload(1);

// Picture values, compared by identity like VB's picture handles.
export { Picture };

// Shell("notepad.exe file"): a Notepad-like window showing the text.
let taskId = 0;
export function notepad(title: string, text: string): number {
  const w = document.createElement("div");
  w.className = "vb-window active vb-notepad";
  w.innerHTML = `<div class="vb-caption"><span class="vb-title"></span><button class="vb-close" title="Close"></button></div>
    <textarea readonly></textarea>`;
  w.querySelector(".vb-title")!.textContent = `Notepad - ${title}`;
  w.querySelector("textarea")!.value = text;
  w.querySelector(".vb-close")!.addEventListener("click", () => {
    w.remove();
    refit();
  });
  w.style.zIndex = "900";
  desktop.append(w);
  refit();
  makeDraggable(w, w.querySelector<HTMLElement>(".vb-caption")!);
  return ++taskId;
}
