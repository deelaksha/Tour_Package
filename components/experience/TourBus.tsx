"use client";

import { BRAND } from "@/lib/config/brand";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getBusPose } from "@/lib/config/route";
import { effectiveBusS, journey } from "@/lib/animation/journeyStore";
import { DOOR_LOCAL_X } from "@/lib/animation/choreography";
import { createBeamMaterial, createGlowPoolMaterial } from "@/lib/three/shaders";
import { createSignTexture } from "@/lib/three/textures";
import { clamp, damp } from "@/lib/utils/math";

export const WHEEL_RADIUS = 0.55;
const BODY_DEPTH = 2.5;
const HALF_W = BODY_DEPTH / 2 + 0.06;
const WHEEL_X = [4.35, -3.9];

/** Independently controllable parts of the bus, exposed for animation code. */
export interface BusRig {
  root: THREE.Group;
  body: THREE.Group;
  wheels: THREE.Group[];
  doorLeaves: [THREE.Object3D, THREE.Object3D];
  step: THREE.Object3D;
  headlightMaterial: THREE.MeshStandardMaterial;
  headlights: THREE.SpotLight[];
  beams: THREE.Mesh[];
  interiorMaterial: THREE.MeshStandardMaterial;
}

function bodyShape() {
  const s = new THREE.Shape();
  s.moveTo(-6.0, 0.55);
  s.lineTo(WHEEL_X[1] - 0.7, 0.55);
  s.absarc(WHEEL_X[1], 0.55, 0.7, Math.PI, 0, true);
  s.lineTo(WHEEL_X[0] - 0.7, 0.55);
  s.absarc(WHEEL_X[0], 0.55, 0.7, Math.PI, 0, true);
  s.lineTo(5.85, 0.55);
  s.quadraticCurveTo(6.1, 0.55, 6.1, 0.85);
  s.lineTo(6.05, 1.9);
  s.quadraticCurveTo(5.95, 2.6, 5.3, 3.3);
  s.lineTo(-5.5, 3.38);
  s.quadraticCurveTo(-6.05, 3.35, -6.08, 2.9);
  s.lineTo(-6.05, 0.85);
  s.quadraticCurveTo(-6.05, 0.55, -6.0, 0.55);
  return s;
}

function glassShape() {
  const s = new THREE.Shape();
  s.moveTo(-5.75, 1.88);
  s.lineTo(6.02, 1.88);
  s.quadraticCurveTo(5.93, 2.56, 5.27, 3.2);
  s.lineTo(-5.75, 3.24);
  s.closePath();
  return s;
}

function extrude(shape: THREE.Shape, depth: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 16,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function TourBus({ rigRef, quality }: { rigRef?: RefObject<BusRig | null>; quality: "high" | "low" }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Group[]>([]);
  const leafA = useRef<THREE.Mesh>(null);
  const leafB = useRef<THREE.Mesh>(null);
  const step = useRef<THREE.Mesh>(null);
  const spotA = useRef<THREE.SpotLight>(null);
  const spotB = useRef<THREE.SpotLight>(null);
  const beamA = useRef<THREE.Mesh>(null);
  const beamB = useRef<THREE.Mesh>(null);
  const pool = useRef<THREE.Mesh>(null);

  const assets = useMemo(() => {
    const livery = createSignTexture(
      [
        { text: BRAND.short, size: 112, color: "#fff8ea", weight: 800 },
        { text: "TRAVELS · BENGALURU ⇄ THE COAST", size: 34, color: "#f2c46b", weight: 500 },
      ],
      1024,
      256,
    );
    const destination = createSignTexture([{ text: "BLR ⇄ THE COAST", size: 64, color: "#ffe2a0", weight: 700 }], 512, 96);
    return {
      bodyGeo: extrude(bodyShape(), BODY_DEPTH, 0.06),
      glassGeo: extrude(glassShape(), BODY_DEPTH + 0.17, 0),
      paint: new THREE.MeshStandardMaterial({ color: "#f1ece0", metalness: 0.25, roughness: 0.3 }),
      graphite: new THREE.MeshStandardMaterial({ color: "#1f4632", metalness: 0.3, roughness: 0.45 }),
      glass: new THREE.MeshStandardMaterial({ color: "#14261f", metalness: 0.7, roughness: 0.08, transparent: true, opacity: 0.8 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#0d0f13", roughness: 0.9 }),
      rim: new THREE.MeshStandardMaterial({ color: "#aeb8c6", metalness: 0.9, roughness: 0.25 }),
      dark: new THREE.MeshStandardMaterial({ color: "#05070b", roughness: 0.8 }),
      led: new THREE.MeshStandardMaterial({ color: "#2a1d08", emissive: new THREE.Color("#f2c46b"), emissiveIntensity: 1.5, toneMapped: false }),
      head: new THREE.MeshStandardMaterial({ color: "#d8e6ff", emissive: new THREE.Color("#eaf4ff"), emissiveIntensity: 0.2, toneMapped: false }),
      tail: new THREE.MeshStandardMaterial({ color: "#3a0508", emissive: new THREE.Color("#ff2340"), emissiveIntensity: 1.6, toneMapped: false }),
      interior: new THREE.MeshStandardMaterial({ color: "#3a2e1e", emissive: new THREE.Color("#a8783a"), emissiveIntensity: 0.6, roughness: 0.7 }),
      seat: new THREE.MeshStandardMaterial({ color: "#5a2f24", roughness: 0.8 }),
      livery: new THREE.MeshStandardMaterial({ map: livery, transparent: true, emissive: new THREE.Color("#ffffff"), emissiveMap: livery, emissiveIntensity: 0.35, roughness: 0.5 }),
      destination: new THREE.MeshBasicMaterial({ map: destination, toneMapped: false }),
      beam: createBeamMaterial("#cfe6ff", 0.35),
      pool: createGlowPoolMaterial("#bcd9ff", { value: 0 }),
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(assets).forEach((a) => {
        if (a instanceof THREE.BufferGeometry || a instanceof THREE.Material) a.dispose();
      });
      assets.livery.map?.dispose();
      assets.destination.map?.dispose();
    };
  }, [assets]);

  useEffect(() => {
    if (!rigRef || !root.current || !body.current || !leafA.current || !leafB.current || !step.current || !spotA.current || !spotB.current) return;
    rigRef.current = {
      root: root.current,
      body: body.current,
      wheels: wheelRefs.current,
      doorLeaves: [leafA.current, leafB.current],
      step: step.current,
      headlightMaterial: assets.head,
      headlights: [spotA.current, spotB.current],
      beams: [beamA.current, beamB.current].filter((b): b is THREE.Mesh => b !== null),
      interiorMaterial: assets.interior,
    };
  }, [rigRef, assets]);

  const pose = useMemo(() => getBusPose(0), []);
  const motion = useRef({ s: Number.NaN, vel: 0, pitch: 0, roll: 0, yaw: 0 });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = effectiveBusS();
    const ch = journey.channels;
    getBusPose(s, pose);
    const r = root.current;
    if (!r) return;
    r.position.copy(pose.position);
    r.rotation.y = pose.yaw;

    // Secondary motion: pitch under acceleration, roll into bends.
    const m = motion.current;
    if (Number.isNaN(m.s)) {
      m.s = s;
      m.yaw = pose.yaw;
    }
    const v = dt > 0 ? clamp((s - m.s) / dt, -60, 60) : 0;
    const accel = dt > 0 ? (v - m.vel) / dt : 0;
    let dyaw = pose.yaw - m.yaw;
    if (dyaw > Math.PI) dyaw -= Math.PI * 2;
    if (dyaw < -Math.PI) dyaw += Math.PI * 2;
    m.vel = damp(m.vel, v, 5, dt);
    m.pitch = damp(m.pitch, clamp(accel * 0.0025, -0.025, 0.025), 4, dt);
    m.roll = damp(m.roll, clamp((dt > 0 ? dyaw / dt : 0) * m.vel * 0.004, -0.04, 0.04), 4, dt);
    m.s = s;
    m.yaw = pose.yaw;
    if (body.current) {
      body.current.rotation.z = m.pitch;
      body.current.rotation.x = m.roll;
      body.current.position.y = Math.sin(s * 0.9) * 0.008 * Math.min(1, Math.abs(m.vel) / 10);
    }

    for (const w of wheelRefs.current) if (w) w.rotation.z = -s / WHEEL_RADIUS;

    // Plug door: leaves push out, then slide apart.
    const d = ch.door;
    const out = Math.min(1, d * 2.5);
    const slide = clamp((d - 0.25) / 0.75);
    if (leafA.current && leafB.current) {
      leafA.current.position.set(DOOR_LOCAL_X + 0.25 + slide * 0.52, 1.84, -HALF_W - 0.02 - out * 0.12);
      leafB.current.position.set(DOOR_LOCAL_X - 0.25 - slide * 0.52, 1.84, -HALF_W - 0.02 - out * 0.12);
    }
    if (step.current) step.current.position.z = -HALF_W + 0.05 - d * 0.32;

    const h = ch.headlights;
    assets.head.emissiveIntensity = 0.2 + h * 5;
    if (spotA.current) spotA.current.intensity = h * 90;
    if (spotB.current) spotB.current.intensity = h * 90;
    (assets.beam.uniforms.uIntensity as { value: number }).value = h * 0.35;
    (assets.pool.uniforms.uIntensity as { value: number }).value = h * 1.2;
    if (pool.current) pool.current.visible = h > 0.02;
    assets.interior.emissiveIntensity = 0.35 + d * 0.8 + h * 0.3;
  });

  const wheel = (x: number, z: number, i: number) => (
    <group
      key={i}
      position={[x, WHEEL_RADIUS, z]}
      ref={(g) => {
        if (g) wheelRefs.current[i] = g;
      }}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]} material={assets.rubber} castShadow>
        <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, 0.36, 28]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z > 0 ? 0.02 : -0.02]} material={assets.rim}>
        <cylinderGeometry args={[0.34, 0.34, 0.37, 10]} />
      </mesh>
      <mesh position={[0, 0, z > 0 ? 0.195 : -0.195]} material={assets.led}>
        <torusGeometry args={[0.27, 0.018, 6, 28]} />
      </mesh>
      <mesh position={[0.18, 0, z > 0 ? 0.19 : -0.19]} material={assets.dark}>
        <boxGeometry args={[0.08, 0.05, 0.01]} />
      </mesh>
    </group>
  );

  return (
    <group ref={root} name="tour-bus">
      <group ref={body}>
        <mesh geometry={assets.bodyGeo} material={assets.paint} castShadow receiveShadow />
        <mesh geometry={assets.glassGeo} material={assets.glass} />
        {/* Graphite skirt and roof pod */}
        <mesh position={[0, 0.72, 0]} material={assets.graphite}>
          <boxGeometry args={[11.9, 0.32, BODY_DEPTH + 0.14]} />
        </mesh>
        <mesh position={[-0.6, 3.5, 0]} material={assets.graphite} castShadow>
          <boxGeometry args={[8.6, 0.24, 2.1]} />
        </mesh>
        <mesh position={[-0.6, 3.5, 0]} material={assets.led}>
          <boxGeometry args={[8.7, 0.03, 2.16]} />
        </mesh>
        {/* Belt-line light strip */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[0.1, 1.8, side * (HALF_W + 0.01)]} material={assets.led}>
            <boxGeometry args={[11.6, 0.035, 0.02]} />
          </mesh>
        ))}
        {/* Livery */}
        <mesh position={[-1.6, 1.25, HALF_W + 0.012]} material={assets.livery}>
          <planeGeometry args={[4.4, 1.1]} />
        </mesh>
        <mesh position={[-1.6, 1.25, -HALF_W - 0.012]} rotation={[0, Math.PI, 0]} material={assets.livery}>
          <planeGeometry args={[4.4, 1.1]} />
        </mesh>
        {/* Destination board above the windshield */}
        <mesh position={[5.36, 3.1, 0]} rotation={[0, Math.PI / 2, -0.75]} material={assets.destination}>
          <planeGeometry args={[1.7, 0.3]} />
        </mesh>
        {/* Front: headlight clusters, LED brow, grille */}
        {[-0.82, 0.82].map((z) => (
          <mesh key={z} position={[6.1, 1.05, z]} material={assets.head}>
            <boxGeometry args={[0.06, 0.16, 0.62]} />
          </mesh>
        ))}
        <mesh position={[6.07, 1.58, 0]} material={assets.led}>
          <boxGeometry args={[0.04, 0.04, 2.3]} />
        </mesh>
        <mesh position={[6.1, 0.78, 0]} material={assets.dark}>
          <boxGeometry args={[0.06, 0.2, 1.1]} />
        </mesh>
        {/* Rear lights */}
        {[-0.9, 0.9].map((z) => (
          <mesh key={z} position={[-6.1, 1.15, z]} material={assets.tail}>
            <boxGeometry args={[0.05, 0.5, 0.36]} />
          </mesh>
        ))}
        <mesh position={[-6.1, 2.95, 0]} material={assets.tail}>
          <boxGeometry args={[0.05, 0.05, 2.0]} />
        </mesh>
        {/* Side mirrors on curved stalks */}
        {[-1, 1].map((side) => (
          <group key={side} position={[5.75, 2.75, side * (HALF_W - 0.05)]}>
            <mesh position={[0.1, 0, side * 0.22]} rotation={[side * 0.5, 0, 0]} material={assets.graphite}>
              <boxGeometry args={[0.05, 0.05, 0.5]} />
            </mesh>
            <mesh position={[0.2, -0.32, side * 0.44]} material={assets.graphite}>
              <boxGeometry args={[0.08, 0.42, 0.2]} />
            </mesh>
            <mesh position={[0.25, -0.32, side * 0.44]} material={assets.glass}>
              <boxGeometry args={[0.02, 0.36, 0.16]} />
            </mesh>
          </group>
        ))}
        {/* Wheel wells */}
        {WHEEL_X.map((x) => (
          <mesh key={x} position={[x, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={assets.dark}>
            <cylinderGeometry args={[0.69, 0.69, BODY_DEPTH + 0.05, 20, 1, true]} />
          </mesh>
        ))}
        {/* Interior: floor, ceiling light, seat rows */}
        <mesh position={[0, 0.94, 0]} material={assets.seat}>
          <boxGeometry args={[11.4, 0.04, 2.3]} />
        </mesh>
        <mesh position={[-0.2, 3.22, 0]} material={assets.interior}>
          <boxGeometry args={[11, 0.06, 0.5]} />
        </mesh>
        {Array.from({ length: 7 }, (_, row) =>
          [-0.62, 0.62].map((z) => (
            <group key={`${row}${z}`} position={[1.85 - row * 1.3, 0.94, z]}>
              <mesh position={[0, 0.45, 0]} material={assets.seat}>
                <boxGeometry args={[0.5, 0.12, 0.85]} />
              </mesh>
              <mesh position={[-0.3, 0.9, 0]} rotation={[0, 0, 0.12]} material={assets.seat}>
                <boxGeometry args={[0.12, 0.85, 0.85]} />
              </mesh>
            </group>
          )),
        )}
        {/* Door: dark opening, step lights, two plug-door leaves */}
        <mesh position={[DOOR_LOCAL_X, 1.75, -HALF_W + 0.012]} material={assets.dark}>
          <boxGeometry args={[1.04, 2.3, 0.04]} />
        </mesh>
        <mesh position={[DOOR_LOCAL_X, 0.62, -HALF_W + 0.05]} material={assets.led}>
          <boxGeometry args={[0.96, 0.02, 0.06]} />
        </mesh>
        <mesh ref={step} position={[DOOR_LOCAL_X, 0.39, -HALF_W + 0.05]} material={assets.graphite}>
          <boxGeometry args={[0.96, 0.06, 0.36]} />
        </mesh>
        <mesh position={[DOOR_LOCAL_X, 0.78, -HALF_W + 0.25]} material={assets.graphite}>
          <boxGeometry args={[0.96, 0.06, 0.5]} />
        </mesh>
        {[leafA, leafB].map((ref, i) => (
          <mesh key={i} ref={ref} material={assets.glass}>
            <boxGeometry args={[0.5, 2.2, 0.04]} />
          </mesh>
        ))}
        {/* Headlight beams and road pool */}
        <spotLight ref={spotA} position={[6.15, 1.05, -0.82]} angle={0.42} penumbra={0.7} distance={70} decay={1.3} color="#e4efff" intensity={0}>
          <object3D attach="target" position={[30, -1, -1.5]} />
        </spotLight>
        <spotLight ref={spotB} position={[6.15, 1.05, 0.82]} angle={0.42} penumbra={0.7} distance={70} decay={1.3} color="#e4efff" intensity={0}>
          <object3D attach="target" position={[30, -1, 1.5]} />
        </spotLight>
        {quality === "high" &&
          [beamA, beamB].map((ref, i) => (
            <mesh key={i} ref={ref} position={[6.15 + 6, 0.85, i ? 0.82 : -0.82]} rotation={[0, 0, Math.PI / 2 + 0.06]} material={assets.beam}>
              <coneGeometry args={[1.6, 12, 24, 1, true]} />
            </mesh>
          ))}
        <mesh ref={pool} position={[14, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[16, 7, 1]} material={assets.pool}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      </group>
      {WHEEL_X.flatMap((x, i) => [wheel(x, -1.18, i * 2), wheel(x, 1.18, i * 2 + 1)])}
    </group>
  );
}
