"use client";

import { BRAND } from "@/lib/config/brand";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PICKUP_X, ROAD_WIDTH, roadZAt } from "@/lib/config/route";
import { createParticleMaterial, createTowerMaterial } from "@/lib/three/shaders";
import { createSignTexture } from "@/lib/three/textures";
import { shared } from "@/lib/three/sharedUniforms";
import { withOcclusionFade } from "@/lib/three/occlusionFade";
import { lerp, mulberry32 } from "@/lib/utils/math";
import { createBroadleafGeometry } from "@/lib/three/vegetation";

interface Tower {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  seed: number;
}

function generateTowers(quality: "high" | "low") {
  const rnd = mulberry32(3);
  const towers: Tower[] = [];
  const maxDepth = quality === "high" ? 190 : 120;
  for (const side of [1, -1]) {
    let x = -300;
    while (x < 290) {
      const w = 9 + rnd() * 12;
      let d = 15 + rnd() * 6;
      while (d < maxDepth) {
        const depth = 9 + rnd() * 12 + d * 0.04;
        // Keep the terminal forecourt (opening shots) and the far kerb (final shot) open.
        const inTerminal = side === 1 && x + w > -50 && x < 90 && d < 80;
        const inFinalView = side === -1 && x + w > -45 && x < 70 && d < 58;
        const tooFarWest = x > 200 && d < 30;
        if (!inTerminal && !inFinalView && !tooFarWest) {
          const h = lerp(10, 46, Math.pow(rnd(), 1.4)) * (1 + d / 70) * (x > 160 ? 0.6 : 1);
          towers.push({ x: x + w / 2, z: roadZAt(x) - side * (d + depth / 2), w, d: depth, h: Math.min(h, 170), seed: rnd() });
        }
        d += depth + 5 + rnd() * 9;
      }
      x += w + 4 + rnd() * 7;
    }
  }
  // Distant skyline ring so Bengaluru reads as a metropolis from every angle.
  const ring = quality === "high" ? 100 : 50;
  for (let i = 0; i < ring; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 300 + rnd() * 420;
    const x = PICKUP_X - 60 + Math.cos(a) * r;
    if (x > 220) continue;
    const w = 14 + rnd() * 24;
    towers.push({ x, z: Math.sin(a) * r, w, d: w * (0.7 + rnd() * 0.6), h: 50 + Math.pow(rnd(), 1.8) * 190, seed: rnd() });
  }
  return towers;
}

/** Bengaluru's flowering avenue trees: rain tree, gulmohar, jacaranda, tabebuia. */
const AVENUE_SPECIES = [
  { leaf: "#3f6b35" },
  { leaf: "#3a6331", blossom: "#e4572e" },
  { leaf: "#40693a", blossom: "#9a7fd1" },
  { leaf: "#3d6a36", blossom: "#f19ac0" },
];

function avenueTrees(quality: "high" | "low") {
  const rnd = mulberry32(27);
  const spacing = quality === "high" ? 13 : 20;
  const perSpecies: THREE.Matrix4[][] = AVENUE_SPECIES.map(() => []);
  const q = new THREE.Quaternion();
  for (let x = -190; x < 250; x += spacing) {
    for (const side of [1, -1]) {
      // Keep the pickup forecourt (seaward side) and the drop-off kerb clear.
      if (side === 1 && x > 12 && x < 62) continue;
      // Drop-off kerb, plus the stretch the homecoming and final shots look across.
      if (side === -1 && x > -15 && x < 50) continue;
      const d = ROAD_WIDTH / 2 + 3.2 + rnd() * 0.6;
      const z = roadZAt(x) - side * d;
      const k = 0.85 + rnd() * 0.35;
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rnd() * Math.PI * 2);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x + (rnd() - 0.5) * 3, 0, z), q, new THREE.Vector3(k, k, k));
      perSpecies[Math.floor(rnd() * AVENUE_SPECIES.length)].push(m);
    }
  }
  return perSpecies;
}

export function CityEnvironment({ quality }: { quality: "high" | "low" }) {
  const towers = useMemo(() => {
    const list = generateTowers(quality);
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const seeds = new Float32Array(list.length);
    const mesh = new THREE.InstancedMesh(geo, createTowerMaterial(), list.length);
    const m = new THREE.Matrix4();
    list.forEach((t, i) => {
      m.makeScale(t.w, t.h, t.d).setPosition(t.x, -0.2, t.z);
      mesh.setMatrixAt(i, m);
      seeds[i] = t.seed;
    });
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    return mesh;
  }, [quality]);

  const avenue = useMemo(() => {
    const material = withOcclusionFade(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
    const meshes = avenueTrees(quality).map((matrices, i) => {
      const spec = AVENUE_SPECIES[i];
      const mesh = new THREE.InstancedMesh(createBroadleafGeometry(spec.leaf, spec.blossom), material, matrices.length);
      matrices.forEach((m, j) => mesh.setMatrixAt(j, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.castShadow = quality === "high";
      return mesh;
    });
    return { meshes, material };
  }, [quality]);

  const mats = useMemo(() => {
    const signFront = createSignTexture([
      { text: BRAND.short, size: 104, color: "#fff8ea", weight: 800 },
      { text: "TRAVELS · TERMINAL 01 · DEPARTURES", size: 38, color: "#f2c46b", weight: 500 },
    ]);
    return {
      paving: new THREE.MeshStandardMaterial({ color: "#6e665a", roughness: 0.85 }),
      canopy: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#3a4a3c", metalness: 0.3, roughness: 0.5 })),
      led: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#2a1d08", emissive: new THREE.Color("#f2c46b"), emissiveIntensity: 1.6, toneMapped: false })),
      planter: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#6b5b4a", roughness: 0.9 })),
      shrub: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#3f6b35", roughness: 0.9, flatShading: true })),
      bench: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#7a5a3c", roughness: 0.7 })),
      sign: withOcclusionFade(new THREE.MeshBasicMaterial({ map: signFront, toneMapped: false })),
      underglow: new THREE.MeshBasicMaterial({ color: new THREE.Color("#6b5532"), toneMapped: false }),
      motes: createParticleMaterial("#ffe2a0", 0.25),
    };
  }, []);

  const motes = useMemo(() => {
    const rnd = mulberry32(5);
    const n = quality === "high" ? 260 : 100;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos.set([PICKUP_X - 30 + rnd() * 60, rnd() * 2, -30 + rnd() * 40], i * 3);
      seed[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [quality]);

  useFrame(() => {
    (mats.motes.uniforms.uIntensity as { value: number }).value = shared.uCityGlow.value * 0.8;
  });

  useEffect(
    () => () => {
      towers.geometry.dispose();
      (towers.material as THREE.Material).dispose();
      towers.dispose();
      motes.dispose();
      avenue.meshes.forEach((m) => {
        m.geometry.dispose();
        m.dispose();
      });
      avenue.material.dispose();
      mats.sign.map?.dispose();
      Object.values(mats).forEach((m) => m.dispose());
    },
    [towers, motes, mats, avenue],
  );

  const tz = -12.2;
  return (
    <group name="city">
      <primitive object={towers} />
      {/* Terminal 01: paved forecourt, cantilevered canopy, signage */}
      <mesh position={[PICKUP_X + 1, 0.04, -20]} material={mats.paving} receiveShadow>
        <boxGeometry args={[54, 0.1, 21]} />
      </mesh>
      <mesh position={[PICKUP_X + 1, 4.4, tz]} material={mats.canopy} castShadow>
        <boxGeometry args={[24, 0.3, 6.4]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[PICKUP_X + 1, 4.24, tz + s * 3.2]} material={mats.led}>
          <boxGeometry args={[24, 0.05, 0.05]} />
        </mesh>
      ))}
      <mesh position={[PICKUP_X + 1, 4.24, tz]} rotation={[Math.PI / 2, 0, 0]} material={mats.underglow}>
        <planeGeometry args={[22, 5]} />
      </mesh>
      {[-10, 10].flatMap((dx) =>
        [-2.6, 2.6].map((dz) => (
          <mesh key={`${dx}${dz}`} position={[PICKUP_X + 1 + dx, 2.2, tz + dz]} material={mats.canopy} castShadow>
            <boxGeometry args={[0.22, 4.4, 0.22]} />
          </mesh>
        )),
      )}
      <mesh position={[PICKUP_X + 1, 5.45, tz - 3.21]} rotation={[0, Math.PI, 0]} material={mats.sign}>
        <planeGeometry args={[8, 2]} />
      </mesh>
      <mesh position={[PICKUP_X + 1, 5.45, tz + 3.21]} material={mats.sign}>
        <planeGeometry args={[8, 2]} />
      </mesh>
      <mesh position={[PICKUP_X + 1, 5.45, tz]} material={mats.canopy}>
        <boxGeometry args={[8.2, 2.1, 6.3]} />
      </mesh>
      {[-6, 0, 6].map((dx) => (
        <mesh key={dx} position={[PICKUP_X + 1 + dx, 0.5, tz - 1.8]} material={mats.bench} castShadow>
          <boxGeometry args={[3, 0.12, 0.6]} />
        </mesh>
      ))}
      {/* Wayfinding totems */}
      {[PICKUP_X - 13, PICKUP_X + 15].map((x) => (
        <group key={x} position={[x, 0, -8.6]}>
          <mesh position={[0, 1.6, 0]} material={mats.canopy}>
            <boxGeometry args={[0.5, 3.2, 0.5]} />
          </mesh>
          <mesh position={[0, 1.6, 0]} material={mats.led}>
            <boxGeometry args={[0.52, 2.8, 0.06]} />
          </mesh>
        </group>
      ))}
      {/* Planters with shrubs along the forecourt */}
      {[-18, -9, 11, 20].map((dx) => (
        <group key={dx} position={[PICKUP_X + 1 + dx, 0, -19]}>
          <mesh position={[0, 0.35, 0]} material={mats.planter} castShadow receiveShadow>
            <boxGeometry args={[3.4, 0.7, 1.6]} />
          </mesh>
          <mesh position={[0, 1.05, 0]} material={mats.shrub} castShadow>
            <icosahedronGeometry args={[1.0, 1]} />
          </mesh>
        </group>
      ))}
      {avenue.meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      <points geometry={motes} material={mats.motes} frustumCulled={false} />
    </group>
  );
}
