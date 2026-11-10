# Fogarena of Time

A playable atmospheric rendering experiment. A round little fantasy swordsman with blond hair, fair peach skin, a long green cap, blinking eyes, a scarf, and rounded boots explores a moonlit forest arena while procedural volumetric mist drifts through the ruined gateway. Everything in the world is generated in code; no fog sprites, downloaded models, or static fog images are used.

## Run locally

Requires Node.js **20.19+ or 22.12+**, npm, and a modern desktop browser with WebGL 2, hardware acceleration and `EXT_color_buffer_float`.

```bash
npm ci
npm run dev
```

Run the commands from the repository root, then open the local URL printed by Vite, usually **http://localhost:5173**.

```bash
npm run build       # TypeScript checks and production build
npm run preview     # Serve dist/ locally
npm test            # Deterministic controller / rendering-state tests
npm run test:browser # Browser acceptance test; requires dev server on port 5173
```

The browser test uses `/usr/bin/google-chrome` by default. Set `CHROME_PATH` for another Chrome/Chromium executable. It uses SwiftShader for reproducibility, so its FPS does **not** represent hardware GPU performance. Screenshots and its report are written to `artifacts/`.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move relative to camera |
| Space / HUD sword button | Swing sword and summon a whirlwind |
| Drag mouse over world | Rotate camera |
| Escape | Pause / resume / close settings |

Select **Play · Enter the mist** to start. Pause exposes **Resume**, **Settings**, and **Restart**. The settings icon is always available. The world stays animated behind menus; movement stops. Switching tabs or losing focus pauses play. Restart resets the player, camera, animation clock, and smoke disturbances.

Eight pastel mist balloons bob around the arena. Move within sword reach and swing to pop one: it releases an expanding, noisy volumetric fog cloud, with a few falling scraps. The new fog drifts with wind, gets caught by whirlwinds, and dissipates over nine seconds. Balloons reinflate after ten seconds; the HUD counts pops, and Restart resets them. Only the cutting part of the blade swing can hit balloons.

The adventure HUD uses jewel hearts, a live sword recovery ring, and a north-up arena map. The arrow tracks player position and facing; the compass caption follows the camera heading, and a wind-spirit count shows active whirlwinds. Hearts are a visual vitality motif for this exploration prototype; combat damage is not implemented.

All in-game text is English. Graphics controls persist locally when browser storage is available. Optional Google Fonts enhance the typography; offline use falls back to local Georgia and sans-serif fonts. Gameplay and rendering need no external service.

## Rendering

1. Three.js renders the scene in linear HDR color with a full-resolution depth texture and moonlight shadow map.
2. A separate GPU pass reconstructs world-space camera rays and raymarches only to the nearest surface (maximum 85 world units). Front-to-back Beer–Lambert integration accumulates in-scattering and transmittance, with early termination in opaque fog.
3. A seeded 64³ scalar noise lattice is generated at startup and sampled with GPU trilinear interpolation and cubic coordinate smoothing. Procedural 3D value noise is combined into adjustable fBM. Low-frequency domain warping, wind advection, upward drift and twisted wisps create animated banks at multiple scales. An exponential height profile adds dense ground mist.
4. Henyey–Greenstein anisotropic scattering, three low-frequency secondary density samples for volumetric self-shadowing, procedural canopy gaps, and local portal illumination shape the light inside the medium. Surface shadows use a separate shadow map.
Sword animation blends anticipation, a fast diagonal cut, follow-through and recovery with quaternion interpolation over the walking pose. A short fading geometry ribbon follows the cutting edge, and the smaller leaf-shaped blade stays anchored to the hand.

5. A ring buffer of eight world-space impulses records the sword tip and footsteps. Expanding advected cavities push fog aside; noisy shells curl upward and dissipate over three seconds. This is an analytic procedural simulation, not a fluid solver.
Each swing also launches one 4.8-second whirlwind in the facing direction. Eight GPU vortex slots backtrace the existing density through rotating updrafts, clear the core, and gather fog into frayed helical sheets; wind bends their crowns as they grow, widen and break into wisps. A rolling skirt gathers the ground mist. Footstep wakes are softer than sword wakes.
6. Near-biased ray steps and interleaved gradient jitter keep nearby curls legible; active whirlwinds receive 16 extra steps (capped at 96). Samples are accumulated across ping-pong history buffers. Previous camera matrices reproject surface positions; depth disagreement rejects disoccluded samples. Neighborhood clamping and lower history weight during a swing reduce trails. History resets on resize and setting changes.
7. Four-tap joint bilateral upsampling uses scene depth to preserve silhouettes. Linear scene radiance is attenuated by fog transmittance and combined with integrated scattering, then filmic compression, gamma encoding, vignette and fine grain finish the image.

### Settings and scaling

Live controls: Fog Density, Wind Speed, Turbulence, Light Scattering, Fog Height, Smoke Detail, Render Quality. Presets: **Light Mist**, **Dense Fog**, **Cinematic**, **Maximum Fog**.

| Quality | Volumetric resolution (each axis) | Ray steps |
| --- | --- | --- |
| Performance | 35% | 32 |
| Balanced | 50% | 48 |
| High | 65% | 64 |
| Ultra | 85% | 88 |

The default Cinematic preset uses High. Low-core/mobile-class systems initially select Performance when there are no saved settings. Static scenery is merged by material to reduce draw calls, and grass is instanced. Pixel ratio is capped at 1.5. Reduce Render Quality first if rendering is slow, then Smoke Detail. FPS is shown in the footer. A capable desktop GPU is the target; 60 FPS is a goal, not a benchmark claim.

## Project map

- `src/main.ts` — initialization, input, lifecycle and render loop
- `src/game/scene.ts` — terrain, trees, stones, ruins and collisions
- `src/game/player.ts` — green humanoid, movement and body animation
- `src/game/sword.ts` — attack arc and sword-tip impulses
- `src/game/camera.ts` — smooth third-person follow and orbit
- `src/game/balloons.ts` — floating targets, swept blade collision, fog releases and reusable fragments
- `src/game/smoke.ts` — world-space smoke impulse buffer
- `src/game/lighting.ts` — moonlight and surface lighting
- `src/game/settings.ts` — presets, quality and persistence
- `src/rendering/noise.ts` — procedural GLSL noise
- `src/rendering/fog.ts` — raymarch, temporal, depth and composite passes
- `src/ui/interface.ts`, `src/style.css` — menus and live controls

## Known limitations

This is a small rendering prototype with no enemies or combat damage. Terrain and trees deliberately use simple geometry. Smoke motion approximates curl-like flow through a domain-warped density field; it does not solve Navier–Stokes. Volumetric shadows approximate fog self-occlusion and canopy shafts, rather than sampling the geometry shadow map per step. Temporal reprojection uses the nearest surface as a proxy for the volume; moving silhouettes may show minor trails at low quality. Shadows are limited to a region around the player. There is no gamepad or touch movement interface. WebGL context loss displays a reload message.

Three.js render-target/depth-texture reference: https://threejs.org/manual/pages/rendertargets.html
