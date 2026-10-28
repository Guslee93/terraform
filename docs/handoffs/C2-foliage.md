# C2 — Leaf-cluster tree foliage (Codex work order)

Role: implementer (3D scene). Project: Terraform v1, an architectural portfolio prototype. Read `AGENTS.md`, `docs/decisions/ADR-0005-scene-look.md` §5a, then `src/scene/Trees.tsx` and `src/scene/treeVariants.ts` (current trees: a few merged icosahedron balls per canopy — they read as generic 3D props).

## Goal

Trees like the Hektar reference: each canopy a loose, irregular cluster of many small low-poly leaf clumps with gaps between them, several greens inside one tree, a few visible branches. Light and airy, not round balls. Still deterministic and cheap (instanced).

## You own (only these files)

- `src/scene/foliage.ts` + `src/scene/foliage.test.ts` (new)
- `src/scene/Trees.tsx`, `src/scene/treeVariants.ts`, `src/scene/treeVariants.test.ts`

## Do not touch

Everything else, in particular `src/scene/ViewportCanvas.tsx`, `SceneComposer.tsx`, `siteGeometry.ts`, `MassLayer.tsx` (Claude is regrading lighting in those right now), `src/features/**`, `public/**`, `package.json`. No new dependencies. Do not commit.

## Spec

### `foliage.ts` (pure geometry, no React)

- Seeded PRNG (`mulberry32` style), so geometry is identical for a given seed.
- `export const FOLIAGE_VARIANTS = 6`
- `export function createCanopyGeometry(shape: TreeShape, seed: number): BufferGeometry`
  - 18–28 clumps. Each clump: `IcosahedronGeometry(r, 0)` with r in 0.28–0.55 (canopy-radius units), every vertex jittered ±18 % of r so no two clumps are regular, randomly rotated.
  - Clump centres scattered inside an ellipsoid: `round` radii (1.0, 0.8, 1.0); `tall` radii (0.65, 1.45, 0.65). Bias outward (e.g. radius = cbrt(u)^0.6) so the silhouette is lumpy with visible gaps, not a solid sphere.
  - Flat shading: non-indexed geometry, `computeVertexNormals()` after merging.
  - Per-face vertex colours (`color` attribute, linear values): pick one of 4 greens per clump — `#A9CBA0`, `#8FBB8A`, `#C3DAB5`, `#7FAE7E` — then ±6 % lightness jitter per face.
  - Origin at the canopy centre; units are canopy radii (the caller scales).
- `export function createBranchGeometry(shape: TreeShape, seed: number): BufferGeometry`
  - A trunk from y = 0 to 1 (unit height, caller scales) plus 2–3 thinner tapered branches that leave the upper third of the trunk at 25–45° and stop inside the canopy. 5-sided cylinders, merged, no colour attribute.
- Use `mergeGeometries` from `three/examples/jsm/utils/BufferGeometryUtils.js`; dispose the parts.

### `treeVariants.ts`

- Add `variant: number` (0 … `FOLIAGE_VARIANTS - 1`) to `TreeVariant`, from the same position hash with a new salt. Keep the existing fields; you may narrow `TREE_TINTS` to lighter, near-white multipliers (instance colour now *multiplies* the vertex colours), e.g. `#FFFFFF`, `#F2F7EE`, `#FAFFF5`, `#EAF2E6`.

### `Trees.tsx`

- Build `FOLIAGE_VARIANTS` canopy and branch geometries per shape once (`useMemo`), dispose on unmount.
- Group trees by `(shape, variant)` → one `instancedMesh` per group for canopies and one per group for branches (≤ 24 meshes total). Keep per-tree position on the terrain, rotation and scale as today.
- Canopy material: `meshStandardMaterial` with `vertexColors`, `flatShading`, `roughness 0.9`, `transparent`, `opacity 0.9`, `depthWrite` true. Branch colour `#A39A8C`.
- Canopies cast and receive shadows; branches cast.
- Keep the `Trees({ sitePackage })` export and props unchanged (ViewportCanvas imports it).

## Tests (`foliage.test.ts`, extend `treeVariants.test.ts`)

- Same `(shape, seed)` → identical position arrays; different seeds → different.
- Every canopy vertex lies inside the ellipsoid radii + max clump radius (+ jitter).
- `color` attribute exists, length matches positions, all components within 0…1, at least 3 distinct colours per canopy.
- Canopy vertex count < 2500; branch geometry bounding box y within [0, 1.6].
- `variant` is deterministic and within range, and varies across a row of 40 trees.

## Done when

- `npm run lint && npm run test && npm run build` pass.
- Short report: files changed, vertex counts per canopy, anything you could not do. Log a row in `docs/agent-log.md` (status "Pending Claude review") and a short entry in `progress.md`.
