# M5 performance baseline (D39)

- **Date:** 2026-02-11
- **Agent:** QA (DeepSeek work order D39), branch `deepseek/d39`
- **Purpose:** the "before" picture for M5, recorded on the current code so later polish changes can be compared against it.
- **Source spec:** `docs/plans/M5-plan.md` item D39; `docs/handoffs/D39-D40-m5-perf-a11y.md`.

## Environment

| Item | Value |
|---|---|
| Machine | Apple MacBook Pro 14" (Apple M1 Pro) |
| OS | macOS 15.7.3 (build 24G419) |
| Browser | Chromium 156.0.8078.4 via Playwright 1.64.1 |
| Node / npm | v22.23.1 / 10.9.8 |
| WebGL backend (headed and headless runs) | `ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro)` from `WEBGL_debug_renderer_info` |
| Commit | `c1ef9e9` (`deepseek/d39`), working tree before M5 polish |

All numbers below are measured on this machine and this browser only. Viewport frames
were counted with `requestAnimationFrame` for 4 s after a 3 s settle; load timings are
median of five fresh-context (cold HTTP cache) runs on the production build.

## 1. Bundle report

Command: `npm run build` (`npm run typecheck && vite build`), Vite 8.3.5, 981 modules.

| Chunk | Raw | Gzip | Loaded by |
|---|---|---|---|
| `index.html` | 0.67 kB | 0.40 kB | every route |
| `index-ua30Pshv.css` | 52.44 kB | 10.61 kB | every route |
| `index-DqbRP0Om.js` (router, landing, about) | 290.80 kB | 91.39 kB | landing & about (and the base of studio) |
| `StudioPage-D1UESEyC.js` (studio incl. Dexie, lazy) | **347.19 kB** | **110.86 kB** | studio only |
| `SceneComposer-D0aqddG4.js` (lazy) | 214.53 kB | 96.00 kB | studio only |
| `three-vendor-CPUUF886.js` (three.js + R3F, lazy) | **918.58 kB** | **244.08 kB** | studio only |
| Geist / Geist Mono woff2 (12 files) | 5.81–29.40 kB each | – | per font face, as used |

- The studio chunk matches the handoff's expectation: ≈ 347 kB raw / ≈ 111 kB gzip (it carries Dexie since M4).
- `three-vendor` exceeds Vite's 500 kB minified warning threshold (918.58 kB raw) — that warning was emitted by the build.
## 2. Frame rate

Commands:

```bash
node scripts/measure-fps.mjs                     # existing probe, headless, 1440x900
node scripts/measure-fps-headed.mjs              # headed (headline), 1440x900
node scripts/measure-fps-headed.mjs --viewport=1920x1080
node scripts/measure-fps-masses.mjs              # headed, 3 drawn masses, 1440x900
```

Method in all four: `requestAnimationFrame` frame count for 4 s after a 3 s settle, on
`/studio/<site>` at the given container size and `deviceScaleFactor`.

### 1440×900, both sites (scene-look camera)

| Probe | Site | dpr 1 | dpr 2 | Renderer |
|---|---|---|---|---|
| `measure-fps.mjs` (headless) | compact-infill | 60.0 | 60.0 | ANGLE Metal, but capped (below) |
| `measure-fps.mjs` (headless) | sloped-edge | 60.0 | 60.0 | same |
| `measure-fps-headed.mjs` (**headline**) | compact-infill | **69.3** | **92.3** | ANGLE Metal, Apple M1 Pro |
| `measure-fps-headed.mjs` (**headline**) | sloped-edge | **120.3** | **97.5** | ANGLE Metal, Apple M1 Pro |

Headless numbers are pinned at exactly 60.0 fps because headless Chromium drives
`requestAnimationFrame` from a virtual 60 Hz begin-frame clock; the GL renderer is the
same Metal backend, but the headless cadence is not representative of the display, so
per the work order the headed runs are the headline numbers. Headed rAF is uncapped
(120 Hz display), which is why the values range above 60.

### Three drawn masses (compact-infill), headed, 1440×900

Command: `node scripts/measure-fps-masses.mjs`. Masses are drawn as `e2e/massing.spec.ts`
does (Plan preset, `Draw building`, four ground clicks, Enter, then back to 3D); the run
verified all three masses existed in the inspector before measuring.

| Scene | dpr 1 | dpr 2 |
|---|---|---|
| 3 masses | 120.3 | 94.5 |

### 1920×1080, both sites, headed (plan's additional row)

Command: `node scripts/measure-fps-headed.mjs --viewport=1920x1080`

| Site | dpr 1 | dpr 2 |
|---|---|---|
| compact-infill | 120.0 | 67.5 |
| sloped-edge | 120.3 | 71.3 |

## 3. Load timings (production build, cold cache, 1440×900)

Command: `npm run build && node scripts/measure-load.mjs` (starts `vite preview` on
127.0.0.1:4173 from `dist/`). Each run is a fresh browser context with an empty HTTP
cache; the script counts resources fetched from the network to confirm the runs were
cold (every fetch reported `transferSize > 0`). Timings are from the Navigation Timing
and Paint Timing APIs via `page.evaluate`; "viewport" is time until the
`[aria-label="Studio viewport"]` section contains a canvas with a real box, and
"drawable" is time until the `Draw building` button is enabled.

### Landing (`/`)

| Run | DCL | load | FCP | first-paint | Files | Network B |
|---|---|---|---|---|---|---|
| 1 | 29 | 29 | 80 | 20 | 6/6 | 157,753 |
| 2 | 26 | 26 | 76 | 20 | 6/6 | 157,753 |
| 3 | 24 | 24 | 76 | 12 | 6/6 | 157,753 |
| 4 | 24 | 24 | 76 | 16 | 6/6 | 157,753 |
| 5 | 25 | 25 | 76 | 12 | 6/6 | 157,753 |
| **Median** | **25** | **25** | **76** | **16** | 6 | 157,753 |

### Studio (`/studio/compact-infill`)

| Run | DCL | load | FCP | first-paint | viewport | drawable | Files | Network B |
|---|---|---|---|---|---|---|---|---|
| 1 | 24 | 24 | 44 | 16 | 418 | 421 | 5/5 | 477,623 |
| 2 | 25 | 25 | 52 | 16 | 416 | 419 | 5/5 | 477,623 |
| 3 | 25 | 25 | 48 | 12 | 415 | 420 | 5/5 | 477,623 |
| 4 | 25 | 25 | 48 | 16 | 413 | 418 | 5/5 | 477,623 |
| 5 | 25 | 25 | 52 | 12 | 420 | 423 | 5/5 | 477,623 |
| **Median** | **25** | **25** | **48** | **16** | **416** | **420** | 5 | 477,623 |

All numbers in ms and measured from the navigation start of that page. The studio is
usable (3D viewport rendered, drawing enabled) ≈ 420 ms after commit on the preview
server of this machine.

## What stands out

- The studio's own chunk is right where the handoff said it would be (347.19 kB raw /
  110.86 kB gzip); the extra studio weight is `three-vendor` (918.58 kB raw, 244.08 kB
  gzip), which the landing page never downloads.
- Vite warns about the > 500 kB chunk; the largest contributors are vendor bundles that
  the studio route alone pays for.
- Frame rate clears the M5 target on this machine everywhere: worst headed row is
  67.5 fps (compact-infill, dpr 2, 1920×1080); the 1440×900 dpr-2 rows and the
  three-mass scene are all ≥ 92 fps.
- On the production build the studio goes from navigation commit to draw-ready in
  ~420 ms median; landing FCP is 76 ms.
- DCL/load are ~25 ms because the bundle is small on the wire; the gap to FCP (48 ms
  studio / 76 ms landing) is the client-side React render of the first paint.

## Known limitations

- Numbers are from one machine, one Chromium build; localhost transfer sizes are not
  representative of a real HTTPS deployment.
- The headless rows are capped by the virtual begin-frame clock and are not comparable
  with the headed rows; headed is the headline.
- Cold cache here is "fresh browser context on localhost" — no DNS, TLS or real-world
  network delay.