import * as THREE from "three";

/**
 * The physical journey. One road centreline is shared by the outbound and
 * return trips; the bus follows a single arc-length parametrised path that
 * drives the left lane out, loops the coastal roundabout and drives back.
 * World units are metres. Outbound travel is broadly along +X, the sea lies
 * toward -Z. Traffic keeps left, so the outbound lane is on the -Z side.
 */

export const ROAD_WIDTH = 10;
export const LANE_OFFSET = 2.2;
export const PICKUP_X = 40;

const CENTERLINE: [number, number][] = [
  [-200, 0], [-120, 0], [-40, 0], [40, 0], [120, 0], [180, 4], [240, 16], [300, 22],
  [360, 18], [420, 4], [470, -14], [520, -24], [570, -14], [620, 6], [670, 10],
  [720, -4], [770, -22], [820, -30], [870, -30], [910, -30],
];

export const ROUNDABOUT_CENTER = new THREE.Vector3(926, 0, -30);
export const ROUNDABOUT_RADIUS = 10;
export const PLAZA_RADIUS = 17;

export const centerline = new THREE.CatmullRomCurve3(
  CENTERLINE.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  false,
  "centripetal",
);

const UP = new THREE.Vector3(0, 1, 0);

function leftOf(tangent: THREE.Vector3) {
  return new THREE.Vector3().crossVectors(UP, tangent).normalize();
}

function buildBusPath() {
  const pts: THREE.Vector3[] = [];
  const samples = 140;
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const p = centerline.getPointAt(u);
    pts.push(p.add(leftOf(centerline.getTangentAt(u)).multiplyScalar(LANE_OFFSET)));
  }
  // Roundabout: enter on the seaward (left) side, sweep around the far side.
  const f = new THREE.Vector3(1, 0, 0);
  const l = new THREE.Vector3(0, 0, -1);
  const c = ROUNDABOUT_CENTER;
  pts.push(c.clone().addScaledVector(f, -8).addScaledVector(l, 6.5));
  for (let i = 0; i <= 10; i++) {
    const phi = (i / 10) * Math.PI;
    pts.push(
      c.clone()
        .addScaledVector(l, ROUNDABOUT_RADIUS * Math.cos(phi))
        .addScaledVector(f, ROUNDABOUT_RADIUS * Math.sin(phi)),
    );
  }
  pts.push(c.clone().addScaledVector(f, -8).addScaledVector(l, -6.5));
  for (let i = samples; i >= 0; i--) {
    const u = i / samples;
    const p = centerline.getPointAt(u);
    pts.push(p.add(leftOf(centerline.getTangentAt(u)).multiplyScalar(-LANE_OFFSET)));
  }
  return new THREE.CatmullRomCurve3(pts, false, "centripetal");
}

export const busPath = buildBusPath();
busPath.arcLengthDivisions = 4000;
export const BUS_PATH_LENGTH = busPath.getLength();

function closestS(target: THREE.Vector3, uMin = 0, uMax = 1) {
  let best = Infinity;
  let bestU = uMin;
  const tmp = new THREE.Vector3();
  for (let i = 0; i <= 6000; i++) {
    const u = uMin + ((uMax - uMin) * i) / 6000;
    busPath.getPointAt(u, tmp);
    const d = tmp.distanceToSquared(target);
    if (d < best) {
      best = d;
      bestU = u;
    }
  }
  return bestU * BUS_PATH_LENGTH;
}

/** Arc-length anchors where the bus stops. */
export const S_PICKUP = closestS(new THREE.Vector3(PICKUP_X, 0, -LANE_OFFSET), 0, 0.5);
export const S_COAST = closestS(
  ROUNDABOUT_CENTER.clone().add(new THREE.Vector3(0, 0, -ROUNDABOUT_RADIUS)),
  0.3,
  0.7,
);
export const S_HOME = closestS(new THREE.Vector3(PICKUP_X, 0, LANE_OFFSET), 0.55, 1);

export interface BusPose {
  position: THREE.Vector3;
  yaw: number;
  forward: THREE.Vector3;
  left: THREE.Vector3;
}

export function getBusPose(s: number, out?: BusPose): BusPose {
  const pose = out ?? {
    position: new THREE.Vector3(),
    yaw: 0,
    forward: new THREE.Vector3(),
    left: new THREE.Vector3(),
  };
  const sc = Math.min(Math.max(s, 0), BUS_PATH_LENGTH);
  const u = sc / BUS_PATH_LENGTH;
  busPath.getPointAt(u, pose.position);
  busPath.getTangentAt(u, pose.forward);
  // Extrapolate linearly outside the path so the intro can approach from off-road.
  if (s < 0) pose.position.addScaledVector(pose.forward, s);
  pose.position.y = 0;
  pose.forward.y = 0;
  pose.forward.normalize();
  pose.left.crossVectors(UP, pose.forward).normalize();
  pose.yaw = Math.atan2(-pose.forward.z, pose.forward.x);
  return pose;
}

/** Road centre Z for an outbound X (the outbound road is monotonic in X). */
const roadLookup: Float32Array = (() => {
  const arr = new Float32Array(1400);
  const tmp = new THREE.Vector3();
  let u = 0;
  for (let i = 0; i < arr.length; i++) {
    const x = -260 + i;
    while (u < 1) {
      centerline.getPointAt(u, tmp);
      if (tmp.x >= x) break;
      u += 0.0002;
    }
    arr[i] = tmp.x >= x || u >= 1 ? tmp.z : 0;
  }
  return arr;
})();

export function roadZAt(x: number) {
  const i = Math.round(x + 260);
  if (i <= 0) return roadLookup[0];
  if (i >= roadLookup.length) return roadLookup[roadLookup.length - 1];
  return roadLookup[i];
}
