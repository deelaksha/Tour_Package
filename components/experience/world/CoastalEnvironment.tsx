"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ROUNDABOUT_CENTER, roadZAt } from "@/lib/config/route";
import { terrainHeight } from "@/lib/three/terrain";
import { createBeamMaterial, createOceanMaterial } from "@/lib/three/shaders";
import { createPalmGeometry, createRockGeometry } from "@/lib/three/vegetation";
import { createSignTexture } from "@/lib/three/textures";
import { shared } from "@/lib/three/sharedUniforms";
import { mulberry32 } from "@/lib/utils/math";
import { DESTINATION } from "@/lib/config/destinations";
import { withOcclusionFade } from "@/lib/three/occlusionFade";

const LIGHTHOUSE = new THREE.Vector3(1010, 0, -66);

/** Keep the beach between the plaza and the shoreline clear for the travelers. */
const isActionZone = (x: number, z: number) => x > 900 && x < 950 && z < -38 && z > -64;

export function CoastalEnvironment({ quality }: { quality: "high" | "low" }) {
  const ocean = useMemo(() => {
    const seg = quality === "high" ? [380, 220] : [150, 90];
    const g = new THREE.PlaneGeometry(3400, 1900, seg[0], seg[1]).rotateX(-Math.PI / 2).translate(1300, 0, -36 - 950);
    return { geometry: g, material: createOceanMaterial() };
  }, [quality]);

  const palms = useMemo(() => {
    const rnd = mulberry32(17);
    const spots: [number, number, number][] = [];
    for (let x = 735; x < 1080; x += 9 + rnd() * 8) {
      for (const side of [1, -1]) {
        if (rnd() < 0.25) continue;
        const d = 7.5 + rnd() * (side > 0 ? 40 : 9);
        const z = roadZAt(x) - side * d;
        const dx = x - ROUNDABOUT_CENTER.x;
        const dz = z - ROUNDABOUT_CENTER.z;
        if (Math.hypot(dx, dz) < 19 || isActionZone(x, z)) continue;
        spots.push([x, z, rnd()]);
      }
    }
    // Beach groves either side of the action zone, and the roundabout island.
    for (let i = 0; i < 26; i++) {
      const x = rnd() < 0.5 ? 862 + rnd() * 36 : 952 + rnd() * 40;
      spots.push([x, -42 - rnd() * 14, rnd()]);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      spots.push([ROUNDABOUT_CENTER.x + Math.cos(a) * 1.6, ROUNDABOUT_CENTER.z + Math.sin(a) * 1.6, 0.5 + i * 0.2]);
    }
    // Two framing palms beside the party.
    spots.push([912.5, -47, 0.4], [940.5, -49, 0.8]);
    const mesh = new THREE.InstancedMesh(
      createPalmGeometry(),
      withOcclusionFade(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, side: THREE.DoubleSide })),
      spots.length,
    );
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const tint = new THREE.Color();
    spots.forEach(([x, z, r], i) => {
      const k = 0.8 + r * 0.55;
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, r * Math.PI * 9);
      const y = ROUNDABOUT_CENTER.distanceTo(new THREE.Vector3(x, 0, z)) < 3 ? 0.27 : terrainHeight(x, z);
      mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x, y - 0.1, z), q, new THREE.Vector3(k, k, k)));
      mesh.setColorAt(i, tint.setScalar(0.8 + r * 0.35));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.castShadow = quality === "high";
    return mesh;
  }, [quality]);

  const rocks = useMemo(() => {
    const rnd = mulberry32(23);
    const n = 70;
    const mesh = new THREE.InstancedMesh(
      createRockGeometry(),
      withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#3e3a38", flatShading: true, roughness: 0.9 })),
      n,
    );
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      // Clusters at the headland and along the waterline away from the travelers.
      const headland = i < 40;
      const x = headland ? LIGHTHOUSE.x - 25 + rnd() * 50 : (rnd() < 0.5 ? 860 + rnd() * 40 : 952 + rnd() * 30);
      const z = headland ? LIGHTHOUSE.z - 18 + rnd() * 30 : -58 - rnd() * 9;
      const k = headland ? 1 + rnd() * 3.5 : 0.5 + rnd() * 1.6;
      q.setFromEuler(new THREE.Euler(rnd(), rnd() * 6, rnd()));
      mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x, terrainHeight(x, z) - k * 0.2, z), q, new THREE.Vector3(k, k * 0.8, k)));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }, []);

  const mats = useMemo(
    () => ({
      white: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#e9edf2", roughness: 0.6 })),
      red: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#b8323a", roughness: 0.6 })),
      dark: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#1d232c", metalness: 0.5, roughness: 0.4 })),
      lamp: withOcclusionFade(new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffe2a8").multiplyScalar(3), toneMapped: false })),
      beam: createBeamMaterial("#ffe7b8", 0.25),
      sign: withOcclusionFade(new THREE.MeshBasicMaterial({
        toneMapped: false,
        map: createSignTexture(
          [
            { text: "THE COAST", size: 104, color: "#fff4e6", weight: 800 },
            { text: `ARRIVAL · ${DESTINATION.coordinates}`, size: 36, color: "#ffb36b", weight: 500 },
          ],
          1024,
          256,
          "#ffb36b",
        ),
      })),
    }),
    [],
  );

  const beam = useRef<THREE.Group>(null);
  const baseY = useMemo(() => terrainHeight(LIGHTHOUSE.x, LIGHTHOUSE.z), []);

  useFrame(({ clock }) => {
    if (beam.current) beam.current.rotation.y = clock.elapsedTime * 0.6;
    // The beam only matters once the sun is down.
    (mats.beam.uniforms.uIntensity as { value: number }).value = 0.08 + shared.uCityGlow.value * 0.3;
  });

  useEffect(
    () => () => {
      ocean.geometry.dispose();
      ocean.material.dispose();
      for (const im of [palms, rocks]) {
        im.geometry.dispose();
        (im.material as THREE.Material).dispose();
        im.dispose();
      }
      mats.sign.map?.dispose();
      Object.values(mats).forEach((m) => m.dispose());
    },
    [ocean, palms, rocks, mats],
  );

  return (
    <group name="coast">
      <mesh geometry={ocean.geometry} material={ocean.material} frustumCulled={false} />
      <primitive object={palms} />
      <primitive object={rocks} />
      {/* Arrival sign on the approach to the plaza */}
      <group position={[902, 0, -40.5]} rotation={[0, -0.45, 0]}>
        {[-2.6, 2.6].map((z) => (
          <mesh key={z} position={[0, 1.4, z]} material={mats.dark} castShadow>
            <boxGeometry args={[0.18, 2.8, 0.18]} />
          </mesh>
        ))}
        <mesh position={[-0.11, 2.4, 0]} rotation={[0, -Math.PI / 2, 0]} material={mats.sign}>
          <planeGeometry args={[5.6, 1.4]} />
        </mesh>
        <mesh position={[0, 2.4, 0]} material={mats.dark}>
          <boxGeometry args={[0.16, 1.5, 5.7]} />
        </mesh>
      </group>
      {/* Lighthouse on the headland */}
      <group position={[LIGHTHOUSE.x, baseY - 0.3, LIGHTHOUSE.z]}>
        <mesh position={[0, 7.5, 0]} material={mats.white} castShadow>
          <cylinderGeometry args={[1.05, 1.7, 15, 24]} />
        </mesh>
        {[4, 9].map((y) => (
          <mesh key={y} position={[0, y, 0]} material={mats.red}>
            <cylinderGeometry args={[1.48 - y * 0.03, 1.56 - y * 0.03, 1.6, 24]} />
          </mesh>
        ))}
        <mesh position={[0, 15.1, 0]} material={mats.dark}>
          <cylinderGeometry args={[1.6, 1.6, 0.25, 24]} />
        </mesh>
        <mesh position={[0, 16, 0]} material={mats.lamp}>
          <cylinderGeometry args={[0.75, 0.75, 1.5, 16]} />
        </mesh>
        <mesh position={[0, 17.2, 0]} material={mats.red}>
          <coneGeometry args={[1.1, 1.1, 16]} />
        </mesh>
        <group ref={beam} position={[0, 16, 0]}>
          {[1, -1].map((s) => (
            <mesh key={s} position={[s * 22, 0, 0]} rotation={[0, 0, s * Math.PI / 2]} material={mats.beam}>
              <coneGeometry args={[3.5, 44, 20, 1, true]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}
