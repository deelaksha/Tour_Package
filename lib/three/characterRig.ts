import * as THREE from "three";
import type { TravelerLook } from "@/lib/config/travelers";
import { J, type Pose } from "@/lib/animation/characterStates";

/**
 * Procedural articulated character. The joint hierarchy mirrors a standard
 * humanoid skeleton (hips → spine → neck/head, shoulders → elbows,
 * hips → knees), so a rigged GLB could later be driven by the same pose data.
 */
export interface CharacterRig {
  root: THREE.Group;
  hips: THREE.Group;
  spine: THREE.Group;
  head: THREE.Group;
  lShoulder: THREE.Group;
  lElbow: THREE.Group;
  rShoulder: THREE.Group;
  rElbow: THREE.Group;
  lHip: THREE.Group;
  lKnee: THREE.Group;
  rHip: THREE.Group;
  rKnee: THREE.Group;
  /** Hand-held camera, shown only while taking a photo. */
  handCamera: THREE.Object3D;
}

const HIP_HEIGHT = 0.93;
const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.MeshStandardMaterial>();

function geo(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

function mat(color: string, roughness = 0.75, metalness = 0) {
  const key = `${color}|${roughness}|${metalness}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    matCache.set(key, m);
  }
  return m;
}

const capsule = (r: number, len: number) => geo(`cap${r}|${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 12));
const sphere = (r: number) => geo(`sph${r}`, () => new THREE.SphereGeometry(r, 18, 14));
const box = (x: number, y: number, z: number) => geo(`box${x}|${y}|${z}`, () => new THREE.BoxGeometry(x, y, z));
const cap = (r: number, theta: number) => geo(`hair${r}|${theta}`, () => new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, theta));

function mesh(g: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number] = [0, 0, 0], scale?: [number, number, number]) {
  const o = new THREE.Mesh(g, m);
  o.position.set(...pos);
  if (scale) o.scale.set(...scale);
  o.castShadow = true;
  return o;
}

function group(parent: THREE.Object3D, pos: [number, number, number] = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...pos);
  parent.add(g);
  return g;
}

export function buildCharacter(look: TravelerLook): CharacterRig {
  const b = look.build;
  const skin = mat(look.skin, 0.6);
  const top = mat(look.top, 0.7);
  const trim = mat(look.trim, 0.6);
  const bottom = mat(look.bottom, 0.85);
  const shoes = mat(look.shoes, 0.5);
  const hair = mat(look.hair, 0.9);
  const dark = mat("#0a0c10", 0.4);

  const root = new THREE.Group();
  root.scale.setScalar(look.scale);
  const hips = group(root, [0, HIP_HEIGHT, 0]);
  hips.add(mesh(sphere(0.15), bottom, [0, 0.02, 0], [b, 0.72, 0.75]));

  const spine = group(hips, [0, 0.04, 0]);
  spine.rotation.order = "YXZ";
  spine.add(mesh(capsule(0.15, 0.26), top, [0, 0.27, 0], [b, 1, 0.72]));
  spine.add(mesh(box(0.025, 0.4, 0.02), trim, [0, 0.27, 0.11 * 1]));
  const collar = mesh(geo("collar", () => new THREE.TorusGeometry(0.075, 0.025, 8, 18)), trim, [0, 0.52, 0]);
  collar.rotation.x = Math.PI / 2;
  spine.add(collar);
  spine.add(mesh(geo("neck", () => new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10)), skin, [0, 0.58, 0]));

  // Head with eyes so the facing direction always reads.
  const head = group(spine, [0, 0.62, 0]);
  head.add(mesh(sphere(0.115), skin, [0, 0.12, 0], [0.94, 1.08, 1]));
  for (const x of [-0.04, 0.04]) head.add(mesh(sphere(0.014), dark, [x, 0.135, 0.103]));
  addHair(head, look, hair, trim);

  // Arms.
  const shoulderY = 0.5;
  const lShoulder = group(spine, [0.205 * b, shoulderY, 0]);
  const rShoulder = group(spine, [-0.205 * b, shoulderY, 0]);
  const elbows: THREE.Group[] = [];
  for (const sh of [lShoulder, rShoulder]) {
    sh.add(mesh(capsule(0.052, 0.2), top, [0, -0.14, 0]));
    const el = group(sh, [0, -0.29, 0]);
    el.add(mesh(capsule(0.045, 0.17), top, [0, -0.12, 0]));
    el.add(mesh(sphere(0.048), skin, [0, -0.27, 0.01]));
    elbows.push(el);
  }
  const handCamera = new THREE.Group();
  handCamera.add(mesh(box(0.14, 0.09, 0.07), dark));
  handCamera.add(mesh(geo("lens", () => new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12)), mat("#2b3240", 0.3, 0.6), [0, 0, 0.06]).rotateX(Math.PI / 2));
  handCamera.position.set(0.06, -0.3, 0.05);
  handCamera.visible = false;
  elbows[1].add(handCamera);

  // Legs.
  const lHip = group(hips, [0.09 * b, -0.03, 0]);
  const rHip = group(hips, [-0.09 * b, -0.03, 0]);
  const knees: THREE.Group[] = [];
  for (const hp of [lHip, rHip]) {
    hp.add(mesh(capsule(0.072, 0.28), look.skirt ? skin : bottom, [0, -0.21, 0]));
    const kn = group(hp, [0, -0.44, 0]);
    kn.add(mesh(capsule(0.058, 0.29), look.skirt ? skin : bottom, [0, -0.21, 0]));
    kn.add(mesh(box(0.1, 0.07, 0.24), shoes, [0, -0.43, 0.045]));
    knees.push(kn);
  }
  if (look.skirt) {
    hips.add(mesh(geo("skirt", () => new THREE.CylinderGeometry(0.16, 0.27, 0.42, 16, 1, true)), bottom, [0, -0.17, 0]));
  }

  addAccessories(look, spine, head, trim, dark);

  return { root, hips, spine, head, lShoulder, lElbow: elbows[0], rShoulder, rElbow: elbows[1], lHip, lKnee: knees[0], rHip, rKnee: knees[1], handCamera };
}

function addHair(head: THREE.Group, look: TravelerLook, hair: THREE.Material, trim: THREE.Material) {
  const crown = mesh(cap(0.125, 1.25), hair, [0, 0.13, -0.008], [0.98, 1.05, 1.02]);
  crown.rotation.x = -0.35;
  switch (look.hairStyle) {
    case "short":
      head.add(crown);
      break;
    case "curly":
      head.add(crown);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        head.add(mesh(sphere(0.045), hair, [Math.cos(a) * 0.09, 0.2 + Math.sin(i * 1.7) * 0.02, Math.sin(a) * 0.08 - 0.02]));
      }
      break;
    case "long":
      head.add(crown);
      head.add(mesh(box(0.22, 0.34, 0.07), hair, [0, 0.02, -0.085]));
      break;
    case "bun":
      head.add(crown);
      head.add(mesh(sphere(0.055), hair, [0, 0.22, -0.09]));
      break;
    case "cap": {
      head.add(mesh(cap(0.128, 1.3), trim, [0, 0.135, 0], [1, 0.95, 1]));
      head.add(mesh(box(0.18, 0.018, 0.12), trim, [0, 0.165, 0.12]));
      break;
    }
    case "beanie":
      head.add(mesh(cap(0.132, 1.45), trim, [0, 0.12, 0], [1, 1.12, 1]));
      head.add(mesh(geo("beanieRim", () => new THREE.TorusGeometry(0.118, 0.02, 6, 18)), trim, [0, 0.135, 0]).rotateX(Math.PI / 2));
      break;
  }
}

function addAccessories(look: TravelerLook, spine: THREE.Group, head: THREE.Group, trim: THREE.Material, dark: THREE.Material) {
  for (const a of look.accessories) {
    switch (a) {
      case "backpack":
        spine.add(mesh(box(0.28, 0.36, 0.14), mat("#ff8a3d", 0.7), [0, 0.28, -0.17]));
        spine.add(mesh(box(0.22, 0.1, 0.05), mat("#c4642a", 0.7), [0, 0.18, -0.25]));
        break;
      case "duffel": {
        const d = mesh(geo("duffel", () => new THREE.CapsuleGeometry(0.09, 0.3, 4, 10)), mat("#2c3a4a", 0.8), [-0.16, 0.18, -0.12]);
        d.rotation.z = Math.PI / 2.4;
        spine.add(d);
        break;
      }
      case "scarf":
        spine.add(mesh(geo("scarf", () => new THREE.TorusGeometry(0.085, 0.04, 8, 18)), trim, [0, 0.53, 0.01]).rotateX(Math.PI / 2));
        spine.add(mesh(box(0.06, 0.2, 0.03), trim, [0.05, 0.4, 0.12]));
        break;
      case "headphones": {
        const band = mesh(geo("phones", () => new THREE.TorusGeometry(0.128, 0.012, 6, 20, Math.PI)), dark, [0, 0.12, 0]);
        head.add(band);
        for (const x of [-0.125, 0.125]) head.add(mesh(box(0.035, 0.07, 0.06), mat("#7b5cff", 0.4), [x, 0.11, 0]));
        break;
      }
      case "camera":
        spine.add(mesh(box(0.11, 0.07, 0.05), dark, [0.06, 0.3, 0.14]));
        break;
    }
  }
}

export function applyPose(rig: CharacterRig, p: Pose) {
  rig.hips.position.set(p[J.RootX], HIP_HEIGHT + p[J.RootY], 0);
  rig.hips.rotation.y = p[J.RootYaw];
  rig.spine.rotation.set(p[J.SpineX], p[J.SpineY], p[J.SpineZ]);
  rig.head.rotation.set(p[J.HeadX], p[J.HeadY], 0);
  rig.lShoulder.rotation.set(-p[J.LShSwing], 0, p[J.LShOut]);
  rig.rShoulder.rotation.set(-p[J.RShSwing], 0, -p[J.RShOut]);
  rig.lElbow.rotation.x = -p[J.LElbow];
  rig.rElbow.rotation.x = -p[J.RElbow];
  rig.lHip.rotation.x = -p[J.LHip];
  rig.rHip.rotation.x = -p[J.RHip];
  rig.lKnee.rotation.x = p[J.LKnee];
  rig.rKnee.rotation.x = p[J.RKnee];
}
