import { T } from "@/lib/config/journeyScenes";

/** Scroll the window so the journey timeline lands on story time `time`. */
export function scrollToStoryTime(time: number, smooth = true) {
  const el = document.getElementById("journey");
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const range = el.offsetHeight - window.innerHeight;
  window.scrollTo({ top: top + (Math.min(time, T.end) / T.end) * range + 2, behavior: smooth ? "smooth" : "auto" });
}

export function scrollToId(id: string, smooth = true) {
  document.getElementById(id)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}
