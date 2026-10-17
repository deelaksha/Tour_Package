import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

function colored(g: THREE.BufferGeometry, color: string) {
  const geo = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(color);
  const arr = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i);
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  geo.deleteAttribute("uv");
  return geo;
}

function merge(parts: THREE.BufferGeometry[], name: string) {
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error(`${name} merge failed`);
  merged.computeVertexNormals();
  return merged;
}

/** Tall, slender silver oak — the shade tree of Karnataka's coffee estates. */
export function createSilverOakGeometry() {
  return merge(
    [
      colored(new THREE.CylinderGeometry(0.16, 0.26, 4, 6).translate(0, 2, 0), "#4a3a2c"),
      colored(new THREE.ConeGeometry(1.7, 5.2, 7).translate(0, 5.6, 0), "#3d5e36"),
      colored(new THREE.ConeGeometry(1.25, 3.6, 7).translate(0, 7.9, 0), "#4a6f3e"),
    ],
    "silver oak",
  );
}

/**
 * Rounded broadleaf canopy: a Western Ghats evergreen when green, and with
 * `blossom` one of Bengaluru's flowering avenue trees.
 */
export function createBroadleafGeometry(leaf = "#2f5a2c", blossom?: string) {
  const parts: THREE.BufferGeometry[] = [colored(new THREE.CylinderGeometry(0.22, 0.34, 3.4, 7).translate(0, 1.7, 0), "#4b3929")];
  const blobs: [number, number, number, number][] = [
    [0, 4.6, 0, 2.2],
    [1.4, 4.1, 0.6, 1.5],
    [-1.3, 4.2, -0.5, 1.6],
    [0.3, 4.0, -1.4, 1.4],
    [-0.4, 5.6, 0.7, 1.3],
  ];
  blobs.forEach(([x, y, z, r], i) => {
    const color = blossom && i % 2 === 0 ? blossom : i % 2 ? leaf : shade(leaf, 1.15);
    parts.push(colored(new THREE.IcosahedronGeometry(r, 1).scale(1, 0.78, 1).translate(x, y, z), color));
  });
  return merge(parts, "broadleaf");
}

function shade(hex: string, k: number) {
  return "#" + new THREE.Color(hex).multiplyScalar(k).getHexString();
}

/** Coconut palm: curved trunk with drooping fronds. */
export function createPalmGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.25, 2.8, 0),
    new THREE.Vector3(0.9, 5.6, 0),
    new THREE.Vector3(1.7, 7.9, 0),
  ]);
  const trunk = new THREE.TubeGeometry(curve, 14, 0.2, 6, false);
  const parts: THREE.BufferGeometry[] = [colored(trunk, "#6b5139")];
  const top = curve.getPoint(1);
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const leaf = new THREE.PlaneGeometry(0.8, 3.8, 1, 8);
    const pos = leaf.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < pos.count; v++) {
      const along = (pos.getY(v) + 1.9) / 3.8; // 0 at base → 1 at tip
      const width = Math.sin(Math.PI * Math.min(1, along * 1.1)) * 0.9 + 0.1;
      pos.setX(v, pos.getX(v) * width);
      pos.setZ(v, -along * along * 1.8 + Math.abs(pos.getX(v)) * 0.25);
      pos.setY(v, along * 3.6);
    }
    leaf.rotateX(-Math.PI / 2 + 0.55);
    leaf.rotateY((i / fronds) * Math.PI * 2 + (i % 2) * 0.2);
    leaf.translate(top.x, top.y, top.z);
    parts.push(colored(leaf, i % 2 ? "#3f6a2c" : "#2f5a26"));
  }
  parts.push(colored(new THREE.SphereGeometry(0.32, 6, 5).translate(top.x, top.y - 0.25, top.z), "#5a4a1c"));
  return merge(parts, "palm");
}

export function createRockGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const k = 0.8 + 0.35 * Math.sin(pos.getX(i) * 5.1 + pos.getY(i) * 3.3) * Math.cos(pos.getZ(i) * 4.2);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.7, pos.getZ(i) * k);
  }
  const ni = g.toNonIndexed();
  ni.computeVertexNormals();
  return ni;
}
