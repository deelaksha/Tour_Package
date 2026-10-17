# Implementation notes

## Architecture in one paragraph

A single paused GSAP **master timeline** (`lib/animation/createJourneyTimeline.ts`)
animates a plain object of channels — bus arc-length, door, headlights, camera
shot index, time-of-day index, party intensity — and one **ScrollTrigger**
scrubs it across a tall `#journey` section whose stage is `position: sticky`.
The R3F scene never re-renders from scroll: every component reads the channels
in `useFrame` and writes to existing Three.js objects through refs. React only
re-renders when the active story scene changes (`subscribeScene`), which swaps
the overlay copy. Characters are not tweened at all: each traveler has a
deterministic, timed **state machine** evaluated at the timeline's playhead, so
scrubbing backwards or jumping anywhere reproduces the exact frame.

## Files that matter

| Area | File |
| --- | --- |
| Scene timing, copy | `lib/config/journeyScenes.ts` (`T` = every story beat in "story seconds") |
| Route, bus anchors | `lib/config/route.ts` — one centreline, one bus path (out → roundabout → back) |
| Ground height | `lib/three/terrain.ts` — shared by terrain mesh, trees, feet, camera clamp |
| Camera shots | `lib/config/cameraPoses.ts` (typed, named, world- or bus-relative) |
| Camera blending | `lib/animation/cameraChoreography.ts`, `components/experience/JourneyCamera.tsx` |
| Time of day | `lib/config/atmosphere.ts`, `components/experience/SceneAtmosphere.tsx` |
| Master timeline | `lib/animation/createJourneyTimeline.ts`, `components/experience/JourneyController.ts` |
| Character FSM | `lib/animation/choreography.ts` (scripts) + `lib/animation/characterStates.ts` (poses) |
| Character rig | `lib/three/characterRig.ts`, `components/experience/TravelerGroup.tsx` |
| Bus | `components/experience/TourBus.tsx` (exposes a typed `BusRig`) |
| Worlds | `components/experience/world/*` |
| Shaders | `lib/three/shaders.ts` (sky, stars, ocean, towers, beams, glow pools, flame, particles) |
| UI | `components/interface/*`, `components/sections/*` |

## Story beats (story seconds)

| t | Beat |
| --- | --- |
| 0 | Opening: intro crane + bus drive-in (plays once on load, independent of scroll) |
| 6–13 | Travelers walk from the forecourt to a queue; door opens at 12 |
| 13.3–22.3 | Boarding at a fixed 1.6 s cadence; door closes 22.8 |
| 23.6–57 | Headlights, departure, city → highway → Ghats → coast (single eased drive) |
| 57–61 | Brake at the coastal roundabout, door opens, travelers step down |
| 61–72 | Exploration: look out to sea, sit on the sand, photograph, wander |
| 72–84 | Sunset → night; walk to the bonfire; three dance styles per traveler |
| 84–97 | Return to the bus by arrival time, board, door closes 96.8 |
| 97.6–111.5 | Return drive (around the roundabout, back down the same road) |
| 111.5–122 | Home: door opens, travelers step off and wave; final CTA |

`npm test` asserts the scripts fit these beats (no overlapping actions,
boarding completes before doors close, nobody exits before the door opens,
no NaNs anywhere on the timeline).

## Characters

`characterStates.ts` defines a pose as an 18-float vector (root offsets, spine,
head, shoulders, elbows, hips, knees). States: idle, chat, walk, board, exit,
ride, look, photo, sit, celebrate, dance (4 styles), wave. Walk stride phase is
driven by distance travelled, so feet don't slide at any scroll speed. Adjacent
states cross-fade over 0.35 s and headings blend so turns are visible.

The rig's joint hierarchy matches a standard humanoid skeleton. Swapping in a
rigged GLB means mapping the same joint angles onto its bones in
`applyPose()`; the state machine and choreography do not change.

## Bus

Extruded side profile with real wheel-arch cut-outs, separate glass band and
wraparound windshield, graphite skirt and roof pod, LED belt line, livery and
destination board (canvas textures), mirrors, wheel wells, seat rows visible
through tinted glass, a two-leaf plug door with a deploying step, headlight
spot lights with additive beam cones and a road light pool, tail lights. Wheel
rotation is `s / r` from the same arc length that places the bus, so they can't
drift. Body pitch and roll come from acceleration and yaw rate.

## Performance decisions

- All repeated scenery is instanced: towers, avenue trees, broadleaf forest,
  silver oaks, palms, rocks, lamps, light pools, guardrail posts, road studs,
  festoon bulbs.
- Only a handful of dynamic lights (sun/moon, hemisphere, two headlight spots,
  three party point lights). Streetlight glow is additive decals.
- One shadow-casting directional light (1024² map) whose 80 m frustum follows
  the camera target; shadows are disabled on the low preset.
- `?quality=low` (auto on ≤820 px screens or ≤4 cores/4 GB): coarser terrain and
  ocean, fewer instances, no post-processing, no shadows, lower DPR cap.
- `PerformanceMonitor` lowers DPR when the frame rate drops.
- The canvas frameloop is set to `never` while the journey section is off-screen.
- HUD/progress values are written to DOM nodes on the GSAP ticker, not via React state.

## Art direction

Karnataka nature: Bengaluru as the Garden City (flowering avenue trees —
rain tree, gulmohar, jacaranda, tabebuia), the Western Ghats as misty
evergreen forest with silver oaks and a waterfall, and a golden-hour coast.
The palette is deep forest green with sun gold, leaf green and sunset accents
(`app/globals.css` tokens). Every time-of-day preset in
`lib/config/atmosphere.ts` keeps the sky and ground clearly lit, including
the moonlit nights, so no scene reads as a black screen.

## Camera

Shots blend around their subject (angle, radius and height interpolated
separately), so a move between two shots never passes over or through the
action. Props that come between the camera and its subject, or right up to
the lens, dissolve with a screen-space dither (`lib/three/occlusionFade.ts`);
the ground, road, bus and travelers are never faded.

## Accessibility and fallbacks

- `prefers-reduced-motion`: the 3D world still renders, but it only moves as
  the visitor scrolls — no intro reveal, no pointer parallax or handheld
  drift, no scroll smoothing, and no CSS transitions.
- A lost WebGL context remounts the canvas (up to two times).
- No WebGL at all: the same chapters and CTAs, each over a still rendered
  from the 3D scene (`public/stills/`, made by `npm run capture:stills`).
- Inactive overlay blocks are `inert` so hidden buttons can't take focus.
- Native `<dialog>` for the trip finder (focus trap and Escape for free),
  keyboard-operable chapter rail, skip link past the animation, visible focus rings.
- No audio.

## Known limitations

- Characters are procedural (capsules and spheres), articulated and animated,
  but not production-quality humans. No facial animation, no IK foot planting.
- The bus is detailed procedural geometry, not a sculpted model.
- Browser verification here ran in headless Chrome with SwiftShader (software
  WebGL, ≈2 fps); real-GPU frame rate has not been measured.
- Lenis is not used; ScrollTrigger's `scrub: 1.1` provides the smoothing.
- The stills in `public/stills/` must be re-captured after visual changes.
