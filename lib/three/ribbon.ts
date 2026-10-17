import * as THREE from "three";
import { centerline } from "@/lib/config/route";

const UP = new THREE.Vector3(0, 1, 0);

export interface RibbonSample {
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  left: THREE.Vector3;
  /** Metres along the centreline. */
  s: number;
}

/** Evenly spaced samples along the road centreline, optionally clipped by X. */
export function sampleCenterline(spacing: number, xMin = -Infinity, xMax = Infinity): RibbonSample[] {
  const length = centerline.getLength();
  const count = Math.ceil(length / spacing);
  const out: RibbonSample[] = [];
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const point = centerline.getPointAt(u);
    if (point.x < xMin || point.x > xMax) continue;
    const tangent = centerline.getTangentAt(u);
    const left = new THREE.Vector3().crossVectors(UP, tangent).normalize();
    out.push({ point, tangent, left, s: u * length });
  }
  return out;
}

/** Flat strip between two lateral offsets from the centreline. */
export function flatRibbon(samples: RibbonSample[], offsetA: number, offsetB: number, y: number, vScale = 10) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  samples.forEach((smp, i) => {
    const a = smp.point.clone().addScaledVector(smp.left, offsetA);
    const b = smp.point.clone().addScaledVector(smp.left, offsetB);
    positions.push(a.x, y, a.z, b.x, y, b.z);
    uvs.push(0, smp.s / vScale, 1, smp.s / vScale);
    if (i > 0) {
      const k = i * 2;
      indices.push(k - 2, k, k - 1, k - 1, k, k + 1);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  // Make sure the strip faces up regardless of winding.
  const n = g.attributes.normal as THREE.BufferAttribute;
  if (n.count && n.getY(0) < 0) {
    g.setIndex(indices.map((_, i) => indices[i - (i % 3) + (2 - (i % 3))]));
    g.computeVertexNormals();
  }
  return g;
}

/** Vertical strip at a lateral offset (guardrail rails, kerbs). */
export function wallRibbon(samples: RibbonSample[], offset: number, y0: number, y1: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  samples.forEach((smp, i) => {
    const p = smp.point.clone().addScaledVector(smp.left, offset);
    positions.push(p.x, y0, p.z, p.x, y1, p.z);
    if (i > 0) {
      const k = i * 2;
      indices.push(k - 2, k, k - 1, k - 1, k, k + 1);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
