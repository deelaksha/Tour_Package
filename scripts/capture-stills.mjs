/**
 * Renders one still per story chapter from the live 3D journey (UI hidden)
 * into public/stills/<key>.jpg. The no-WebGL fallback shows these, so the
 * page always has real scenery even when the browser cannot render 3D.
 *
 *   npm run dev            (or npm start)
 *   node scripts/capture-stills.mjs [baseUrl]
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const outDir = path.resolve("public/stills");
fs.mkdirSync(outDir, { recursive: true });

const STORY_END = 122;
/** Overlay key → story time (seconds) that best represents the chapter. */
const SHOTS = { A: 1, B: 10.5, C: 27, D: 43, E: 54, F: 66, G: 80, H: 101, I: 118 };

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  headless: true,
  protocolTimeout: 900000,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
await page.goto(`${base}/?quality=high`, { waitUntil: "networkidle0", timeout: 300000 });
await page.waitForFunction(() => document.querySelector(".loading")?.getAttribute("data-visible") === "false", { timeout: 300000 });
await page.addStyleTag({ content: ".overlay,.hud,.progress-rail,.scroll-prompt,.nav,.grain,.stage-shade,nextjs-portal{display:none!important}" });
// Let the opening reveal finish (it is timed on rendered frames).
await page.evaluate(() => new Promise((r) => { let i = 0; const f = () => (++i > 170 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }));

for (const [key, t] of Object.entries(SHOTS)) {
  await page.evaluate((t, end) => {
    const el = document.getElementById("journey");
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + (t / end) * (el.offsetHeight - window.innerHeight) + 2);
  }, t, STORY_END);
  await page.waitForFunction(
    (p) => {
      const m = /scaleY\(([-\d.e]+)\)/.exec(document.querySelector(".progress-rail__bar")?.style.transform ?? "");
      return !!m && Math.abs(Number(m[1]) - p) < 0.002;
    },
    { timeout: 300000, polling: 300 },
    t / STORY_END,
  );
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, `${key}.jpg`), type: "jpeg", quality: 78 });
  console.log(`still ${key} at t=${t}`);
}
await browser.close();
