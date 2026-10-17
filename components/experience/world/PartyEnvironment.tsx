"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BONFIRE } from "@/lib/animation/choreography";
import { journey } from "@/lib/animation/journeyStore";
import { T } from "@/lib/config/journeyScenes";
import { terrainHeight } from "@/lib/three/terrain";
import { createFlameMaterial, createParticleMaterial } from "@/lib/three/shaders";
import { withOcclusionFade } from "@/lib/three/occlusionFade";
import { mulberry32, smoothstep } from "@/lib/utils/math";

const POLE_RADIUS = 8.5;
const POLES = 6;
const BULBS_PER_SPAN = 14;
const BULB_COLORS = ["#ffd9a0", "#ffb867", "#fff0c8"];

function pointCloud(count: number, seed: number, place: (rnd: () => number) => [number, number, number]) {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set(place(rnd), i * 3);
    seeds[i] = rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  return g;
}

/**
 * The beach night: a bonfire ringed by driftwood seats, bamboo lantern poles
 * with warm festoon lights, sparks and fireflies. The fire and lights fade up
 * with the `party` channel; the poles and strings only exist for the night so
 * they never stand on the afternoon beach as dark posts.
 */
export function PartyEnvironment({ quality }: { quality: "high" | "low" }) {
  const groundY = useMemo(() => terrainHeight(BONFIRE.x, BONFIRE.z), []);

  const mats = useMemo(
    () => ({
      stone: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#6a645c", flatShading: true, roughness: 0.9 })),
      log: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#7a5a3e", roughness: 0.9 })),
      ember: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#2a0d02", emissive: new THREE.Color("#ff5a1a"), emissiveIntensity: 0, toneMapped: false })),
      bamboo: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#b89a5e", roughness: 0.7 })),
      lantern: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#5a2a10", emissive: new THREE.Color("#ffab4a"), emissiveIntensity: 0, toneMapped: false })),
      bulbs: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, toneMapped: false }),
      wire: new THREE.LineBasicMaterial({ color: "#3a2f24" }),
      flame: createFlameMaterial(),
      sparks: createParticleMaterial("#ffb060", 1.4, 4.5),
      fireflies: createParticleMaterial("#d9f27a", 0.3),
    }),
    [],
  );

  const poles = useMemo(
    () =>
      Array.from({ length: POLES }, (_, i) => {
        const a = (i / POLES) * Math.PI * 2 + 0.25;
        const x = BONFIRE.x + Math.cos(a) * POLE_RADIUS;
        const z = BONFIRE.z + Math.sin(a) * POLE_RADIUS;
        return { x, z, y: terrainHeight(x, z) };
      }),
    [],
  );

  // Festoon lights strung between neighbouring poles.
  const strings = useMemo(() => {
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), mats.bulbs, POLES * BULBS_PER_SPAN);
    const points: THREE.Vector3[] = [];
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    let k = 0;
    for (let i = 0; i < POLES; i++) {
      const a = poles[i];
      const b = poles[(i + 1) % POLES];
      for (let j = 0; j <= BULBS_PER_SPAN; j++) {
        const f = j / BULBS_PER_SPAN;
        const p = new THREE.Vector3(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f + 3.1 - Math.sin(Math.PI * f) * 0.9, a.z + (b.z - a.z) * f);
        points.push(p);
        if (j < BULBS_PER_SPAN) {
          bulbs.setMatrixAt(k, m.makeTranslation(p.x, p.y - 0.12, p.z));
          bulbs.setColorAt(k, c.set(BULB_COLORS[k % BULB_COLORS.length]).multiplyScalar(2.5));
          k++;
        }
      }
    }
    bulbs.instanceMatrix.needsUpdate = true;
    if (bulbs.instanceColor) bulbs.instanceColor.needsUpdate = true;
    bulbs.frustumCulled = false;
    const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mats.wire);
    return { bulbs, wire };
  }, [mats, poles]);

  const sparks = useMemo(
    () => pointCloud(quality === "high" ? 160 : 60, 31, (r) => [BONFIRE.x + (r() - 0.5) * 1.2, groundY + 0.4, BONFIRE.z + (r() - 0.5) * 1.2]),
    [quality, groundY],
  );
  const fireflies = useMemo(
    () => pointCloud(quality === "high" ? 180 : 70, 33, (r) => [BONFIRE.x + (r() - 0.5) * 34, groundY + r() * 1.5, BONFIRE.z + 6 + (r() - 0.5) * 24]),
    [quality, groundY],
  );

  const fireLight = useRef<THREE.PointLight>(null);
  const lanternLight = useRef<THREE.PointLight>(null);
  const flames = useRef<THREE.Group>(null);
  const poleGroup = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const p = journey.channels.party;
    const t = clock.elapsedTime;
    const flicker = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.07;
    const fire = Math.min(1, p * 1.6);

    if (fireLight.current) fireLight.current.intensity = fire * 30 * flicker;
    if (lanternLight.current) lanternLight.current.intensity = p * 14;
    mats.ember.emissiveIntensity = fire * 2.5 * flicker;
    mats.lantern.emissiveIntensity = p * 2.2;
    mats.bulbs.opacity = Math.min(1, p * 1.4);
    (mats.flame.uniforms.uIntensity as { value: number }).value = fire;
    (mats.sparks.uniforms.uIntensity as { value: number }).value = fire;
    (mats.fireflies.uniforms.uIntensity as { value: number }).value = p;
    if (flames.current) flames.current.visible = fire > 0.01;

    // Poles rise out of the sand as the night begins and sink once the bus has left.
    const time = journey.time;
    const rise = smoothstep(T.celebrationStart - 0.5, T.celebrationStart + 2.5, time) * (1 - smoothstep(T.returnDepart + 1, T.returnDepart + 3, time));
    if (poleGroup.current) {
      poleGroup.current.visible = rise > 0.001;
      poleGroup.current.children.forEach((c) => c.scale.set(1, Math.max(rise, 0.001), 1));
    }
    const strung = rise > 0.98;
    strings.bulbs.visible = strung;
    strings.wire.visible = strung;
  });

  useEffect(
    () => () => {
      strings.bulbs.geometry.dispose();
      strings.bulbs.dispose();
      strings.wire.geometry.dispose();
      sparks.dispose();
      fireflies.dispose();
      Object.values(mats).forEach((m) => m.dispose());
    },
    [strings, sparks, fireflies, mats],
  );

  const stones = Array.from({ length: 11 }, (_, i) => (i / 11) * Math.PI * 2);
  const seats = [0.9, 2.95, 5.05];

  return (
    <group name="beach-night">
      {/* Fire pit */}
      <group position={[BONFIRE.x, groundY, BONFIRE.z]}>
        {stones.map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.95, 0.1, Math.sin(a) * 0.95]} material={mats.stone} castShadow>
            <icosahedronGeometry args={[0.22, 0]} />
          </mesh>
        ))}
        {[0, 1.1, 2.2].map((r) => (
          <mesh key={r} position={[0, 0.18, 0]} rotation={[0.35, r, Math.PI / 2]} material={mats.log}>
            <cylinderGeometry args={[0.1, 0.12, 1.4, 8]} />
          </mesh>
        ))}
        <mesh position={[0, 0.12, 0]} material={mats.ember}>
          <sphereGeometry args={[0.45, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <group ref={flames}>
          {[
            [0, 1.3, 0.55],
            [0.2, 0.95, 0.4],
            [-0.18, 1.05, 0.38],
          ].map(([x, h, r], i) => (
            <mesh key={i} position={[x, 0.2 + h / 2, (i - 1) * 0.12]} material={mats.flame}>
              <coneGeometry args={[r, h, 12, 4, true]} />
            </mesh>
          ))}
        </group>
        <pointLight ref={fireLight} position={[0, 1.2, 0]} color="#ff9a4a" distance={24} decay={1.6} intensity={0} />
        <pointLight ref={lanternLight} position={[0, 3.4, 0]} color="#ffc27a" distance={28} decay={1.4} intensity={0} />
        {/* Driftwood log seats */}
        {seats.map((a) => (
          <mesh key={a} position={[Math.cos(a) * 4.6, 0.2, Math.sin(a) * 4.6]} rotation={[0, -a, Math.PI / 2]} material={mats.log} castShadow>
            <cylinderGeometry args={[0.22, 0.25, 2.6, 10]} />
          </mesh>
        ))}
      </group>
      {/* Bamboo lantern poles */}
      <group ref={poleGroup}>
        {poles.map((p, i) => (
          <group key={i} position={[p.x, p.y, p.z]}>
            <mesh position={[0, 1.7, 0]} material={mats.bamboo} castShadow>
              <cylinderGeometry args={[0.07, 0.09, 3.4, 8]} />
            </mesh>
            <mesh position={[0, 3.25, 0]} material={mats.lantern}>
              <sphereGeometry args={[0.2, 12, 10]} />
            </mesh>
          </group>
        ))}
      </group>
      <primitive object={strings.bulbs} />
      <primitive object={strings.wire} />
      <points geometry={sparks} material={mats.sparks} frustumCulled={false} />
      <points geometry={fireflies} material={mats.fireflies} frustumCulled={false} />
    </group>
  );
}
