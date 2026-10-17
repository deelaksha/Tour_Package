"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ATMOSPHERES } from "@/lib/config/atmosphere";
import { journey } from "@/lib/animation/journeyStore";
import { shared } from "@/lib/three/sharedUniforms";
import { createSkyMaterial, createStarsMaterial } from "@/lib/three/shaders";
import { cameraRig } from "./JourneyCamera";
import { mulberry32 } from "@/lib/utils/math";

interface Resolved {
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  skyBottom: THREE.Color;
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  fog: THREE.Color;
}

const presets: Resolved[] = ATMOSPHERES.map((a) => ({
  skyTop: new THREE.Color(a.skyTop),
  skyHorizon: new THREE.Color(a.skyHorizon),
  skyBottom: new THREE.Color(a.skyBottom),
  sunDir: new THREE.Vector3(...a.sunDir).normalize(),
  sunColor: new THREE.Color(a.sunColor),
  hemiSky: new THREE.Color(a.hemiSky),
  hemiGround: new THREE.Color(a.hemiGround),
  fog: new THREE.Color(a.fog),
}));

/**
 * Time of day: sky dome, stars, sun/moon, hemisphere fill, fog and exposure,
 * all interpolated from the `atmo` channel of the master timeline.
 */
export function SceneAtmosphere({ quality }: { quality: "high" | "low" }) {
  const { scene, gl } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sky = useRef<THREE.Mesh>(null);
  const stars = useRef<THREE.Points>(null);

  const fog = useMemo(() => new THREE.FogExp2("#0b1a36", 0.003), []);
  const skyMaterial = useMemo(() => createSkyMaterial(), []);
  const starMaterial = useMemo(() => createStarsMaterial(), []);
  const starGeometry = useMemo(() => {
    const rnd = mulberry32(41);
    const n = quality === "high" ? 2200 : 900;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1;
      const th = rnd() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const y = Math.abs(u) * 0.95 + 0.02;
      pos.set([Math.cos(th) * r * 900, y * 900, Math.sin(th) * r * 900], i * 3);
      size[i] = 0.6 + Math.pow(rnd(), 6) * 3.2;
      seed[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [quality]);

  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  useEffect(
    () => () => {
      skyMaterial.dispose();
      starMaterial.dispose();
      starGeometry.dispose();
    },
    [skyMaterial, starMaterial, starGeometry],
  );

  useFrame(({ clock, camera }) => {
    shared.uTime.value = clock.elapsedTime;
    shared.uParty.value = journey.channels.party;
    shared.uPixelRatio.value = gl.getPixelRatio();

    const f = THREE.MathUtils.clamp(journey.channels.atmo, 0, ATMOSPHERES.length - 1);
    const i = Math.min(Math.floor(f), ATMOSPHERES.length - 2);
    const k = f - i;
    const A = presets[i];
    const B = presets[i + 1];
    const a = ATMOSPHERES[i];
    const b = ATMOSPHERES[i + 1];
    const mix = (x: number, y: number) => x + (y - x) * k;

    // Intro: the world fades up out of darkness.
    const reveal = 0.25 + 0.75 * Math.min(1, journey.intro * 1.2 + journey.time);

    shared.uSkyTop.value.lerpColors(A.skyTop, B.skyTop, k);
    shared.uSkyHorizon.value.lerpColors(A.skyHorizon, B.skyHorizon, k);
    shared.uSkyBottom.value.lerpColors(A.skyBottom, B.skyBottom, k);
    shared.uSunDir.value.lerpVectors(A.sunDir, B.sunDir, k).normalize();
    shared.uSunColor.value.lerpColors(A.sunColor, B.sunColor, k);
    shared.uSunDisc.value = mix(a.sunDisc, b.sunDisc);
    shared.uStars.value = mix(a.stars, b.stars);
    shared.uCityGlow.value = mix(a.cityGlow, b.cityGlow) * reveal;
    shared.uHemiSky.value.lerpColors(A.hemiSky, B.hemiSky, k);
    shared.uHemiGround.value.lerpColors(A.hemiGround, B.hemiGround, k);

    fog.color.lerpColors(A.fog, B.fog, k);
    fog.density = mix(a.fogDensity, b.fogDensity);
    gl.toneMappingExposure = mix(a.exposure, b.exposure) * reveal;
    scene.environmentIntensity = mix(a.envIntensity, b.envIntensity);

    if (hemi.current) {
      hemi.current.color.copy(shared.uHemiSky.value);
      hemi.current.groundColor.copy(shared.uHemiGround.value);
      hemi.current.intensity = mix(a.hemiIntensity, b.hemiIntensity);
    }
    if (sun.current) {
      // Shadow frustum follows what the camera is looking at.
      const target = cameraRig.target;
      sun.current.target.position.copy(target);
      sun.current.position.copy(target).addScaledVector(shared.uSunDir.value, 120);
      sun.current.color.copy(shared.uSunColor.value);
      sun.current.intensity = mix(a.sunIntensity, b.sunIntensity);
      sun.current.target.updateMatrixWorld();
    }
    if (sky.current) sky.current.position.copy(camera.position);
    if (stars.current) {
      stars.current.position.copy(camera.position);
      stars.current.visible = shared.uStars.value > 0.01;
    }
  });

  return (
    <>
      <mesh ref={sky} material={skyMaterial} frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[1000, 32, 16]} />
      </mesh>
      <points ref={stars} geometry={starGeometry} material={starMaterial} frustumCulled={false} renderOrder={-1} />
      <hemisphereLight ref={hemi} intensity={0.6} />
      <directionalLight
        ref={sun}
        castShadow={quality === "high"}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={10}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  );
}
