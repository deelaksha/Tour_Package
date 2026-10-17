/**
 * Mutable, render-loop friendly journey state. GSAP writes the channels, the
 * R3F scene reads them every frame. React only hears about coarse changes
 * (the active scene) through `subscribeScene`, so scrolling never triggers a
 * React render per frame.
 */
import { S_PICKUP } from "@/lib/config/route";
import { sceneIndexAt } from "@/lib/config/journeyScenes";

export interface JourneyChannels {
  /** Arc length of the bus along the route path (metres). */
  busS: number;
  /** 0 closed → 1 open. */
  door: number;
  headlights: number;
  /** Fractional index into CAMERA_SHOTS. */
  shot: number;
  /** Fractional index into ATMOSPHERES. */
  atmo: number;
  /** Party lighting intensity. */
  party: number;
}

export const journey = {
  channels: { busS: S_PICKUP, door: 0, headlights: 0, shot: 0, atmo: 0, party: 0 } as JourneyChannels,
  /** Story clock — the master timeline's playhead in seconds. */
  time: 0,
  /** 0..1 progress through the whole journey. */
  progress: 0,
  /** 0..1 intro reveal that plays once on load before the user scrolls. */
  intro: 0,
  /** Normalised pointer position for subtle camera parallax. */
  pointer: { x: 0, y: 0 },
  sceneIndex: 0,
};

type Listener = (index: number) => void;
const listeners = new Set<Listener>();

export function subscribeScene(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setJourneyTime(time: number, progress: number) {
  journey.time = time;
  journey.progress = progress;
  const idx = sceneIndexAt(time);
  if (idx !== journey.sceneIndex) {
    journey.sceneIndex = idx;
    listeners.forEach((fn) => fn(idx));
  }
}

export const getSceneIndex = () => journey.sceneIndex;

/** Metres the bus starts behind the pickup point before the intro drive-in. */
const INTRO_APPROACH = 70;

/**
 * Bus arc length actually rendered: the timeline value, minus the remaining
 * intro approach. The intro offset fades out as soon as the story advances,
 * so scrolling during the intro never fights the timeline.
 */
export function effectiveBusS() {
  const introLeft = 1 - journey.intro;
  const fade = 1 - Math.min(1, Math.max(0, journey.time / 4));
  const k = introLeft * fade;
  return journey.channels.busS - INTRO_APPROACH * k * k * (3 - 2 * k);
}
