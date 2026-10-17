# Assets

No external 3D models, textures, HDR environments or audio are used. Every
visual asset is generated at runtime from code in this repository:

| Asset | Source |
| --- | --- |
| Tour bus | `components/experience/TourBus.tsx` — extruded shapes + primitives |
| Travelers | `lib/three/characterRig.ts` — articulated capsule/sphere rig, 6 looks in `lib/config/travelers.ts` |
| Terrain | `lib/three/terrain.ts` height function → `world/Terrain.tsx` vertex-coloured mesh |
| City towers | Instanced boxes + window/crown shader (`createTowerMaterial`) |
| Broadleaf, flowering and silver oak trees, palms, rocks | `lib/three/vegetation.ts` merged, vertex-coloured geometry, instanced |
| Waterfall | `world/Waterfall.tsx` displaced rock cliff + `createWaterfallMaterial` |
| Fallback stills | `public/stills/*.jpg`, rendered from this project's own 3D scene by `scripts/capture-stills.mjs` |
| Ocean | Displaced plane + `createOceanMaterial` (waves, fresnel, sun glitter, foam) |
| Sky, stars, moon/sun | `createSkyMaterial`, `createStarsMaterial` |
| Road surface, signs, livery | Canvas-2D textures in `lib/three/textures.ts` |
| Reflections | drei `<Environment>` rendered from `<Lightformer>`s (no HDR file) |
| Film grain | Inline SVG `feTurbulence` in CSS |

## Fonts

Self-hosted via npm, no network requests at runtime:

- Space Grotesk (variable) — `@fontsource-variable/space-grotesk`, SIL Open Font License 1.1
- JetBrains Mono (variable) — `@fontsource-variable/jetbrains-mono`, SIL Open Font License 1.1

## Replacing procedural assets later

- **Characters**: load a rigged GLB per traveler and map the pose vector in
  `applyPose()` onto its bones (or drive matching AnimationMixer clips per
  `CharacterState`). The choreography and timeline stay as they are.
- **Bus**: any model works if it exposes the parts listed in `BusRig`
  (body, wheels, door leaves, step, headlight material/lights).
