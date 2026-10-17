"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { roadZAt } from "@/lib/config/route";
import { terrainHeight } from "@/lib/three/terrain";
import { createParticleMaterial, createWaterfallMaterial } from "@/lib/three/shaders";
import { mulberry32 } from "@/lib/utils/math";

const X = 640;
const OFFSET = -48; // seaward side of the road, in view of the aerial Ghats shot
const HEIGHT = 24;
const WIDTH = 5;

/** A Western Ghats waterfall: rock cliff, falling water sheet, plunge pool and spray. */
export function Waterfall({ quality }: { quality: "high" | "low" }) {
  const z = roadZAt(X) + OFFSET;
  const base = terrainHeight(X, z);

  const parts = useMemo(() => {
    // Cliff: a displaced slab so the face reads as layered rock, not a box.
    const cliff = new THREE.BoxGeometry(20, HEIGHT + 4, 9, 10, 12, 4);
    const pos = cliff.attributes.position as THREE.BufferAttribute;
    const rnd = mulberry32(51);
    for (let i = 0; i < pos.count; i++) {
      const k = 0.6 + rnd() * 0.8;
      pos.setX(i, pos.getX(i) + (rnd() - 0.5) * k);
      pos.setZ(i, pos.getZ(i) + (rnd() - 0.5) * k * 1.4);
    }
    cliff.computeVertexNormals();

    const pool = new THREE.CircleGeometry(7, 40).rotateX(-Math.PI / 2);
    const n = quality === "high" ? 140 : 60;
    const spray = new THREE.BufferGeometry();
    const sp = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      sp.set([(rnd() - 0.5) * 7, 0, (rnd() - 0.5) * 4], i * 3);
      seed[i] = rnd();
    }
    spray.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    spray.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

    return {
      cliff,
      pool,
      spray,
      rock: new THREE.MeshStandardMaterial({ color: "#4f5550", roughness: 0.95, flatShading: true }),
      moss: new THREE.MeshStandardMaterial({ color: "#3e5f34", roughness: 0.95, flatShading: true }),
      water: createWaterfallMaterial(),
      poolMat: new THREE.MeshStandardMaterial({ color: "#5f8f92", roughness: 0.15, metalness: 0.2 }),
      sprayMat: createParticleMaterial("#e8f4f4", 0.6, 5),
    };
  }, [quality]);

  useEffect(
    () => () => {
      [parts.cliff, parts.pool, parts.spray].forEach((g) => g.dispose());
      [parts.rock, parts.moss, parts.water, parts.poolMat, parts.sprayMat].forEach((m) => m.dispose());
    },
    [parts],
  );

  // The cliff faces the road (+Z of this group points toward the road).
  return (
    <group name="waterfall" position={[X, base, z]}>
      <mesh geometry={parts.cliff} material={parts.rock} position={[0, HEIGHT / 2 - 1, -4.5]} castShadow receiveShadow />
      <mesh material={parts.moss} position={[0, HEIGHT + 1.2, -4]}>
        <boxGeometry args={[21, 1.6, 10]} />
      </mesh>
      <mesh material={parts.water} position={[0, HEIGHT / 2 + 0.3, 0.2]}>
        <planeGeometry args={[WIDTH, HEIGHT, 1, 1]} />
      </mesh>
      <mesh geometry={parts.pool} material={parts.poolMat} position={[0, 0.25, 4]} />
      <points geometry={parts.spray} material={parts.sprayMat} position={[0, 0.3, 2.5]} frustumCulled={false} />
    </group>
  );
}
