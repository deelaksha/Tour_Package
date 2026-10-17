import { getBusPose, S_COAST, S_HOME, S_PICKUP, type BusPose } from "@/lib/config/route";
import { T } from "@/lib/config/journeyScenes";
import { TRAVELERS } from "@/lib/config/travelers";
import { lerp, lerpAngle, smoothstep } from "@/lib/utils/math";
import {
  blendPose,
  createPose,
  evaluatePose,
  type CharacterState,
  type Pose,
  type PoseContext,
} from "./characterStates";

/**
 * Every traveler owns a timed finite-state machine: an ordered list of actions
 * on the story clock. Evaluating it at any time t is a pure function, which is
 * what makes reverse scrolling and fast scrubbing reliable — there is no
 * accumulated state to get out of sync with the scroll position.
 */

export interface Vec2 {
  x: number;
  z: number;
}

type HoldState = Exclude<CharacterState, "walk" | "board" | "exit" | "ride">;

type Action =
  | { kind: "hold"; start: number; state: HoldState; at: Vec2; heading: number; variant: number }
  | { kind: "walk"; start: number; end: number; path: Vec2[]; cumulative: number[]; total: number }
  | { kind: "board" | "exit"; start: number; end: number; from: Vec2; to: Vec2; heading: number }
  | { kind: "ride"; start: number; seat: number };

export interface DoorAnchor {
  outside: Vec2;
  inside: Vec2;
  /** Heading that faces into the bus. */
  intoBus: number;
}

/** Bus-local seat positions (x forward, z right) for riders seen through the windows. */
export const SEATS: { x: number; z: number }[] = [
  { x: 1.4, z: -0.55 }, { x: 1.4, z: 0.55 },
  { x: 0.1, z: -0.55 }, { x: 0.1, z: 0.55 },
  { x: -1.2, z: -0.55 }, { x: -1.2, z: 0.55 },
];

export const DOOR_LOCAL_X = 2.85;
export const DOOR_FLOOR = 0.78;
const CLIMB = 1.0;
const DESCEND = 0.8;
const BLEND = 0.35;

export const face = (from: Vec2, to: Vec2) => Math.atan2(to.x - from.x, to.z - from.z);
const v = (x: number, z: number): Vec2 => ({ x, z });
const dist = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.z - a.z);

function doorAnchor(pose: BusPose): DoorAnchor {
  const p = pose.position;
  const at = (side: number): Vec2 => ({
    x: p.x + pose.forward.x * DOOR_LOCAL_X + pose.left.x * side,
    z: p.z + pose.forward.z * DOOR_LOCAL_X + pose.left.z * side,
  });
  const outside = at(2.05);
  const inside = at(0.7);
  return { outside, inside, intoBus: face(outside, inside) };
}

export const PICKUP_POSE = getBusPose(S_PICKUP);
export const COAST_POSE = getBusPose(S_COAST);
export const HOME_POSE = getBusPose(S_HOME);
const PICKUP_DOOR = doorAnchor(PICKUP_POSE);
const COAST_DOOR = doorAnchor(COAST_POSE);
const HOME_DOOR = doorAnchor(HOME_POSE);

export const BONFIRE: Vec2 = v(925.5, -50.8);

class Script {
  actions: Action[] = [];
  pos: Vec2;
  heading: number;

  constructor(at: Vec2, heading: number, state: HoldState, variant = 0) {
    this.pos = { ...at };
    this.heading = heading;
    this.hold(-1e6, state, heading, variant);
  }

  hold(time: number, state: HoldState, heading = this.heading, variant = 0) {
    // A beat can never start before the previous one has had time to read.
    const last = this.actions[this.actions.length - 1];
    if (last) time = Math.max(time, ("end" in last ? last.end : last.start + 0.6));
    this.actions.push({ kind: "hold", start: time, state, at: { ...this.pos }, heading, variant });
    this.heading = heading;
    return this;
  }

  /** Walk a polyline starting at `time`; returns the arrival time. */
  walk(time: number, points: Vec2[], speed = 1.5) {
    const last = this.actions[this.actions.length - 1];
    if (last) time = Math.max(time, "end" in last ? last.end : last.start + 0.3);
    const path = [{ ...this.pos }, ...points];
    const cumulative = [0];
    for (let i = 1; i < path.length; i++) cumulative.push(cumulative[i - 1] + dist(path[i - 1], path[i]));
    const total = cumulative[cumulative.length - 1];
    const end = time + total / speed;
    this.actions.push({ kind: "walk", start: time, end, path, cumulative, total });
    const a = path[path.length - 2];
    const b = path[path.length - 1];
    this.pos = { ...b };
    this.hold(end, "idle", face(a, b));
    return end;
  }

  /** Walk so that the traveler arrives exactly at `arrival`. */
  walkArriving(arrival: number, points: Vec2[], speed = 1.5) {
    let total = 0;
    let prev = this.pos;
    for (const p of points) {
      total += dist(prev, p);
      prev = p;
    }
    return this.walk(arrival - total / speed, points, speed);
  }

  board(time: number, door: DoorAnchor, seat: number) {
    this.actions.push({ kind: "board", start: time, end: time + CLIMB, from: door.outside, to: door.inside, heading: door.intoBus });
    this.actions.push({ kind: "ride", start: time + CLIMB, seat });
    return time + CLIMB;
  }

  exit(time: number, door: DoorAnchor) {
    const heading = door.intoBus + Math.PI;
    this.actions.push({ kind: "exit", start: time, end: time + DESCEND, from: door.inside, to: door.outside, heading });
    this.pos = { ...door.outside };
    this.hold(time + DESCEND, "idle", heading);
    return time + DESCEND;
  }
}

function buildScripts(): Script[] {
  const scripts: Script[] = [];
  const fwdP = PICKUP_POSE.forward;
  const leftP = PICKUP_POSE.left;
  const queueSpot = (k: number): Vec2 => ({
    x: PICKUP_DOOR.outside.x - fwdP.x * (1.3 + k * 1.0) + leftP.x * 0.35,
    z: PICKUP_DOOR.outside.z - fwdP.z * (1.3 + k * 1.0) + leftP.z * 0.35,
  });
  const towardDoor = Math.atan2(fwdP.x, fwdP.z);

  // Opening tableau: four friends chatting in a ring, two more arriving together.
  const ring = v(35.5, -9.8);
  const starts: Vec2[] = [
    ...[0, 1, 2, 3].map((i) => {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      return v(ring.x + Math.cos(a) * 1.2, ring.z + Math.sin(a) * 1.2);
    }),
    v(30.5, -10.6),
    v(31.4, -11.8),
  ];

  // Exploration spots on the sand between the coastal plaza and the shoreline.
  const explore: Vec2[] = [v(918.5, -54.5), v(921.6, -56.6), v(925, -57.2), v(930.4, -53.4), v(932.2, -56.6), v(935.4, -55)];
  // Ring slots around the fire, chosen so nobody crosses the group to reach theirs.
  const ringAngles = [200, 245, 290, 20, 335, 80];
  const partyRing = (k: number) => {
    const a = (ringAngles[k] * Math.PI) / 180;
    return v(BONFIRE.x + Math.cos(a) * 2.6, BONFIRE.z + Math.sin(a) * 2.6);
  };
  const homeSpots: Vec2[] = [30.5, 32.3, 34.1, 35.9, 37.7, 39.5].map((x, i) => v(x, 7.6 + (i % 2) * 0.7));
  const finalCamera = v(-10, 42);

  let reboardPrev = -Infinity;

  TRAVELERS.forEach((look, k) => {
    const s0 = starts[k];
    const chatFace = k < 4 ? face(s0, ring) : face(s0, starts[k === 4 ? 5 : 4]);
    const sc = new Script(s0, chatFace, k % 2 === 0 ? "chat" : "idle");

    // B — walk to the queue, then up to the door, timed to a strict boarding cadence.
    sc.walk(T.queueStart + k * 0.35, [queueSpot(k)], 1.45);
    sc.hold(sc.actions[sc.actions.length - 1].start + 0.4, k === 2 ? "look" : "idle", towardDoor);
    const arrive = T.boardStart + k * T.boardInterval;
    sc.walkArriving(arrive, [PICKUP_DOOR.outside], 1.35);
    sc.board(arrive, PICKUP_DOOR, k);

    // E — step off at the coast and wander down to the sand.
    const out = T.exitStart + k * T.exitInterval;
    sc.exit(out, COAST_DOOR);
    const spot = explore[k];
    const mid = v(lerp(COAST_DOOR.outside.x, spot.x, 0.35), -46.5);
    const at = sc.walk(out + DESCEND + 0.15, [mid, spot], 1.7);
    const sea = v(spot.x, -80);

    // F — sequenced exploration beats.
    switch (k) {
      case 0:
        sc.hold(at + 0.2, "look", face(spot, sea));
        break;
      case 1:
        sc.hold(at + 0.2, "idle", face(spot, sea));
        sc.hold(at + 1.4, "sit", face(spot, sea));
        break;
      case 2:
        sc.hold(at + 0.2, "look", face(spot, sea));
        sc.hold(Math.max(at + 2.5, 69), "celebrate", face(spot, sea));
        break;
      case 3:
        sc.hold(at + 0.2, "photo", face(spot, v(925, -56.5)));
        break;
      case 4:
        sc.hold(at + 0.2, "idle", face(spot, sea));
        sc.hold(Math.max(at + 1.2, 69.5), "sit", face(spot, sea));
        break;
      default: {
        const end = sc.walk(at + 0.3, [v(938.2, -58)], 1.2);
        sc.hold(end + 0.2, "look", face(v(938.2, -58), v(938.2, -80)));
      }
    }

    // G — gather at the bonfire and dance.
    const p = partyRing(k);
    const arriveParty = sc.walk(T.celebrationStart + k * 0.3, [p], 1.6);
    const toFire = face(p, BONFIRE);
    sc.hold(arriveParty + 0.2, k === 3 ? "celebrate" : "dance", toFire, look.dance);
    sc.hold(T.partyFull + 2.5 + k * 0.2, "dance", toFire, (look.dance + 1) % 4);
    sc.hold(T.partyFull + 4.5 + (k % 3) * 0.4, k % 2 ? "celebrate" : "dance", toFire, (look.dance + 2) % 4);

    // H — back to the bus in order, then the long ride home.
    const walkDist = dist(p, COAST_DOOR.outside);
    const reArrive = Math.max(T.reboardArrive + k * T.reboardInterval, T.returnBoardStart + walkDist / 1.75, reboardPrev + 0.95);
    reboardPrev = reArrive;
    sc.walkArriving(reArrive, [COAST_DOOR.outside], 1.75);
    sc.board(reArrive, COAST_DOOR, k);

    // I — home: step down and wave to the camera.
    const homeOut = T.homeExitStart + k * T.exitInterval;
    sc.exit(homeOut, HOME_DOOR);
    const hs = homeSpots[k];
    const there = sc.walk(homeOut + DESCEND + 0.1, [hs], 1.4);
    sc.hold(there + 0.2, "idle", face(hs, finalCamera));
    sc.hold(Math.max(there + 0.8, T.finalStart + k * 0.15), k % 3 === 1 ? "celebrate" : "wave", face(hs, finalCamera));

    scripts.push(sc);
  });
  return scripts;
}

export const SCRIPTS = buildScripts();

/** Latest scheduled event, used by tests to make sure the story fits the timeline. */
export function scriptSummary() {
  return SCRIPTS.map((s) =>
    s.actions.map((a) => ({ kind: a.kind, start: +a.start.toFixed(2), end: "end" in a ? +a.end.toFixed(2) : undefined })),
  );
}

export interface TravelerFrame {
  x: number;
  z: number;
  /** Extra height above the ground (climbing the bus steps). */
  lift: number;
  heading: number;
  riding: boolean;
  seat: number;
  /** True while the feet are on the bus steps rather than the ground. */
  onSteps: boolean;
  state: CharacterState;
  pose: Pose;
}

export function createFrame(): TravelerFrame {
  return { x: 0, z: 0, lift: 0, heading: 0, riding: false, seat: 0, onSteps: false, state: "idle", pose: createPose() };
}

const scratchA = createPose();
const scratchB = createPose();
const tmpPos = { x: 0, z: 0, heading: 0, lift: 0 };

function locate(a: Action, t: number, out: typeof tmpPos) {
  switch (a.kind) {
    case "hold":
      out.x = a.at.x;
      out.z = a.at.z;
      out.heading = a.heading;
      out.lift = 0;
      return 0;
    case "walk": {
      const d = Math.min(Math.max(0, (t - a.start) / (a.end - a.start)), 1) * a.total;
      let i = 1;
      while (i < a.cumulative.length - 1 && a.cumulative[i] < d) i++;
      const p0 = a.path[i - 1];
      const p1 = a.path[i];
      const segLen = a.cumulative[i] - a.cumulative[i - 1] || 1;
      const f = (d - a.cumulative[i - 1]) / segLen;
      out.x = lerp(p0.x, p1.x, f);
      out.z = lerp(p0.z, p1.z, f);
      // Look ahead so corners are rounded rather than snapped.
      let h = face(p0, p1);
      if (i < a.path.length - 1) h = lerpAngle(h, face(p1, a.path[i + 1]), smoothstep(segLen - 0.8, segLen, d - a.cumulative[i - 1]));
      out.heading = h;
      out.lift = 0;
      return d;
    }
    case "board":
    case "exit": {
      const p = Math.min(Math.max(0, (t - a.start) / (a.end - a.start)), 1);
      out.x = lerp(a.from.x, a.to.x, p);
      out.z = lerp(a.from.z, a.to.z, p);
      out.heading = a.heading;
      // Two discrete steps up (or down) to the bus floor.
      const climb = a.kind === "board" ? p : 1 - p;
      const steps = Math.min(2, climb * 2.4);
      out.lift = (Math.floor(steps) + smoothstep(0.2, 0.9, steps % 1)) * (DOOR_FLOOR / 2);
      return p;
    }
    case "ride":
      out.x = 0;
      out.z = 0;
      out.heading = 0;
      out.lift = 0;
      return 0;
  }
}

function stateOf(a: Action): CharacterState {
  return a.kind === "hold" ? a.state : a.kind;
}

function poseFor(a: Action, t: number, clock: number, seed: number, out: Pose) {
  const progressOrDist = locate(a, t, tmpPos);
  const ctx: PoseContext = {
    local: t - a.start,
    progress: a.kind === "board" || a.kind === "exit" ? progressOrDist : 0,
    distance: a.kind === "walk" ? progressOrDist : 0,
    clock,
    seed,
    variant: a.kind === "hold" ? a.variant : 0,
  };
  return evaluatePose(stateOf(a), ctx, out);
}

export function evaluateTraveler(index: number, t: number, clock: number, out: TravelerFrame) {
  const actions = SCRIPTS[index].actions;
  let i = 0;
  while (i < actions.length - 1 && actions[i + 1].start <= t) i++;
  const cur = actions[i];
  const prev = i > 0 ? actions[i - 1] : undefined;
  const seed = index * 0.37 + 0.11;

  poseFor(cur, t, clock, seed, scratchB);
  out.x = tmpPos.x;
  out.z = tmpPos.z;
  out.lift = tmpPos.lift;
  out.state = stateOf(cur);
  out.riding = cur.kind === "ride";
  out.seat = cur.kind === "ride" ? cur.seat : 0;
  out.onSteps = cur.kind === "board" || cur.kind === "exit";
  let heading = tmpPos.heading;

  const w = smoothstep(0, BLEND, t - cur.start);
  const teleport = cur.kind === "ride" || prev?.kind === "ride";
  if (prev && w < 1 && !teleport) {
    poseFor(prev, Math.min(t, "end" in prev ? prev.end : t), clock, seed, scratchA);
    blendPose(scratchA, scratchB, w, out.pose);
    heading = lerpAngle(tmpPos.heading, heading, smoothstep(0, 0.5, t - cur.start));
  } else {
    out.pose.set(scratchB);
  }
  out.heading = heading;
  return out;
}
