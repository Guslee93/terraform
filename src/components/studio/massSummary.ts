import { referenceElevation, type EnvelopeSite, type HeightReference } from '../../features/analysis/constraints'
import { tierTop } from '../../features/massing/aggregate'
import { floorLevels } from '../../features/massing/metrics'
import type { MassVolume } from '../../features/massing/types'

/**
 * Height and floor count for one mass, as every surface shows them (ADR-0010 §4): the highest
 * tier top above the envelope reference (grade or datum, ADR-0008) and the number of floor
 * levels (ADR-0007). Works for hidden masses too, which the envelope does not evaluate.
 */
export function massSummary(volume: MassVolume, site: EnvelopeSite, reference: HeightReference) {
  const top = Math.max(...volume.tiers.map((tier) => tierTop(tier)))
  return {
    heightM: top - referenceElevation(volume, site, reference),
    floors: floorLevels(volume.tiers).length,
  }
}
