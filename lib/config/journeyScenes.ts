/**
 * Story timing. Times are in "story seconds" on the master GSAP timeline;
 * ScrollTrigger maps scroll distance onto this clock. The choreography of the
 * bus, camera, lighting and every traveler is keyed to these constants, so
 * scrubbing backwards always reproduces the exact same frame.
 */
export const T = {
  pickupStart: 6,
  queueStart: 6.3,
  doorOpen1: 12,
  boardStart: 13.3,
  boardInterval: 1.6,
  doorClose1: 22.8,
  headlightsOn: 23.6,
  depart: 24.4,
  highwayStart: 31,
  scenicStart: 41,
  coastalStart: 50,
  coastStop: 57,
  doorOpen2: 57.4,
  exitStart: 58.2,
  exitInterval: 0.6,
  exploreStart: 60,
  celebrationStart: 72,
  partyFull: 77,
  returnBoardStart: 84,
  reboardArrive: 90.5,
  reboardInterval: 1,
  doorClose2: 96.8,
  returnJourneyStart: 97,
  returnDepart: 97.6,
  homecomingStart: 109,
  homeStop: 111.5,
  doorOpen3: 111.9,
  homeExitStart: 112.7,
  finalStart: 116,
  end: 122,
} as const;

export type OverlayKey = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

export interface JourneyScene {
  id: string;
  /** Short label for the HUD / progress rail. */
  label: string;
  start: number;
  overlay: OverlayKey;
  /** Where the HUD says the group currently is. */
  location: string;
}

export const JOURNEY_SCENES: JourneyScene[] = [
  { id: "opening", label: "Opening", start: 0, overlay: "A", location: "Bengaluru · Terminal 01" },
  { id: "pickup", label: "Pickup", start: T.pickupStart, overlay: "B", location: "Bengaluru · Terminal 01" },
  { id: "boarding", label: "Boarding", start: T.boardStart - 1.3, overlay: "B", location: "Bengaluru · Terminal 01" },
  { id: "departure", label: "Departure", start: T.headlightsOn - 0.6, overlay: "C", location: "Leaving Bengaluru" },
  { id: "highway", label: "Highway", start: T.highwayStart, overlay: "D", location: "NH-75 · Westbound" },
  { id: "scenic", label: "Ghats", start: T.scenicStart, overlay: "D", location: "Western Ghats" },
  { id: "coastal", label: "Arrival", start: T.coastalStart, overlay: "E", location: "Karnataka Coast" },
  { id: "exploration", label: "Explore", start: T.exploreStart, overlay: "F", location: "Karnataka Coast" },
  { id: "celebration", label: "Celebrate", start: T.celebrationStart, overlay: "G", location: "Karnataka Coast · Night" },
  { id: "returnBoarding", label: "Reboard", start: T.returnBoardStart, overlay: "H", location: "Karnataka Coast" },
  { id: "returnJourney", label: "Return", start: T.returnJourneyStart, overlay: "H", location: "Eastbound · Bengaluru" },
  { id: "homecoming", label: "Home", start: T.homecomingStart, overlay: "I", location: "Bengaluru · Terminal 01" },
  { id: "final", label: "Your Story", start: T.finalStart, overlay: "I", location: "Bengaluru · Terminal 01" },
];

export function sceneIndexAt(time: number) {
  let idx = 0;
  for (let i = 0; i < JOURNEY_SCENES.length; i++) if (time >= JOURNEY_SCENES[i].start) idx = i;
  return idx;
}

export interface OverlayCopy {
  kicker: string;
  headline: string[];
  body: string;
  align: "left" | "right" | "center";
}

export const OVERLAY_COPY: Record<OverlayKey, OverlayCopy> = {
  A: {
    kicker: "Group journeys across Karnataka",
    headline: ["THE WORLD IS", "WAITING OUT THERE."],
    body: "Not just a trip. A journey worth remembering.",
    align: "left",
  },
  B: {
    kicker: "01 — The pickup",
    headline: ["SIX STRANGERS.", "ONE DEPARTURE."],
    body: "Small groups, hand-picked routes and a host who knows every bend of the road.",
    align: "right",
  },
  C: {
    kicker: "02 — Departure",
    headline: ["LEAVE THE CITY", "AT FIRST LIGHT."],
    body: "Wheels roll before the traffic wakes. By sunrise, the Garden City is behind you.",
    align: "left",
  },
  D: {
    kicker: "03 — The road",
    headline: ["THE ROAD IS PART", "OF THE STORY."],
    body: "Open highway gives way to mist, hairpin bends, waterfalls and the evergreen forests of the Western Ghats.",
    align: "right",
  },
  E: {
    kicker: "04 — Destination",
    headline: ["THE COAST"],
    body: "Some places make you forget to check the time.",
    align: "left",
  },
  F: {
    kicker: "05 — Explore",
    headline: ["WANDER.", "NO SCHEDULE."],
    body: "Free hours are built into every itinerary — for the shoreline, the photograph, the quiet.",
    align: "right",
  },
  G: {
    kicker: "06 — Celebrate",
    headline: ["MAKE IT", "A STORY."],
    body: "Good places become unforgettable with the right people.",
    align: "left",
  },
  H: {
    kicker: "07 — The return",
    headline: ["BRING IT", "ALL HOME."],
    body: "Same seats, new friends. A moonlit drive home to Bengaluru.",
    align: "left",
  },
  I: {
    kicker: "08 — Your turn",
    headline: ["YOUR NEXT STORY", "STARTS HERE."],
    body: "Find your people. Choose your journey. Leave the ordinary behind.",
    align: "left",
  },
};
