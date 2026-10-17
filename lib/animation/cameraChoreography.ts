import * as THREE from "three";
import { CAMERA_SHOTS, INTRO_SHOT, type CameraShot } from "@/lib/config/cameraPoses";
import type { BusPose } from "@/lib/config/route";
import { terrainHeight } from "@/lib/three/terrain";
import { lerpAngle, smoothstep } from "@/lib/utils/math";

export interface ResolvedShot {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export const createResolvedShot = (): ResolvedShot => ({ position: new THREE.Vector3(), target: new THREE.Vector3(), fov: 40 });

function toWorld(v: [number, number, number], shot: CameraShot, bus: BusPose, out: THREE.Vector3) {
  if (shot.frame === "world") return out.set(v[0], v[1], v[2]);
  return out
    .copy(bus.position)
    .addScaledVector(bus.forward, v[0])
    .addScaledVector(bus.left, v[2])
    .setY(bus.position.y + v[1]);
}

export function resolveShot(shot: CameraShot, bus: BusPose, out: ResolvedShot) {
  toWorld(shot.position, shot, bus, out.position);
  toWorld(shot.target, shot, bus, out.target);
  out.fov = shot.fov;
  return out;
}

const a = createResolvedShot();
const b = createResolvedShot();
const intro = createResolvedShot();

/**
 * Camera pose for a fractional shot index. Neighbouring shots are blended
 * (the timeline already applies easing), the intro crane is layered on top,
 * and the result is kept above the terrain.
 */
export function evaluateCamera(shotIndex: number, introWeight: number, bus: BusPose, aspect: number, out: ResolvedShot) {
  const n = CAMERA_SHOTS.length;
  const f = THREE.MathUtils.clamp(shotIndex, 0, n - 1);
  const i = Math.min(Math.floor(f), n - 2);
  const k = f - i;
  resolveShot(CAMERA_SHOTS[i], bus, a);
  resolveShot(CAMERA_SHOTS[i + 1], bus, b);
  out.target.lerpVectors(a.target, b.target, k);
  out.fov = a.fov + (b.fov - a.fov) * k;

  // Blend around the subject (angle, radius, height) rather than in a straight
  // line: the camera swings around the action and never passes over or
  // through it, even when two shots face each other across the subject.
  const angA = Math.atan2(a.position.z - a.target.z, a.position.x - a.target.x);
  const angB = Math.atan2(b.position.z - b.target.z, b.position.x - b.target.x);
  const radius = Math.hypot(a.position.x - a.target.x, a.position.z - a.target.z) * (1 - k) + Math.hypot(b.position.x - b.target.x, b.position.z - b.target.z) * k;
  const height = (a.position.y - a.target.y) * (1 - k) + (b.position.y - b.target.y) * k;
  const ang = lerpAngle(angA, angB, k);
  out.position.set(out.target.x + Math.cos(ang) * radius, out.target.y + height, out.target.z + Math.sin(ang) * radius);

  // Mid-blend arc: lift the camera slightly so long dollies never skim the ground.
  out.position.y += Math.sin(Math.PI * k) * Math.min(4, a.position.distanceTo(b.position) * 0.04);

  if (introWeight > 0) {
    resolveShot(INTRO_SHOT, bus, intro);
    const w = smoothstep(0, 1, introWeight);
    out.position.lerp(intro.position, w);
    out.target.lerp(intro.target, w);
    out.fov += (intro.fov - out.fov) * w;
  }

  // Portrait screens: pull back and widen so the action stays in frame.
  if (aspect < 1) {
    const pull = 1 + (1 - aspect) * 0.85;
    out.position.sub(out.target).multiplyScalar(pull).add(out.target);
    out.fov += (1 - aspect) * 14;
  }

  const ground = terrainHeight(out.position.x, out.position.z);
  out.position.y = Math.max(out.position.y, Math.max(ground, -0.2) + 0.9);
  return out;
}
