"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { roadZAt } from "@/lib/config/route";
import { terrainHeight } from "@/lib/three/terrain";
import { createBroadleafGeometry, createRockGeometry, createSilverOakGeometry } from "@/lib/three/vegetation";
import { mulberry32, smoothstep } from "@/lib/utils/math";
import { withOcclusionFade } from "@/lib/three/occlusionFade";

interface Spot {
  matrix: THREE.Matrix4;
  tint: number;
}

/** Random spots in the Ghats band, on terrain, clear of the road. */
function scatter(count: number, seed: number, xRange: [number, number], maxDist: number, minScale: number, maxScale: number) {
  const rnd = mulberry32(seed);
  const out: Spot[] = [];
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let tries = 0; out.length < count && tries < count * 8; tries++) {
    const x = xRange[0] + rnd() * (xRange[1] - xRange[0]);
    if (rnd() > smoothstep(320, 440, x) * (1 - smoothstep(780, 860, x) * 0.85)) continue;
    const side = rnd() < 0.5 ? 1 : -1;
    if (side < 0 && x > 740) continue; // the seaward side becomes beach
    const d = 8.5 + Math.pow(rnd(), 1.6) * maxDist;
    const z = roadZAt(x) - side * d;
    const h = terrainHeight(x, z);
    if (h > 62 || h < 0.3) continue;
    const k = minScale + rnd() * (maxScale - minScale);
    p.set(x, h - 0.3, z);
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rnd() * Math.PI * 2);
    s.set(k, k * (0.9 + rnd() * 0.3), k);
    out.push({ matrix: new THREE.Matrix4().compose(p, q, s), tint: 0.75 + rnd() * 0.4 });
  }
  return out;
}

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, spots: Spot[], castShadow: boolean) {
  const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
  const c = new THREE.Color();
  spots.forEach((spot, i) => {
    mesh.setMatrixAt(i, spot.matrix);
    mesh.setColorAt(i, c.setScalar(spot.tint));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.castShadow = castShadow;
  return mesh;
}

/** The Western Ghats: evergreen broadleaf forest, silver oaks and boulders on layered hills. */
export function ForestEnvironment({ quality }: { quality: "high" | "low" }) {
  const meshes = useMemo(() => {
    const high = quality === "high";
    const foliage = withOcclusionFade(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
    const broadleaf = instanced(createBroadleafGeometry("#2f5a2c"), foliage, scatter(high ? 1300 : 550, 9, [300, 860], 230, 0.8, 1.5), high);
    const oaks = instanced(createSilverOakGeometry(), foliage, scatter(high ? 420 : 180, 13, [330, 820], 160, 0.8, 1.3), high);
    const rocks = instanced(
      createRockGeometry(),
      withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#6a6862", flatShading: true, roughness: 0.95 })),
      scatter(high ? 260 : 120, 19, [380, 800], 120, 0.5, 3.2),
      false,
    );
    return { broadleaf, oaks, rocks, foliage };
  }, [quality]);

  useEffect(
    () => () => {
      for (const im of [meshes.broadleaf, meshes.oaks, meshes.rocks]) {
        im.geometry.dispose();
        im.dispose();
      }
      meshes.foliage.dispose();
      (meshes.rocks.material as THREE.Material).dispose();
    },
    [meshes],
  );

  return (
    <group name="forest">
      <primitive object={meshes.broadleaf} />
      <primitive object={meshes.oaks} />
      <primitive object={meshes.rocks} />
    </group>
  );
}
