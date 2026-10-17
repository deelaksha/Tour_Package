"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { centerline, LANE_OFFSET, ROAD_WIDTH } from "@/lib/config/route";
import { sampleCenterline, wallRibbon } from "@/lib/three/ribbon";
import { createSignTexture } from "@/lib/three/textures";
import { journey } from "@/lib/animation/journeyStore";
import { mulberry32 } from "@/lib/utils/math";
import { withOcclusionFade } from "@/lib/three/occlusionFade";

const HALF = ROAD_WIDTH / 2;
const RAIL_X: [number, number] = [255, 800];
const TRAFFIC_COUNT = 14;
const TRAFFIC_RANGE: [number, number] = [0.08, 0.78];

/** Highway + ghats road furniture: guardrails, gantry sign, oncoming traffic. */
export function HighwayEnvironment() {
  const rails = useMemo(() => {
    const samples = sampleCenterline(2, RAIL_X[0], RAIL_X[1]);
    const geos = [1, -1].flatMap((side) => [
      wallRibbon(samples, side * (HALF + 0.9), 0.45, 0.62),
      wallRibbon(samples, side * (HALF + 0.9), 0.66, 0.7),
    ]);
    const posts: THREE.Matrix4[] = [];
    samples.forEach((smp, i) => {
      if (i % 2) return;
      for (const side of [1, -1]) {
        const p = smp.point.clone().addScaledVector(smp.left, side * (HALF + 0.95));
        p.y = 0.35;
        posts.push(new THREE.Matrix4().makeTranslation(p.x, p.y, p.z));
      }
    });
    return { geos, posts };
  }, []);

  const mats = useMemo(
    () => ({
      rail: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#9aa4b2", metalness: 0.85, roughness: 0.35, side: THREE.DoubleSide })),
      reflector: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#2a1a05", emissive: new THREE.Color("#ffb347"), emissiveIntensity: 0.6, side: THREE.DoubleSide, toneMapped: false })),
      steel: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#2b3340", metalness: 0.7, roughness: 0.4 })),
      carBody: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#151a24", metalness: 0.6, roughness: 0.4 })),
      head: withOcclusionFade(new THREE.MeshBasicMaterial({ color: new THREE.Color("#eaf3ff").multiplyScalar(4), toneMapped: false })),
      tail: withOcclusionFade(new THREE.MeshBasicMaterial({ color: new THREE.Color("#ff2a3a").multiplyScalar(3), toneMapped: false })),
    }),
    [],
  );

  const posts = useMemo(() => {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), mats.steel, rails.posts.length);
    rails.posts.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    return im;
  }, [rails, mats]);

  const signs = useMemo(
    () => ({
      out: new THREE.MeshBasicMaterial({
        toneMapped: false,
        map: createSignTexture([
          { text: "KARNATAKA COAST", size: 78, color: "#eaf6ff", weight: 700 },
          { text: "NH-75 WEST  ·  348 KM  →", size: 46, color: "#f2c46b", weight: 500 },
        ]),
      }),
      back: new THREE.MeshBasicMaterial({
        toneMapped: false,
        map: createSignTexture([
          { text: "BENGALURU", size: 84, color: "#eaf6ff", weight: 700 },
          { text: "NH-75 EAST  ·  52 KM  →", size: 46, color: "#f2c46b", weight: 500 },
        ]),
      }),
    }),
    [],
  );

  // Gantry straddling the highway.
  const gantry = useMemo(() => {
    const u = 0.405;
    const p = centerline.getPointAt(u);
    const t = centerline.getTangentAt(u);
    return { pos: p, yaw: Math.atan2(-t.z, t.x) };
  }, []);

  // Oncoming traffic: emissive light pairs on simple bodies.
  const traffic = useRef<THREE.Group>(null);
  const cars = useMemo(() => {
    const rnd = mulberry32(21);
    return Array.from({ length: TRAFFIC_COUNT }, () => ({ offset: rnd(), speed: 0.012 + rnd() * 0.01 }));
  }, []);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }), []);

  useFrame(({ clock }) => {
    const g = traffic.current;
    if (!g) return;
    // Outbound: cars come toward the bus in the opposite lane. Return: the lanes swap.
    const returning = journey.time > 75;
    const span = TRAFFIC_RANGE[1] - TRAFFIC_RANGE[0];
    g.children.forEach((car, i) => {
      const c = cars[i];
      let f = (c.offset + clock.elapsedTime * c.speed) % 1;
      if (!returning) f = 1 - f;
      const u = TRAFFIC_RANGE[0] + f * span;
      centerline.getPointAt(u, tmp.p);
      centerline.getTangentAt(u, tmp.t);
      // left = up × tangent = (tz, 0, -tx); use the lane opposite to the bus.
      const side = returning ? 1 : -1;
      car.position.set(tmp.p.x + tmp.t.z * LANE_OFFSET * side, 0, tmp.p.z - tmp.t.x * LANE_OFFSET * side);
      const dir = returning ? 1 : -1;
      car.rotation.y = Math.atan2(-tmp.t.z * dir, tmp.t.x * dir);
    });
  });

  useEffect(
    () => () => {
      rails.geos.forEach((g) => g.dispose());
      posts.geometry.dispose();
      posts.dispose();
      Object.values(mats).forEach((m) => m.dispose());
      Object.values(signs).forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
    [rails, posts, mats, signs],
  );

  return (
    <group name="highway">
      {rails.geos.map((g, i) => (
        <mesh key={i} geometry={g} material={i % 2 ? mats.reflector : mats.rail} />
      ))}
      <primitive object={posts} />
      <group position={gantry.pos} rotation={[0, gantry.yaw, 0]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[0, 3.6, side * (HALF + 1.6)]} material={mats.steel} castShadow>
            <boxGeometry args={[0.35, 7.2, 0.35]} />
          </mesh>
        ))}
        <mesh position={[0, 7.1, 0]} material={mats.steel}>
          <boxGeometry args={[0.5, 0.5, ROAD_WIDTH + 3.6]} />
        </mesh>
        <mesh position={[-0.3, 5.9, -LANE_OFFSET]} rotation={[0, -Math.PI / 2, 0]} material={signs.out}>
          <planeGeometry args={[5.2, 1.3]} />
        </mesh>
        <mesh position={[0.3, 5.9, LANE_OFFSET]} rotation={[0, Math.PI / 2, 0]} material={signs.back}>
          <planeGeometry args={[5.2, 1.3]} />
        </mesh>
      </group>
      <group ref={traffic}>
        {cars.map((_, i) => (
          <group key={i}>
            <mesh position={[0, 0.65, 0]} material={mats.carBody}>
              <boxGeometry args={[4.2, 0.7, 1.8]} />
            </mesh>
            <mesh position={[-0.3, 1.2, 0]} material={mats.carBody}>
              <boxGeometry args={[2.2, 0.5, 1.6]} />
            </mesh>
            {[-0.65, 0.65].map((z) => (
              <group key={z}>
                <mesh position={[2.11, 0.7, z]} material={mats.head}>
                  <boxGeometry args={[0.04, 0.1, 0.35]} />
                </mesh>
                <mesh position={[-2.11, 0.75, z]} material={mats.tail}>
                  <boxGeometry args={[0.04, 0.1, 0.35]} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}
