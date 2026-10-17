# Leeaprasad Travels

A scroll-driven 3D journey through Karnataka. Scrolling plays a short animated
film: six travelers meet at a Bengaluru terminal, board the bus, drive out of
the Garden City at dawn, cross the misty Western Ghats past a waterfall, reach
the coast at golden hour, explore the beach, share a bonfire night, and ride
home under the moon to arrive in Bengaluru at sunrise.

Everything in the 3D world is generated in code (no model, texture or HDR
files). The company name lives in one place: `lib/config/brand.ts`.

## Requirements

- Node.js 18.18+ (tested on 18.19.1; Next 15.5 is used because Next 16 needs Node 20)
- npm 9+

## Run

```bash
npm install
npm run dev                      # http://localhost:3000
```

Production:

```bash
npm run build && npm start       # http://localhost:3000
```

To build while `npm run dev` is running, use a separate output folder:

```bash
NEXT_DIST_DIR=.next-prod npm run build
NEXT_DIST_DIR=.next-prod npx next start -p 3100
```

`?quality=low` or `?quality=high` forces a rendering preset.

## Checks

```bash
npm run typecheck                # strict TypeScript
npm run lint                     # ESLint
npm test                         # choreography timing checks
npm run verify:browser -- http://localhost:3000   # headless Chrome, screenshots in ./verify-output
npm run capture:stills -- http://localhost:3000   # re-render public/stills/*.jpg for the no-WebGL page
```

The browser scripts use the local Google Chrome with software WebGL
(SwiftShader). They check behaviour and composition, not frame rate.

## Project layout

| Folder | What lives there |
| --- | --- |
| `app/` | Route, layout, global styles and palette tokens |
| `components/experience/` | Canvas, camera, lighting, bus, travelers |
| `components/experience/world/` | City, road, highway, Ghats forest, waterfall, coast, beach night |
| `components/interface/` | Navigation, HUD, chapter rail, scene text, trip finder, loader |
| `components/sections/` | Page sections below the journey and the no-WebGL story |
| `lib/config/` | Brand, story timing and copy, route, camera shots, time of day, tours |
| `lib/animation/` | Master timeline, character state machines, camera blending |
| `lib/three/` | Shaders, terrain, vegetation, procedural textures, occluder fade |
| `scripts/` | Browser verification and stills capture |
| `public/stills/` | Rendered scene stills used when WebGL is unavailable |

See `docs/IMPLEMENTATION.md` for architecture and `docs/ASSETS.md` for asset notes.
