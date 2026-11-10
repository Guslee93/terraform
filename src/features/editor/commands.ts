import { translateRing } from '../../lib/polygon'
import { tierTop } from '../massing/aggregate'
import {
  EMPTY_SELECTION,
  type MassTier,
  type MassVolume,
  type ScenarioDocument,
} from '../massing/types'
import type { MassingCommand } from './history'

/**
 * Command factories (ADR-0004 §3). Each returns a pure document transform; `execute`
 * validates the result. Unknown ids and edits to locked masses throw so history is
 * never touched.
 */

/** Tolerance for "this tier sits on that tier's top", in metres. */
const STACK_EPSILON_M = 1e-6
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

function assertUnlocked(volume: MassVolume): void {
  if (volume.locked) throw new Error(`Mass is locked: ${volume.name}`)
}

/** Like mapVolume, but refuses geometry edits to a locked mass. */
function mapUnlockedVolume(
  document: ScenarioDocument,
  volumeId: string,
  transform: (volume: MassVolume) => MassVolume,
): ScenarioDocument {
  return mapVolume(document, volumeId, (volume) => {
    assertUnlocked(volume)
    return transform(volume)
  })
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
      assertUnlocked(requireVolume(document, volumeId))
      return { ...document, volumes: document.volumes.filter((volume) => volume.id !== volumeId) }
    },
    selectionAfter: EMPTY_SELECTION,
  }
}

export function moveVolume(volumeId: string, east: number, north: number): MassingCommand {
  return {
    label: 'Move mass',
    apply: (document) =>
      mapUnlockedVolume(document, volumeId, (volume) =>
        mapTiers(volume, (tier) => ({
          ...tier,
          footprint: { vertices: translateRing(tier.footprint.vertices, east, north) },
        })),
      ),
  }
}

/**
 * Edits one tier. Tiers stacked at or above its old top move with it, so upper tiers stay
 * attached when a lower tier gains storeys or changes base elevation.
 */
export function updateTier(volumeId: string, tierId: string, patch: TierPatch): MassingCommand {
  return {
    label: 'Edit tier',
    apply: (document) =>
      mapUnlockedVolume(document, volumeId, (volume) => {
        const target = volume.tiers.find((tier) => tier.id === tierId)
        if (!target) throw new Error(`Unknown tier: ${tierId}`)
        const updated = { ...target, ...patch }
        const oldTop = tierTop(target)
        const delta = tierTop(updated) - oldTop
        return mapTiers(volume, (tier) => {
          if (tier.id === tierId) return updated
          if (delta !== 0 && tier.baseElevation >= oldTop - STACK_EPSILON_M) {
            return { ...tier, baseElevation: tier.baseElevation + delta }
          }
          return tier
        })
      }),
  }
}
