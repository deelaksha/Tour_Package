import * as THREE from "three";

/**
 * Uniform objects shared by reference across every custom shader, so the
 * atmosphere rig updates the whole world with a handful of writes per frame.
 */
export const shared = {
  uTime: { value: 0 },
  uCityGlow: { value: 1 },
  uParty: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uSunColor: { value: new THREE.Color() },
  uSunDisc: { value: 1 },
  uSkyTop: { value: new THREE.Color() },
  uSkyHorizon: { value: new THREE.Color() },
  uSkyBottom: { value: new THREE.Color() },
  uHemiSky: { value: new THREE.Color() },
  uHemiGround: { value: new THREE.Color() },
  uStars: { value: 1 },
  uPixelRatio: { value: 1 },
  /** What the camera is looking at, for the occluder fade. */
  uFadeTarget: { value: new THREE.Vector3() },
};
