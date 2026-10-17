"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { PLAZA_RADIUS, ROAD_WIDTH, ROUNDABOUT_CENTER } from "@/lib/config/route";
import { flatRibbon, sampleCenterline, type RibbonSample } from "@/lib/three/ribbon";
import { createRoadTexture } from "@/lib/three/textures";
import { createGlowPoolMaterial } from "@/lib/three/shaders";
import { withOcclusionFade } from "@/lib/three/occlusionFade";

const HALF = ROAD_WIDTH / 2;

interface LampSpec {
  xMin: number;
  xMax: number;
  spacing: number;
  height: number;
  color: string;
  stagger: boolean;
}

const LAMPS: LampSpec[] = [
  { xMin: -200, xMax: 250, spacing: 26, height: 7.5, color: "#fff1d6", stagger: false },
  { xMin: 250, xMax: 470, spacing: 42, height: 10, color: "#ffd9a8", stagger: true },
  { xMin: 760, xMax: 905, spacing: 30, height: 6.5, color: "#ffc68a", stagger: true },
];

function lampTransforms(samples: RibbonSample[], spec: LampSpec) {
  const out: { pos: THREE.Vector3; yaw: number; side: number; color: string; height: number }[] = [];
  let next = -Infinity;
  let k = 0;
  for (const smp of samples) {
    if (smp.point.x < spec.xMin || smp.point.x > spec.xMax || smp.s < next) continue;
    next = smp.s + spec.spacing;
    const sides = spec.stagger ? [k % 2 ? 1 : -1] : [1, -1];
    for (const side of sides) {
      const pos = smp.point.clone().addScaledVector(smp.left, side * (HALF + 1.4));
      const yaw = Math.atan2(-smp.tangent.z, smp.tangent.x);
      out.push({ pos, yaw, side, color: spec.color, height: spec.height });
    }
    k++;
  }
  return out;
}

export function Road({ quality }: { quality: "high" | "low" }) {
  const data = useMemo(() => {
    const samples = sampleCenterline(2);
    const road = flatRibbon(samples, HALF, -HALF, 0.03, 10);
    const citySamples = samples.filter((s) => s.point.x < 260);
    const walkL = flatRibbon(citySamples, HALF + 0.15, HALF + 4.5, 0.08, 4);
    const walkR = flatRibbon(citySamples, -HALF - 0.15, -HALF - 4.5, 0.08, 4);
    const kerbL = flatRibbon(citySamples, HALF + 0.02, HALF + 0.14, 0.085, 4);
    const kerbR = flatRibbon(citySamples, -HALF - 0.02, -HALF - 0.14, 0.085, 4);

    const lamps = LAMPS.flatMap((spec) => lampTransforms(samples, spec));

    // Reflective road studs along both lane edges.
    const studs: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    samples.forEach((smp, i) => {
      if (i % 5) return;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-smp.tangent.z, smp.tangent.x));
      for (const side of [1, -1]) {
        const p = smp.point.clone().addScaledVector(smp.left, side * (HALF - 0.35));
        p.y = 0.05;
        studs.push(m.compose(p, q, new THREE.Vector3(1, 1, 1)).clone());
      }
    });

    const tex = createRoadTexture(quality === "high" ? 8 : 2);
    return { road, walkL, walkR, kerbL, kerbR, lamps, studs, tex };
  }, [quality]);

  const mats = useMemo(
    () => ({
      road: new THREE.MeshStandardMaterial({ map: data.tex, roughness: 0.62, metalness: 0.1 }),
      walk: new THREE.MeshStandardMaterial({ color: "#5d564c", roughness: 0.85 }),
      kerb: new THREE.MeshStandardMaterial({ color: "#b9b2a2", roughness: 0.8 }),
      plaza: new THREE.MeshStandardMaterial({ color: "#3a3631", roughness: 0.85 }),
      island: new THREE.MeshStandardMaterial({ color: "#2c4a2a", roughness: 0.9 }),
      pole: withOcclusionFade(new THREE.MeshStandardMaterial({ color: "#2a313d", metalness: 0.7, roughness: 0.4 })),
      head: withOcclusionFade(new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false })),
      stud: new THREE.MeshBasicMaterial({ color: "#ffb347", toneMapped: false }),
      led: new THREE.MeshStandardMaterial({ color: "#2a1d08", emissive: new THREE.Color("#f2c46b"), emissiveIntensity: 1.4, toneMapped: false }),
    }),
    [data.tex],
  );

  const pools = useMemo(() => ({ cool: createGlowPoolMaterial("#ffe9c4"), warm: createGlowPoolMaterial("#ffc27a") }), []);

  const instanced = useMemo(() => {
    const n = data.lamps.length;
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.12, 1, 8).translate(0, 0.5, 0), mats.pole, n);
    const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.08, 2.4).translate(0, 0, 1.2), mats.pole, n);
    const head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.08, 1.1), mats.head, n);
    const coolLamps = data.lamps.filter((l) => l.color === "#fff1d6");
    const warmLamps = data.lamps.filter((l) => l.color !== "#fff1d6");
    const poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const poolCool = new THREE.InstancedMesh(poolGeo, pools.cool, coolLamps.length);
    const poolWarm = new THREE.InstancedMesh(poolGeo, pools.warm, warmLamps.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const color = new THREE.Color();
    let ci = 0;
    let wi = 0;
    data.lamps.forEach((l, i) => {
      // Arm points from the pole toward the road (along -side * left).
      e.set(0, l.yaw + (l.side > 0 ? 0 : Math.PI), 0);
      q.setFromEuler(e);
      pole.setMatrixAt(i, m.compose(l.pos, q, new THREE.Vector3(1, l.height, 1)));
      const top = l.pos.clone().setY(l.height);
      arm.setMatrixAt(i, m.compose(top, q, new THREE.Vector3(1, 1, 1)));
      const toRoad = new THREE.Vector3(0, 0, 2.2).applyQuaternion(q);
      const headPos = top.clone().add(toRoad).setY(l.height - 0.06);
      head.setMatrixAt(i, m.compose(headPos, q, new THREE.Vector3(1, 1, 1)));
      head.setColorAt(i, color.set(l.color).multiplyScalar(3));
      const poolPos = headPos.clone().setY(0.06);
      const s = l.height * 1.5;
      if (l.color === "#fff1d6") poolCool.setMatrixAt(ci++, m.compose(poolPos, q, new THREE.Vector3(s, 1, s)));
      else poolWarm.setMatrixAt(wi++, m.compose(poolPos, q, new THREE.Vector3(s, 1, s)));
    });
    for (const im of [pole, arm, head, poolCool, poolWarm]) {
      im.instanceMatrix.needsUpdate = true;
      im.frustumCulled = false;
    }
    pole.castShadow = true;
    const studs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.04, 0.1), mats.stud, data.studs.length);
    data.studs.forEach((mm, i) => studs.setMatrixAt(i, mm));
    studs.instanceMatrix.needsUpdate = true;
    studs.frustumCulled = false;
    return { pole, arm, head, poolCool, poolWarm, studs };
  }, [data, mats, pools]);

  useEffect(
    () => () => {
      [data.road, data.walkL, data.walkR, data.kerbL, data.kerbR].forEach((g) => g.dispose());
      data.tex.dispose();
      Object.values(instanced).forEach((im) => {
        im.geometry.dispose();
        im.dispose();
      });
      Object.values(mats).forEach((m) => m.dispose());
      Object.values(pools).forEach((m) => m.dispose());
    },
    [data, instanced, mats, pools],
  );

  return (
    <group name="road">
      <mesh geometry={data.road} material={mats.road} receiveShadow />
      <mesh geometry={data.walkL} material={mats.walk} receiveShadow />
      <mesh geometry={data.walkR} material={mats.walk} receiveShadow />
      <mesh geometry={data.kerbL} material={mats.kerb} />
      <mesh geometry={data.kerbR} material={mats.kerb} />
      {/* Coastal roundabout plaza with a planted island */}
      <mesh position={[ROUNDABOUT_CENTER.x, 0.035, ROUNDABOUT_CENTER.z]} rotation={[-Math.PI / 2, 0, 0]} material={mats.plaza} receiveShadow>
        <circleGeometry args={[PLAZA_RADIUS, 64]} />
      </mesh>
      <mesh position={[ROUNDABOUT_CENTER.x, 0.15, ROUNDABOUT_CENTER.z]} material={mats.island} receiveShadow>
        <cylinderGeometry args={[4.4, 4.6, 0.25, 40]} />
      </mesh>
      <mesh position={[ROUNDABOUT_CENTER.x, 0.29, ROUNDABOUT_CENTER.z]} rotation={[Math.PI / 2, 0, 0]} material={mats.led}>
        <torusGeometry args={[4.5, 0.05, 6, 64]} />
      </mesh>
      <primitive object={instanced.pole} />
      <primitive object={instanced.arm} />
      <primitive object={instanced.head} />
      <primitive object={instanced.poolCool} />
      <primitive object={instanced.poolWarm} />
      <primitive object={instanced.studs} />
    </group>
  );
}
