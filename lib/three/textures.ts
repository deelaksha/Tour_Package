import * as THREE from "three";
import { mulberry32 } from "@/lib/utils/math";

/** Procedurally painted textures — generated in the browser, no image files. */

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { c, ctx };
}

/** One 10 m tile of two-lane road; repeated along the route. */
export function createRoadTexture(anisotropy = 4) {
  const { c, ctx } = canvas(256, 512);
  const rnd = mulberry32(7);
  ctx.fillStyle = "#1a1d24";
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 9000; i++) {
    const v = 18 + rnd() * 30;
    ctx.fillStyle = `rgba(${v},${v + 2},${v + 6},0.55)`;
    ctx.fillRect(rnd() * 256, rnd() * 512, 1.5, 1.5);
  }
  // Tyre polish in each lane.
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.18, "rgba(255,255,255,0)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.035)");
  grad.addColorStop(0.42, "rgba(255,255,255,0)");
  grad.addColorStop(0.58, "rgba(255,255,255,0)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.035)");
  grad.addColorStop(0.82, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);
  // Edge lines.
  ctx.fillStyle = "#d9dee8";
  ctx.fillRect(10, 0, 5, 512);
  ctx.fillRect(241, 0, 5, 512);
  // Centre dashes: 3 m on, 2 m off per 5 m → two per tile.
  ctx.fillStyle = "#f2c14e";
  ctx.fillRect(125, 0, 6, 154);
  ctx.fillRect(125, 256, 6, 154);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSandTexture() {
  const { c, ctx } = canvas(256, 256);
  const rnd = mulberry32(11);
  ctx.fillStyle = "#c8a77c";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 12000; i++) {
    const l = 150 + rnd() * 80;
    ctx.fillStyle = `rgba(${l},${l * 0.85},${l * 0.62},0.35)`;
    ctx.fillRect(rnd() * 256, rnd() * 256, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Illuminated sign panel with technical typography. */
export function createSignTexture(lines: { text: string; size: number; color: string; weight?: number }[], width = 1024, height = 256, accent = "#f2c46b") {
  const { c, ctx } = canvas(width, height);
  ctx.fillStyle = "#123326";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 10, height);
  ctx.globalAlpha = 0.18;
  for (let x = 30; x < width; x += 24) ctx.fillRect(x, height - 14, 12, 3);
  ctx.globalAlpha = 1;
  let y = 0;
  const total = lines.reduce((s, l) => s + l.size * 1.25, 0);
  y = (height - total) / 2;
  for (const l of lines) {
    ctx.font = `${l.weight ?? 600} ${l.size}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = l.color;
    ctx.textBaseline = "top";
    ctx.fillText(l.text, 44, y);
    y += l.size * 1.25;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
