/**
 * Procedural character animation.
 *
 * A pose is a flat vector of joint angles so states can be cross-faded with a
 * single lerp. Each traveler runs a timed finite-state machine (see
 * choreography.ts); this module turns "state + local time" into a pose.
 *
 * Conventions (all radians, character faces +Z):
 *   shoulder/hip "swing" > 0 moves the limb forward, "out" > 0 raises it sideways,
 *   elbow/knee > 0 bends the joint, spine/head X > 0 leans/nods forward.
 */

export const J = {
  RootY: 0,
  RootX: 1,
  RootYaw: 2,
  SpineX: 3,
  SpineY: 4,
  SpineZ: 5,
  HeadX: 6,
  HeadY: 7,
  LShSwing: 8,
  LShOut: 9,
  LElbow: 10,
  RShSwing: 11,
  RShOut: 12,
  RElbow: 13,
  LHip: 14,
  LKnee: 15,
  RHip: 16,
  RKnee: 17,
  COUNT: 18,
} as const;

export type Pose = Float32Array;
export const createPose = (): Pose => new Float32Array(J.COUNT);

export type CharacterState =
  | "idle" | "chat" | "walk" | "board" | "exit" | "ride" | "look"
  | "photo" | "sit" | "celebrate" | "dance" | "wave";

export interface PoseContext {
  /** Seconds since this state began on the story clock. */
  local: number;
  /** 0..1 progress through a timed state (walk, board, exit). */
  progress: number;
  /** Distance walked in metres — drives the stride so feet never slide. */
  distance: number;
  /** Free-running wall clock for ambient loops (breathing, dancing). */
  clock: number;
  /** Per-character phase offset so the group never moves in lockstep. */
  seed: number;
  variant: number;
}

const { sin, cos, abs, max, PI } = Math;
const STRIDE = 1.45;

function base(p: Pose, ctx: PoseContext) {
  p.fill(0);
  const breathe = sin(ctx.clock * 1.6 + ctx.seed * 3);
  p[J.SpineX] = 0.02 + breathe * 0.012;
  p[J.LShOut] = 0.08;
  p[J.RShOut] = 0.08;
  p[J.LElbow] = 0.15;
  p[J.RElbow] = 0.15;
  p[J.HeadY] = sin(ctx.clock * 0.37 + ctx.seed * 7) * 0.25 * max(0, sin(ctx.clock * 0.21 + ctx.seed));
}

function walkCycle(p: Pose, phase: number, energy = 1) {
  const s = sin(phase);
  const c = cos(phase);
  p[J.LHip] = 0.42 * s * energy;
  p[J.RHip] = -0.42 * s * energy;
  p[J.LKnee] = 0.1 + 0.75 * max(0, c) * energy;
  p[J.RKnee] = 0.1 + 0.75 * max(0, -c) * energy;
  p[J.LShSwing] = -0.38 * s * energy;
  p[J.RShSwing] = 0.38 * s * energy;
  p[J.LElbow] = 0.35 + 0.2 * max(0, -s);
  p[J.RElbow] = 0.35 + 0.2 * max(0, s);
  p[J.RootY] = -0.035 * abs(c) * energy;
  p[J.SpineY] = 0.08 * s * energy;
  p[J.SpineX] = 0.06;
}

export function evaluatePose(state: CharacterState, ctx: PoseContext, out: Pose) {
  base(out, ctx);
  const t = ctx.clock + ctx.seed * 10;
  switch (state) {
    case "idle": {
      out[J.RootX] = sin(t * 0.5) * 0.02;
      out[J.SpineZ] = sin(t * 0.5) * 0.03;
      out[J.LHip] = 0.04;
      out[J.RKnee] = 0.08 + sin(t * 0.5) * 0.05;
      break;
    }
    case "chat": {
      // Talking with hands: one arm gestures, head nods along.
      const g = max(0, sin(t * 1.3));
      out[J.RShSwing] = 0.3 + g * 0.5;
      out[J.RElbow] = 1.1 + sin(t * 3.1) * 0.25 * g;
      out[J.RShOut] = 0.15;
      out[J.HeadX] = sin(t * 2.2) * 0.06;
      out[J.HeadY] = sin(t * 0.6) * 0.35;
      out[J.SpineZ] = sin(t * 0.4) * 0.04;
      out[J.LKnee] = 0.12;
      break;
    }
    case "walk": {
      walkCycle(out, (ctx.distance / STRIDE) * PI * 2);
      break;
    }
    case "board":
    case "exit": {
      // Two-step climb: knees lift higher, torso leans into the step.
      const steps = state === "board" ? ctx.progress : 1 - ctx.progress;
      walkCycle(out, steps * PI * 3, 1.25);
      out[J.LKnee] *= 1.4;
      out[J.RKnee] *= 1.4;
      out[J.SpineX] = state === "board" ? 0.22 : 0.1;
      out[J.RShSwing] = 0.6; // reaching for the handrail
      out[J.RElbow] = 0.6;
      out[J.RShOut] = 0.35;
      break;
    }
    case "ride":
    case "sit": {
      const onSand = state === "sit";
      out[J.RootY] = onSand ? -0.74 : -0.42;
      out[J.LHip] = 1.45;
      out[J.RHip] = 1.45;
      out[J.LKnee] = onSand ? 0.9 : 1.5;
      out[J.RKnee] = onSand ? 0.5 : 1.5;
      out[J.SpineX] = onSand ? -0.12 : 0.02 + sin(t * 2.3) * 0.015;
      if (onSand) {
        out[J.LShSwing] = -0.55;
        out[J.RShSwing] = -0.55;
        out[J.LShOut] = 0.3;
        out[J.RShOut] = 0.3;
        out[J.LElbow] = 0.05;
        out[J.RElbow] = 0.05;
        out[J.HeadX] = -0.08;
      } else {
        out[J.LShSwing] = 0.5;
        out[J.RShSwing] = 0.5;
        out[J.LElbow] = 0.9;
        out[J.RElbow] = 0.9;
        out[J.SpineZ] = sin(t * 1.1) * 0.03;
      }
      break;
    }
    case "look": {
      // Shading the eyes and scanning the horizon.
      out[J.RShSwing] = 2.2;
      out[J.RShOut] = 0.5;
      out[J.RElbow] = 2.0;
      out[J.HeadY] = sin(t * 0.45) * 0.45;
      out[J.HeadX] = -0.08;
      out[J.SpineZ] = 0.04;
      out[J.LKnee] = 0.1;
      break;
    }
    case "photo": {
      out[J.LShSwing] = 1.25;
      out[J.RShSwing] = 1.25;
      out[J.LShOut] = -0.3;
      out[J.RShOut] = -0.3;
      out[J.LElbow] = 1.75;
      out[J.RElbow] = 1.75;
      out[J.SpineX] = 0.08 + sin(t * 0.8) * 0.03;
      out[J.HeadX] = 0.06;
      out[J.LKnee] = 0.25;
      out[J.RKnee] = 0.25;
      out[J.RootY] = -0.05;
      out[J.SpineY] = sin(t * 0.5) * 0.12;
      break;
    }
    case "celebrate": {
      const j = max(0, sin(t * 4.2));
      out[J.RootY] = j * 0.16;
      out[J.LShOut] = 2.5 + sin(t * 4.2) * 0.2;
      out[J.RShOut] = 2.5 + sin(t * 4.2 + 0.4) * 0.2;
      out[J.LElbow] = 0.3;
      out[J.RElbow] = 0.3;
      out[J.LKnee] = 0.4 * (1 - j);
      out[J.RKnee] = 0.4 * (1 - j);
      out[J.LHip] = 0.2 * (1 - j);
      out[J.RHip] = 0.2 * (1 - j);
      out[J.HeadX] = -0.2;
      break;
    }
    case "wave": {
      out[J.RShOut] = 2.6;
      out[J.RShSwing] = 0.3;
      out[J.RElbow] = 0.5 + sin(t * 6) * 0.35;
      out[J.SpineZ] = -0.06;
      out[J.HeadY] = 0;
      out[J.LKnee] = 0.1;
      break;
    }
    case "dance": {
      dance(out, t, ctx.variant);
      break;
    }
  }
  return out;
}

function dance(p: Pose, t: number, variant: number) {
  const beat = t * PI * 2 * (118 / 60) * 0.5; // ~118 bpm, one cycle per two beats
  const s = sin(beat);
  const s2 = sin(beat * 2);
  switch (variant % 4) {
    case 0: {
      // Groove: knee bounce, hip sway, alternating fist pumps.
      p[J.RootY] = -0.06 - 0.06 * abs(s2);
      p[J.LKnee] = 0.35 + 0.25 * abs(s2);
      p[J.RKnee] = 0.35 + 0.25 * abs(s2);
      p[J.LHip] = 0.2;
      p[J.RHip] = 0.2;
      p[J.SpineZ] = s * 0.14;
      p[J.SpineX] = 0.12;
      p[J.LShSwing] = 0.8 + 0.7 * max(0, s);
      p[J.RShSwing] = 0.8 + 0.7 * max(0, -s);
      p[J.LElbow] = 1.5;
      p[J.RElbow] = 1.5;
      p[J.HeadX] = 0.1 * s2;
      break;
    }
    case 1: {
      // Hands up, swaying side to side.
      p[J.RootX] = s * 0.12;
      p[J.SpineZ] = -s * 0.18;
      p[J.LShOut] = 2.4 + s * 0.25;
      p[J.RShOut] = 2.4 - s * 0.25;
      p[J.LElbow] = 0.4;
      p[J.RElbow] = 0.4;
      p[J.LKnee] = 0.2 + 0.3 * max(0, s);
      p[J.RKnee] = 0.2 + 0.3 * max(0, -s);
      p[J.RootY] = -0.04 * abs(s2);
      p[J.HeadX] = -0.15;
      p[J.HeadY] = s * 0.2;
      break;
    }
    case 2: {
      // Twist: torso counter-rotates against the hips, arms bent at the chest.
      p[J.RootYaw] = s * 0.35;
      p[J.SpineY] = -s * 0.6;
      p[J.LShSwing] = 0.6;
      p[J.RShSwing] = 0.6;
      p[J.LShOut] = 0.5;
      p[J.RShOut] = 0.5;
      p[J.LElbow] = 1.9;
      p[J.RElbow] = 1.9;
      p[J.LKnee] = 0.5 + 0.2 * s;
      p[J.RKnee] = 0.5 - 0.2 * s;
      p[J.LHip] = 0.3;
      p[J.RHip] = 0.3;
      p[J.RootY] = -0.12;
      break;
    }
    default: {
      // Step-touch with a clap on every beat.
      p[J.RootX] = s * 0.22;
      p[J.LHip] = 0.15 + 0.35 * max(0, s);
      p[J.RHip] = 0.15 + 0.35 * max(0, -s);
      p[J.LKnee] = 0.2 + 0.6 * max(0, s);
      p[J.RKnee] = 0.2 + 0.6 * max(0, -s);
      const clap = abs(s2);
      p[J.LShSwing] = 1.1;
      p[J.RShSwing] = 1.1;
      p[J.LShOut] = -0.1 + clap * 0.5;
      p[J.RShOut] = -0.1 + clap * 0.5;
      p[J.LElbow] = 1.3;
      p[J.RElbow] = 1.3;
      p[J.SpineZ] = s * 0.1;
      p[J.HeadY] = s * 0.25;
      p[J.RootY] = -0.03 * clap;
      break;
    }
  }
}

export function blendPose(a: Pose, b: Pose, w: number, out: Pose) {
  for (let i = 0; i < J.COUNT; i++) out[i] = a[i] + (b[i] - a[i]) * w;
  return out;
}
