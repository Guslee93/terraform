# ADR-0004 — Massing domain model and command history

- **Status:** Accepted
- **Date:** 2026-10-27
- **Deciders:** Project owner, `engineering-software-architect`, `engineering-senior-developer`
- **PRD references:** §5.3, §6.1, §8.3, §8.4, §12.2

## Context

M2 needs editable conceptual massing that stays correct through repeated moves, resizes, storey changes, tier stacking and undo/redo. The model must be testable without React or Three.js, serialize for M4, and make the distinction between footprint, GFA, volume, coverage and height explicit.

## Decision

### 1. Immutable document model

```ts
type MassUse = 'residential' | 'commercial' | 'mixed' | 'civic' | 'other'

type Footprint = { vertices: readonly Vec2[] } // open ring, CCW, local ENU metres

type MassTier = {
  id: string
  name: string
  footprint: Footprint
  baseElevation: number   // metres relative to site origin
  storeys: number         // integer 1–40
  storeyHeight: number    // metres 2.2–6.0
  use: MassUse
}

type MassVolume = {
  id: string
  name: string
  visible: boolean
  locked: boolean
  tiers: readonly MassTier[]
}

type ScenarioDocument = {
  schemaVersion: 1
  id: string
  siteId: string
  name: string
  assumptions: {
    defaultStoreyHeight: number
    minStoreys: number
    maxStoreys: number
  }
  volumes: readonly MassVolume[]
}
```

- A volume is one building concept. A tier is a stacked volume with its own footprint, base and storey count.
- All arrays and objects are immutable; commands return new documents.
- Footprints are open rings in CCW order after `normalizeRing`. The closing vertex is not stored.
- All lengths are metres. No latitude/longitude and no Three.js types enter the domain.

### 2. Derived values and naming

Per tier:

- `height = storeys × storeyHeight`
- `top = baseElevation + height`
- `footprintArea = |shoelace|`
- `gfa = footprintArea × storeys`
- `volume = footprintArea × height`

Per volume:

- `gfa = Σ tier.gfa` — floors at different elevations are additive
- `volume = Σ tier.volume`
- `maxHeight = max(tier.top)`
- `groundFootprintArea = area(union of all tier footprints projected to ground)`
- `coverage = groundFootprintArea / studyAreaM2`


### 3. Commands and transactions

```ts
type MassingCommand = {
  label: string
  apply: (document: ScenarioDocument) => ScenarioDocument
  selectionAfter?: MassSelection
}
```

`MassingHistory` holds the current document, selection by id, undo and redo stacks. `execute` applies the command, validates the resulting document, then stores `{before, after, selectionBefore, selectionAfter}`. Invalid commands throw and leave the document untouched.

A pointer gesture uses:

```text
beginPreview(document, transform) -> { base, document }
cancelPreview(preview)            -> base       // zero history entries
commitPreview(history, preview)   -> history    // exactly one entry
```

Pointer movement may update a preview document; it must never call `history.execute`.

*Amendment (2026-10-27, implementation):* the preview API is `beginPreview(document)` + `updatePreview(preview, transform)`. Every update applies `transform` to the gesture's **base** document, not the previous preview, so repeated pointer moves cannot accumulate floating-point drift and `cancelPreview` returns the base by reference. `commitPreview` refuses a preview whose base is no longer the history's current document (stale gesture). Commands that return the same document reference record no entry. `Esc` cancels the preview. Pointer release commits once. History is bounded to 100 entries; the oldest entry is dropped first.

Selection is `{ volumeId: string | null; tierId: string | null }`, stored by id. Undo restores the selection captured before the command; redo restores the selection after it. Objects are never stored by reference.

### 4. Validation boundaries

Validation is renderer-free and returns structured issues:

- footprint: at least 3 and at most 200 vertices, finite, no duplicate consecutive points, simple ring, minimum area 4 m²
- tier: base elevation finite, storeys integer 1–40, storey height 2.2–6.0 m, known use
- volume: non-empty name, at least one tier, unique tier ids inside the volume
- document: schema version 1, non-empty site/id/name, unique volume and tier ids across the document, valid assumptions, every tier valid

Boundary/terrain clearance is a scenario-level check added with the site package context, not part of the document schema. A mass crossing the study boundary is a warning in M2, not an invalid document.

### 5. Serialization

The document is plain JSON with `schemaVersion: 1`. M4 owns persistence, migration and IndexedDB. M2 defines the shape and a pure `serializeScenario`/`parseScenarioDocument` pair so round-trip tests can start now without choosing a storage mechanism.

## Module boundaries

```text
src/lib/polygon.ts                 shared planar helpers (area, simple ring, normalize, point-in-polygon)
src/features/massing/types.ts      immutable model
src/features/massing/factories.ts  rectangle, polygon, tier, volume, scenario
src/features/massing/aggregate.ts  area, GFA, volume, max height, union, coverage
src/features/massing/validation.ts structured validation and errors
src/features/massing/serialize.ts  pure JSON round-trip
src/features/editor/commands.ts    add/remove/update/move/rotate/storeys/tier commands
src/features/editor/history.ts     execute, undo, redo, preview commit/cancel
```

No file in these modules imports React, Three.js, R3F, Zustand or Dexie.

## Consequences

- Snapshot-based history is simple and exact; memory grows with document size but is bounded to 100 entries and this document is small (concept massing).
- Immutable updates cost allocations but make undo/redo, tests and persistence predictable.
- Turf union is used only for ground-footprint aggregation; it is already a pinned dependency.
- M4 can serialize the same document and add migrations without rewriting the model.
- Gizmos and pointer tools remain a separate adapter layer; they cannot mutate the document directly.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Mutable classes with observers | Harder to test, accidental mutation during drag. |
| Store Three.js meshes in the document | Not serializable, duplicates geometry, breaks renderer-free rule. |
| Command-inverse functions instead of snapshots | Smaller memory but error-prone for multi-tier edits; snapshots are safer at this scale. |
| One flat mass with width/depth fields | Cannot represent L-shapes, rotation and stepped tiers cleanly. |
| Sum tier footprint areas for coverage | Double-counts upper tiers inside lower footprints. |
| Custom polygon boolean library | New dependency for one operation; Turf is already pinned. |

## Revisit triggers

Large documents where snapshots become expensive, collaborative editing, or a need for floor-level GFA with shared slabs that requires a richer floor model.

The union is computed with the existing Turf dependency in planar local metres. This avoids double-counting an upper tier that sits inside a lower footprint. The semantics are named explicitly: **footprint area**, **concept GFA**, **volume**, **coverage** and **max height**; none is presented as a legal floor-area definition.
