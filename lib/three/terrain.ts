import { PLAZA_RADIUS, ROUNDABOUT_CENTER, roadZAt } from "@/lib/config/route";
import { fbm2, smoothstep, lerp } from "@/lib/utils/math";

export const SEA_LEVEL = -0.45;
export const SHORE_Z = -61;

/**
 * Single source of truth for ground height, shared by the terrain mesh,
 * scattered vegetation, the travelers' feet and the camera's ground clamp.
 */
export function terrainHeight(x: number, z: number) {
  const dz = z - roadZAt(x);
  const adz = Math.abs(dz);
  const roadFlat = smoothstep(9, 26, adz);

  const dxp = x - ROUNDABOUT_CENTER.x;
  const dzp = z - ROUNDABOUT_CENTER.z;
  const plazaFlat = smoothstep(PLAZA_RADIUS + 1, PLAZA_RADIUS + 14, Math.sqrt(dxp * dxp + dzp * dzp));
  const flat = Math.min(roadFlat, plazaFlat);

  // Mountain / forest band between the city and the coast.
  const mountainW = smoothstep(360, 470, x) * (1 - smoothstep(700, 790, x));
  const n = fbm2(x * 0.012, z * 0.012, 4);
  const ridges = Math.pow(n, 1.6) * 70 + 4;
  let h = mountainW * ridges * smoothstep(10, 90, adz);

  // Rolling hills far from the road everywhere, so the horizon is never flat.
  // Bengaluru sits on a flat plateau, so the hills only start beyond the city.
  h += smoothstep(90, 260, adz) * smoothstep(150, 320, x) * (fbm2(x * 0.006 + 40, z * 0.006, 3) * 60) * (dz > 0 ? 1 : 1 - smoothstep(650, 760, x));

  // Inland hills behind the coast.
  const coastW = smoothstep(720, 800, x);
  if (dz > 0) h += coastW * smoothstep(25, 110, dz) * (fbm2(x * 0.01, z * 0.01, 3) * 40 + 6);

  h *= flat;

  // Beach shelving into the sea on the seaward side of the coast.
  if (dz < 0) {
    const beachW = coastW;
    let beach: number;
    if (z > SHORE_Z) beach = lerp(SEA_LEVEL, -0.02, smoothstep(SHORE_Z, -45, z));
    else beach = SEA_LEVEL - Math.min(6, (SHORE_Z - z) * 0.09);
    beach += (fbm2(x * 0.05, z * 0.05, 2) - 0.5) * 0.12;
    h = lerp(h, beach, beachW * smoothstep(9, 13, adz));
  }

  // Lighthouse headland beyond the roundabout.
  const hx = x - 1010;
  const hz = z + 66;
  const head = Math.exp(-(hx * hx + hz * hz) / 520) * 9;
  h = Math.max(h, head - 1.5);

  return h;
}

/** Height at which a person's feet rest. */
export function groundHeight(x: number, z: number) {
  const h = terrainHeight(x, z);
  return h < 0 ? h + 0.02 : h + 0.06;
}
