/**
 * Headless-browser smoke test for the journey.
 *
 *   npm run build && npm start   (in another terminal, default port 3000)
 *   node scripts/verify-browser.mjs [baseUrl] [--quick]
 *
 * Uses the locally installed Google Chrome via puppeteer-core. Captures
 * console errors and screenshots at each story beat into ./verify-output.
 * Headless Chrome renders WebGL in software (SwiftShader), so frame rates
 * measured here say nothing about real GPU performance.
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const quick = args.includes("--quick");
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const outDir = path.resolve("verify-output");
fs.mkdirSync(outDir, { recursive: true });

const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const STORY_END = 122;
const BEATS = [
  ["00-opening", 0.2],
  ["01-pickup", 9],
  ["02-boarding", 16.5],
  ["03-departure", 26],
  ["04-highway", 34],
  ["05-ghats", 44],
  ["06-ocean-reveal", 54],
  ["07-coast-exit", 59.5],
  ["08-explore", 67],
  ["09-party", 79],
  ["10-reboard", 91],
  ["11-return", 101],
  ["12-home", 112.5],
  ["13-final", 120],
];

const errors = [];
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  protocolTimeout: 900000,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
});

async function openPage(viewport, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  if (opts.reducedMotion) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errors.push(`[${opts.label}] ${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[${opts.label}] pageerror: ${e.message}`));
  await page.goto(`${base}/${opts.query ?? ""}`, { waitUntil: "networkidle0", timeout: 120000 });
  return page;
}

async function waitReady(page) {
  await page.waitForFunction(() => document.querySelector(".loading")?.getAttribute("data-visible") === "false", { timeout: 120000 });
}

async function scrollToStory(page, t) {
  await page.evaluate(
    (t, end) => {
      const el = document.getElementById("journey");
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + (t / end) * (el.offsetHeight - window.innerHeight) + 2);
    },
    t,
    end ?? STORY_END,
  );
}
const end = STORY_END;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The 5 s intro runs on GSAP's ticker, whose lag smoothing caps slow frames
 * at 33 ms. Under software rendering that stretches the intro, so wait on
 * rendered frames instead of wall-clock time.
 */
async function waitFrames(page, n) {
  await page.evaluate(
    (n) =>
      new Promise((res) => {
        let i = 0;
        const f = () => (++i >= n ? res() : requestAnimationFrame(f));
        requestAnimationFrame(f);
      }),
    n,
  );
}

/** Wait until the scrubbed timeline has caught up with the scroll position. */
async function settle(page, t) {
  await page.waitForFunction(
    (target) => {
      const el = document.querySelector(".progress-rail__bar");
      const m = /scaleY\(([-\d.e]+)\)/.exec(el?.style.transform ?? "");
      return !!m && Math.abs(parseFloat(m[1]) - target) < 0.003;
    },
    { timeout: 180000, polling: 400 },
    t / end,
  );
  await sleep(1200);
}

// Desktop journey.
if (!only || only === "desktop") {
  const page = await openPage({ width: 1280, height: 720 }, { label: "desktop" });
  const t0 = Date.now();
  await waitReady(page);
  console.log(`desktop ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await waitFrames(page, 165); // let the intro play
  const beats = quick ? BEATS.filter((_, i) => i % 3 === 0) : BEATS;
  for (const [name, t] of beats) {
    await scrollToStory(page, t);
    await settle(page, t);
    const state = await page.evaluate(() => ({
      overlay: document.querySelector('.overlay-block[data-active="true"] .headline')?.textContent ?? "",
      hud: document.querySelector(".hud__value")?.textContent ?? "",
    }));
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(`${name.padEnd(18)} t=${String(t).padEnd(5)} overlay="${state.overlay}" hud="${state.hud}"`);
  }
  // Reverse scroll: jump back to the pickup and confirm the overlay returns.
  await scrollToStory(page, 16.5);
  await settle(page, 16.5);
  const back = await page.evaluate(() => document.querySelector('.overlay-block[data-active="true"] .headline')?.textContent ?? "");
  await page.screenshot({ path: path.join(outDir, "reverse-boarding.png") });
  console.log(`reverse to boarding overlay="${back}"`);
  // CTA: open the trip finder from the final scene.
  await scrollToStory(page, 120);
  await settle(page, 120);
  await page.click('.overlay-block[data-active="true"] .btn--primary');
  await sleep(600);
  const finderOpen = await page.evaluate(() => document.querySelector("dialog.finder")?.open ?? false);
  await page.screenshot({ path: path.join(outDir, "finder.png") });
  console.log(`trip finder opened: ${finderOpen}`);
  await page.close();
}

// Mobile.
if (!only || only === "mobile") {
  const page = await openPage({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, { label: "mobile" });
  await waitReady(page);
  await waitFrames(page, 165);
  await page.screenshot({ path: path.join(outDir, "mobile-opening.png") });
  for (const [name, t] of [["mobile-coast", 54], ["mobile-final", 120]]) {
    await scrollToStory(page, t);
    await settle(page, t);
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  }
  console.log("mobile screenshots done");
  await page.close();
}

// Reduced motion → the 3D scene still renders (no autoplay motion), never a text-only page.
if (!only || only === "reduced") {
  const page = await openPage({ width: 1280, height: 720 }, { label: "reduced", reducedMotion: true });
  await waitReady(page);
  await scrollToStory(page, 54);
  await settle(page, 54);
  const state = await page.evaluate(() => ({ canvas: !!document.querySelector(".experience-canvas canvas"), fallback: !!document.querySelector(".fallback") }));
  await page.screenshot({ path: path.join(outDir, "reduced-motion.png") });
  console.log(`reduced motion: 3D canvas=${state.canvas} text fallback=${state.fallback}`);
  await page.close();
}

// No WebGL at all → the same still-story fallback.
if (!only || only === "nowebgl") {
  const noGl = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 900000, args: ["--disable-webgl", "--disable-3d-apis", "--no-sandbox"] });
  const page = await noGl.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on("pageerror", (e) => errors.push(`[nowebgl] pageerror: ${e.message}`));
  await page.goto(`${base}/`, { waitUntil: "networkidle0", timeout: 120000 });
  await sleep(1500);
  const state = await page.evaluate(() => ({
    note: document.querySelector(".fallback__note")?.textContent ?? "",
    images: [...document.querySelectorAll(".fallback__image")].filter((i) => i.complete && i.naturalWidth > 0).length,
  }));
  await page.screenshot({ path: path.join(outDir, "no-webgl.png") });
  console.log(`no-webgl fallback: ${state.images} scene stills loaded, note "${state.note.slice(0, 60)}"`);
  await noGl.close();
}

await browser.close();
console.log(`\n${errors.length} console errors/warnings`);
for (const e of errors.slice(0, 40)) console.log("  " + e);
