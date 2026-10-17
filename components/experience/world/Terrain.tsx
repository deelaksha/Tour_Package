"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { terrainHeight, SEA_LEVEL } from "@/lib/three/terrain";
import { roadZAt } from "@/lib/config/route";
import { fbm2, smoothstep } from "@/lib/utils/math";

const X0 = -520;
const X1 = 1420;
const Z0 = -760;
const Z1 = 560;

const C = {
  city: new THREE.Color("#151922"),
  grassDark: new THREE.Color("#18261a"),
  grass: new THREE.Color("#2c3d22"),
  rock: new THREE.Color("#4b4b52"),
  sand: new THREE.Color("#c9a77b"),
  wetSand: new THREE.Color("#7d6a52"),
  seabed: new THREE.Color("#2a3632"),
  shoulder: new THREE.Color("#2b2a26"),
};

export function Terrain({ quality }: { quality: "high" | "low" }) {
  const geometry = useMemo(() => {
    const step = quality === "high" ? 5 : 9;
    const segX = Math.round((X1 - X0) / step);
    const segZ = Math.round((Z1 - Z0) / step);
    const g = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, segX, segZ);
    g.rotateX(-Math.PI / 2);
    g.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();

    const nrm = g.attributes.normal as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const slope = 1 - nrm.getY(i);
      const n = fbm2(x * 0.03, z * 0.03, 3);
      const adz = Math.abs(z - roadZAt(x));
      const cityW = 1 - smoothstep(220, 340, x);
      c.copy(C.grassDark).lerp(C.grass, n);
      c.lerp(C.rock, smoothstep(0.18, 0.4, slope) * 0.9 + smoothstep(30, 60, y) * 0.5);
      c.lerp(C.city, cityW * (0.85 + n * 0.15));
      c.lerp(C.shoulder, (1 - smoothstep(6, 11, adz)) * 0.8);
      const coast = smoothstep(720, 790, x) * (z < roadZAt(x) - 9 ? 1 : 0);
      if (coast > 0) {
        const sandC = new THREE.Color().copy(C.wetSand).lerp(C.sand, smoothstep(SEA_LEVEL - 0.05, SEA_LEVEL + 0.25, y));
        if (y < SEA_LEVEL - 0.3) sandC.lerp(C.seabed, smoothstep(SEA_LEVEL - 0.3, SEA_LEVEL - 2, y));
        sandC.multiplyScalar(0.92 + n * 0.16);
        c.lerp(sandC, coast * (1 - smoothstep(4, 9, y)));
      }
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [quality]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return <mesh geometry={geometry} material={material} receiveShadow name="terrain" />;
}
