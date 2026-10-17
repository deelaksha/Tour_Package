/**
 * Time-of-day presets. The master timeline tweens a fractional index through
 * this list and the lighting rig interpolates every value.
 */
export interface Atmosphere {
  id: string;
  skyTop: string;
  skyHorizon: string;
  skyBottom: string;
  /** Direction toward the sun (or moon at night). */
  sunDir: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  /** How visible the sun/moon disc is in the sky. */
  sunDisc: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fog: string;
  fogDensity: number;
  stars: number;
  exposure: number;
  /** Scales lit windows, streetlights and other city emissives. */
  cityGlow: number;
  /** Strength of the reflection environment on paint, glass and metal. */
  envIntensity: number;
}

export const ATMOSPHERES: Atmosphere[] = [
  {
    id: "bengaluruDawn",
    skyTop: "#2c4c7e", skyHorizon: "#f3b28c", skyBottom: "#2a2f3a",
    sunDir: [-0.6, 0.12, 0.75], sunColor: "#ffc59a", sunIntensity: 1.5, sunDisc: 0.9,
    hemiSky: "#a3b9d8", hemiGround: "#2c3a2c", hemiIntensity: 0.95,
    fog: "#8f97ab", fogDensity: 0.0026, stars: 0.12, exposure: 1.0, cityGlow: 0.55, envIntensity: 0.6,
  },
  {
    id: "highwayMorning",
    skyTop: "#4d7fb9", skyHorizon: "#f5d6ae", skyBottom: "#4a5560",
    sunDir: [-0.45, 0.32, 0.6], sunColor: "#ffe2bc", sunIntensity: 2.1, sunDisc: 0.8,
    hemiSky: "#b8cfe8", hemiGround: "#3a4a30", hemiIntensity: 1.0,
    fog: "#b8c3c6", fogDensity: 0.0022, stars: 0, exposure: 1.0, cityGlow: 0.15, envIntensity: 0.7,
  },
  {
    id: "ghatsMist",
    skyTop: "#6e94b4", skyHorizon: "#dce5e0", skyBottom: "#5e6c62",
    sunDir: [-0.3, 0.55, 0.5], sunColor: "#fff1d6", sunIntensity: 2.2, sunDisc: 0.5,
    hemiSky: "#c6dbe0", hemiGround: "#2f4a2a", hemiIntensity: 1.1,
    fog: "#b6c8c0", fogDensity: 0.0058, stars: 0, exposure: 1.0, cityGlow: 0, envIntensity: 0.7,
  },
  {
    id: "coastGolden",
    skyTop: "#38508c", skyHorizon: "#ffad66", skyBottom: "#4a3446",
    sunDir: [0.18, 0.09, -1], sunColor: "#ffb877", sunIntensity: 2.6, sunDisc: 1,
    hemiSky: "#a99acc", hemiGround: "#62452c", hemiIntensity: 0.9,
    fog: "#d39577", fogDensity: 0.0019, stars: 0, exposure: 1.0, cityGlow: 0.25, envIntensity: 0.7,
  },
  {
    id: "beachMoonlight",
    skyTop: "#122046", skyHorizon: "#46508a", skyBottom: "#1a1c30",
    sunDir: [0.4, 0.45, -0.8], sunColor: "#d0dbff", sunIntensity: 1.0, sunDisc: 0.9,
    hemiSky: "#6a80b8", hemiGround: "#26242c", hemiIntensity: 1.0,
    fog: "#1f2744", fogDensity: 0.0032, stars: 1, exposure: 1.1, cityGlow: 1, envIntensity: 0.45,
  },
  {
    id: "moonlitDrive",
    skyTop: "#13234a", skyHorizon: "#46608f", skyBottom: "#1a2030",
    sunDir: [-0.3, 0.6, 0.5], sunColor: "#d2deff", sunIntensity: 1.1, sunDisc: 0.9,
    hemiSky: "#7088bd", hemiGround: "#232a26", hemiIntensity: 1.15,
    fog: "#2e3d5c", fogDensity: 0.0028, stars: 1, exposure: 1.2, cityGlow: 1, envIntensity: 0.45,
  },
  {
    id: "bengaluruSunrise",
    skyTop: "#3a6098", skyHorizon: "#ffc28c", skyBottom: "#3a3a48",
    sunDir: [-1, 0.16, 0.3], sunColor: "#ffd4aa", sunIntensity: 1.9, sunDisc: 0.9,
    hemiSky: "#abc0dd", hemiGround: "#2d3428", hemiIntensity: 0.95,
    fog: "#a4a6b8", fogDensity: 0.0028, stars: 0, exposure: 1.0, cityGlow: 0.4, envIntensity: 0.65,
  },
];

/** [start, duration] of the blend into preset i+1, on the story clock. */
export const ATMOSPHERE_SCHEDULE: [number, number][] = [
  [31, 6],
  [40, 6],
  [48, 7],
  [72, 6],
  [97, 6],
  [107, 7],
];
