// frmMain's pictures (the three tracks, the racers, the players' portraits)
// drawn by a Phaser scene under the form's labels. The scene only renders
// the Image controls' state; frmMain's timers move them as in the original.
import * as Phaser from "phaser";
import { artUrl } from "../art.ts";
import { Image, TWIPS, type VBForm } from "../vb/runtime.ts";

class RaceScene extends Phaser.Scene {
  private sprites = new Map<Image, Phaser.GameObjects.Image>();

  constructor(private readonly form: VBForm, private readonly images: Image[]) {
    super("race");
  }

  preload() {
    for (const url of new Set(this.images.map((i) => i.Picture && artUrl(i.Picture.key)).filter(Boolean)))
      this.load.image(url as string, url as string);
  }

  create() {
    // FRM order is front to back: add the backmost first.
    const z = (img: Image) => this.form.layout.controls.indexOf(img.layout);
    [...this.images].sort((a, b) => z(b) - z(a)).forEach((img) => {
      const s = this.add.image(0, 0, "__DEFAULT").setOrigin(0, 0);
      s.setInteractive();
      s.on("pointerdown", () => img.fireEventSafe("Click"));
      this.sprites.set(img, s);
    });
    this.input.on("pointerdown", (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length) this.form.fireSafe("Form_Click");
    });
  }

  update() {
    for (const [img, s] of this.sprites) {
      const key = img.Picture ? artUrl(img.Picture.key) : null;
      s.setVisible(img.Visible && !!key);
      if (key && s.texture.key !== key) s.setTexture(key);
      s.setPosition(img.Left / TWIPS, img.Top / TWIPS);
      s.setDisplaySize(img.Width / TWIPS, img.Height / TWIPS);
    }
  }
}

export class RaceView {
  private game: Phaser.Game;

  constructor(form: VBForm) {
    const images = form.allControls().filter((c): c is Image => c instanceof Image);
    const host = document.createElement("div");
    host.className = "vb-canvas";
    form.client.prepend(host);
    const w = form.client.clientWidth || parseInt(form.client.style.width);
    const h = form.client.clientHeight || parseInt(form.client.style.height);
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: w,
      height: h,
      transparent: true,
      pixelArt: true,
      scene: new RaceScene(form, images),
      banner: false,
      audio: { noAudio: true },
    });
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__race = this.game;
  }

  destroy() {
    if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>).__race;
    this.game.destroy(true);
  }
}
