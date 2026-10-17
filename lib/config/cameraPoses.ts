/**
 * Named camera shots. A shot is either fixed in the world or rigged to the bus
 * (offsets in bus space: forward / up / left). The master timeline tweens a
 * fractional shot index; JourneyCamera eases between neighbouring shots, so a
 * transition from a world shot to a tracking shot is a continuous dolly.
 */
type V3 = [number, number, number];

export interface CameraShot {
  id: string;
  frame: "world" | "bus";
  /** World xyz, or bus-relative [forward, up, left]. */
  position: V3;
  target: V3;
  fov: number;
}

export const CAMERA_SHOTS: CameraShot[] = [
  { id: "establish", frame: "world", position: [15, 8.5, -38], target: [40, 3.2, -2], fov: 42 },
  { id: "pickupWide", frame: "world", position: [27, 2.4, -19.5], target: [39, 1.3, -6], fov: 40 },
  { id: "queue", frame: "world", position: [30.5, 1.8, -14], target: [41, 1.5, -4.8], fov: 38 },
  { id: "doorClose", frame: "world", position: [50, 2.0, -12], target: [42.6, 1.6, -4.4], fov: 38 },
  { id: "lowFront", frame: "bus", position: [14, 0.8, 5.5], target: [0, 2.0, 0], fov: 40 },
  { id: "sideTrack", frame: "bus", position: [1.5, 2.4, 13], target: [1, 1.6, 0], fov: 38 },
  { id: "rearFollow", frame: "bus", position: [-22, 6.5, 3], target: [10, 2, 0], fov: 42 },
  { id: "aerial", frame: "bus", position: [-38, 34, -30], target: [25, 0, 0], fov: 46 },
  { id: "scenicSide", frame: "bus", position: [9, 3.2, -15], target: [0, 1.8, 0], fov: 40 },
  { id: "oceanReveal", frame: "world", position: [884, 9, -16], target: [934, 0, -85], fov: 46 },
  { id: "coastDoor", frame: "world", position: [942, 2.2, -47], target: [929, 1.4, -42.5], fov: 40 },
  { id: "beachWide", frame: "world", position: [911, 3.6, -44], target: [932, 0.6, -64], fov: 44 },
  { id: "groupClose", frame: "world", position: [938, 1.5, -60], target: [926, 1.1, -54], fov: 40 },
  { id: "partyWide", frame: "world", position: [907, 6, -37], target: [926, 0.8, -54], fov: 44 },
  { id: "partyClose", frame: "world", position: [933, 1.8, -57], target: [925.5, 1.2, -50.5], fov: 40 },
  { id: "returnBoard", frame: "world", position: [914, 2.4, -50], target: [929, 1.5, -42], fov: 40 },
  { id: "returnRear", frame: "bus", position: [-20, 7, -4], target: [12, 2, 0], fov: 42 },
  { id: "returnAerial", frame: "bus", position: [-20, 45, 40], target: [40, 0, 0], fov: 46 },
  { id: "homeArrive", frame: "world", position: [18, 3.2, 17], target: [35, 1.8, -3.4], fov: 40 },
  { id: "finalWide", frame: "world", position: [6, 6.5, 30], target: [24, 4, 4], fov: 44 },
];

/** [start, duration] of the blend into shot i+1, on the story clock. */
export const SHOT_SCHEDULE: [number, number][] = [
  [4.5, 4],
  [9, 3],
  [12.2, 2.3],
  [22.6, 2.4],
  [27, 3.5],
  [33, 3],
  [38, 4],
  [44.5, 3],
  [49.5, 4],
  [56.5, 2.3],
  [62, 3],
  [66, 3],
  [72, 3.5],
  [78, 3],
  [84, 3],
  [96.5, 3],
  [101, 4],
  [107, 4],
  [114.5, 4],
];

/** Where the camera starts before the intro reveal settles into shot 0. */
export const INTRO_SHOT: CameraShot = {
  id: "intro",
  frame: "world",
  position: [24, 85, -52],
  target: [40, 0, -4],
  fov: 50,
};
