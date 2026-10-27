import type { Vec2 } from '../../lib/coordinates'
import { ringCentroid, rotateRing, translateRing } from '../../lib/polygon'
import { createId } from '../massing/factories'
import {
  EMPTY_SELECTION,
  type MassTier,
  type MassVolume,
  type ScenarioDocument,
} from '../massing/types'
import type { MassingCommand } from './history'

/**
 * Command factories (ADR-0004 §3). Each returns a pure document transform; `execute`
 * validates the result. Unknown ids throw so history is never touched.
 */

type VolumePatch = Partial<Pick<MassVolume, 'name' | 'visible' | 'locked'>>
type TierPatch = Partial<Omit<MassTier, 'id'>>

function requireVolume(document: ScenarioDocument, volumeId: string): MassVolume {
  const volume = document.volumes.find((candidate) => candidate.id === volumeId)
  if (!volume) throw new Error(`Unknown volume: ${volumeId}`)
  return volume
}

function mapVolume(
  document: ScenarioDocument,
  volumeId: string,
  transform: (volume: MassVolume) => MassVolume,
): ScenarioDocument {
  requireVolume(document, volumeId)
  return {
    ...document,
    volumes: document.volumes.map((volume) => (volume.id === volumeId ? transform(volume) : volume)),
  }
}

function mapTiers(volume: MassVolume, transform: (tier: MassTier) => MassTier): MassVolume {
  return { ...volume, tiers: volume.tiers.map(transform) }
}

export function addVolume(volume: MassVolume): MassingCommand {
  return {
    label: `Add ${volume.name}`,
    apply: (document) => ({ ...document, volumes: [...document.volumes, volume] }),
    selectionAfter: { volumeId: volume.id, tierId: volume.tiers[0]?.id ?? null },
  }
}

export function removeVolume(volumeId: string): MassingCommand {
  return {
    label: 'Delete mass',
    apply: (document) => {
      requireVolume(document, volumeId)
      return { ...document, volumes: document.volumes.filter((volume) => volume.id !== volumeId) }
    },
    selectionAfter: EMPTY_SELECTION,
  }
}

export function duplicateVolume(
  volumeId: string,
  { id = createId('volume'), offset = [0, 0] }: { id?: string; offset?: Vec2 } = {},
): MassingCommand {
  // Tier ids derive from the copy id so selectionAfter is known before apply runs.
  const tierId = (index: number) => `${id}-tier-${index}`
  return {
    label: 'Duplicate mass',
    apply: (document) => {
      const source = requireVolume(document, volumeId)
      const copy: MassVolume = {
        ...source,
        id,
        name: `${source.name} copy`,
        tiers: source.tiers.map((tier, index) => ({
          ...tier,
          id: tierId(index),
          footprint: { vertices: translateRing(tier.footprint.vertices, offset[0], offset[1]) },
        })),
      }
      return { ...document, volumes: [...document.volumes, copy] }
    },
    selectionAfter: { volumeId: id, tierId: tierId(0) },
  }
}

export function moveVolume(volumeId: string, east: number, north: number): MassingCommand {
  return {
    label: 'Move mass',
    apply: (document) =>
      mapVolume(document, volumeId, (volume) =>
        mapTiers(volume, (tier) => ({
          ...tier,
          footprint: { vertices: translateRing(tier.footprint.vertices, east, north) },
        })),
      ),
  }
}

/** Rotates all tiers about one pivot (default: base tier centroid) so stacks stay aligned. */
export function rotateVolume(volumeId: string, radians: number, pivot?: Vec2): MassingCommand {
  return {
    label: 'Rotate mass',
    apply: (document) =>
      mapVolume(document, volumeId, (volume) => {
        const origin = pivot ?? ringCentroid(volume.tiers[0]?.footprint.vertices ?? [])
        return mapTiers(volume, (tier) => ({
          ...tier,
          footprint: { vertices: rotateRing(tier.footprint.vertices, radians, origin) },
        }))
      }),
  }
}

export function updateVolume(volumeId: string, patch: VolumePatch): MassingCommand {
  return {
    label: 'Edit mass',
    apply: (document) => mapVolume(document, volumeId, (volume) => ({ ...volume, ...patch })),
  }
}

export function addTier(volumeId: string, tier: MassTier): MassingCommand {
  return {
    label: 'Add tier',
    apply: (document) =>
      mapVolume(document, volumeId, (volume) => ({ ...volume, tiers: [...volume.tiers, tier] })),
    selectionAfter: { volumeId, tierId: tier.id },
  }
}

export function updateTier(volumeId: string, tierId: string, patch: TierPatch): MassingCommand {
  return {
    label: 'Edit tier',
    apply: (document) =>
      mapVolume(document, volumeId, (volume) => {
        if (!volume.tiers.some((tier) => tier.id === tierId)) {
          throw new Error(`Unknown tier: ${tierId}`)
        }
        return mapTiers(volume, (tier) => (tier.id === tierId ? { ...tier, ...patch } : tier))
      }),
  }
}

export function removeTier(volumeId: string, tierId: string): MassingCommand {
  return {
    label: 'Delete tier',
    apply: (document) =>
      mapVolume(document, volumeId, (volume) => {
        if (!volume.tiers.some((tier) => tier.id === tierId)) {
          throw new Error(`Unknown tier: ${tierId}`)
        }
        return { ...volume, tiers: volume.tiers.filter((tier) => tier.id !== tierId) }
      }),
    selectionAfter: { volumeId, tierId: null },
  }
}
