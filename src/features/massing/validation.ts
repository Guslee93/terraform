import { isSimpleRing, polygonArea } from '../../lib/polygon'
import {
  MAX_STOREYS,
  MAX_STOREY_HEIGHT,
  MIN_FOOTPRINT_AREA,
  MIN_STOREYS,
  MIN_STOREY_HEIGHT,
  MAX_NOTES_LENGTH,
  SCENARIO_SCHEMA_VERSION,
  type MassTier,
  type MassUse,
  type MassVolume,
  type ScenarioAssumptions,
  type ScenarioDocument,
} from './types'

export type ValidationIssue = {
  readonly path: string
  readonly message: string
}

export class MassingValidationError extends Error {
  constructor(readonly issues: readonly ValidationIssue[]) {
    super(
      `Massing validation failed: ${issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('; ')}`,
    )
    this.name = 'MassingValidationError'
  }
}

export const USES: readonly MassUse[] = ['residential', 'commercial', 'mixed', 'civic', 'other']

function issue(path: string, message: string): ValidationIssue {
  return { path, message }
}

function nonEmpty(value: string, path: string, issues: ValidationIssue[]) {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(issue(path, 'must be a non-empty string'))
  }
}

export function validateFootprint(
  footprint: { readonly vertices: readonly (readonly [number, number])[] },
  path = 'footprint',
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const vertices = footprint.vertices
  if (!Array.isArray(vertices) || vertices.length < 3 || vertices.length > 200) {
    issues.push(issue(`${path}.vertices`, 'must have 3–200 vertices'))
    return issues
  }
  for (let index = 0; index < vertices.length; index += 1) {
    const point = vertices[index]
    if (
      !point ||
      point.length !== 2 ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1])
    ) {
      issues.push(issue(`${path}.vertices[${index}]`, 'must be a finite [east, north] pair'))
    }
  }
  if (issues.length > 0) return issues
  if (!isSimpleRing(vertices)) {
    issues.push(issue(`${path}.vertices`, 'edges must not cross'))
  }
  if (polygonArea(vertices) < MIN_FOOTPRINT_AREA) {
    issues.push(issue(`${path}.vertices`, `area must be at least ${MIN_FOOTPRINT_AREA} m²`))
  }
  return issues
}

export function validateTier(
  tier: MassTier,
  path = 'tier',
  assumptions?: ScenarioAssumptions,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  nonEmpty(tier.id, `${path}.id`, issues)
  nonEmpty(tier.name, `${path}.name`, issues)
  if (
    !Number.isFinite(tier.baseElevation) ||
    tier.baseElevation < -500 ||
    tier.baseElevation > 1000
  ) {
    issues.push(issue(`${path}.baseElevation`, 'must be a finite elevation between -500 and 1000 m'))
  }
  const minimum = assumptions?.minStoreys ?? MIN_STOREYS
  const maximum = assumptions?.maxStoreys ?? MAX_STOREYS
  if (!Number.isInteger(tier.storeys) || tier.storeys < minimum || tier.storeys > maximum) {
    issues.push(issue(`${path}.storeys`, `must be an integer between ${minimum} and ${maximum}`))
  }
  if (
    !Number.isFinite(tier.storeyHeight) ||
    tier.storeyHeight < MIN_STOREY_HEIGHT ||
    tier.storeyHeight > MAX_STOREY_HEIGHT
  ) {
    issues.push(
      issue(
        `${path}.storeyHeight`,
        `must be between ${MIN_STOREY_HEIGHT} and ${MAX_STOREY_HEIGHT} m`,
      ),
    )
  }
  if (!USES.includes(tier.use)) issues.push(issue(`${path}.use`, 'must be a known use'))
  issues.push(...validateFootprint(tier.footprint, `${path}.footprint`))
  return issues
}

function isStoreyCount(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_STOREYS && value <= MAX_STOREYS
}

export function validateAssumptions(
  assumptions: ScenarioAssumptions,
  path = 'assumptions',
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { defaultStoreyHeight, minStoreys, maxStoreys } = assumptions
  if (
    !Number.isFinite(defaultStoreyHeight) ||
    defaultStoreyHeight < MIN_STOREY_HEIGHT ||
    defaultStoreyHeight > MAX_STOREY_HEIGHT
  ) {
    issues.push(
      issue(
        `${path}.defaultStoreyHeight`,
        `must be between ${MIN_STOREY_HEIGHT} and ${MAX_STOREY_HEIGHT} m`,
      ),
    )
  }
  const range = `must be an integer between ${MIN_STOREYS} and ${MAX_STOREYS}`
  if (!isStoreyCount(minStoreys)) issues.push(issue(`${path}.minStoreys`, range))
  if (!isStoreyCount(maxStoreys)) issues.push(issue(`${path}.maxStoreys`, range))
  else if (isStoreyCount(minStoreys) && maxStoreys < minStoreys) {
    issues.push(issue(`${path}.maxStoreys`, 'must not be less than minStoreys'))
  }
  return issues
}

export function validateVolume(
  volume: MassVolume,
  path = 'volume',
  assumptions?: ScenarioAssumptions,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  nonEmpty(volume.id, `${path}.id`, issues)
  nonEmpty(volume.name, `${path}.name`, issues)
  if (volume.tiers.length === 0) issues.push(issue(`${path}.tiers`, 'must have at least one tier'))
  const tierIds = new Set<string>()
  volume.tiers.forEach((tier, index) => {
    const tierPath = `${path}.tiers[${index}]`
    if (tierIds.has(tier.id)) issues.push(issue(`${tierPath}.id`, 'must be unique'))
    tierIds.add(tier.id)
    issues.push(...validateTier(tier, tierPath, assumptions))
  })
  return issues
}

export function validateScenario(document: ScenarioDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (document.schemaVersion !== SCENARIO_SCHEMA_VERSION) {
    issues.push(issue('schemaVersion', `must be ${SCENARIO_SCHEMA_VERSION}`))
  }
  nonEmpty(document.id, 'id', issues)
  nonEmpty(document.siteId, 'siteId', issues)
  nonEmpty(document.name, 'name', issues)
  if (document.notes.length > MAX_NOTES_LENGTH) issues.push(issue('notes', `must be at most ${MAX_NOTES_LENGTH} characters`))
  for (const key of ['createdAt', 'updatedAt'] as const) {
    if (!Number.isFinite(Date.parse(document[key]))) issues.push(issue(key, 'must be an ISO 8601 date-time'))
  }
  if (document.camera) {
    for (const key of ['position', 'target'] as const) {
      if (!document.camera[key].every(Number.isFinite)) issues.push(issue(`camera.${key}`, 'must be finite metres'))
    }
  }
  const assumptionIssues = validateAssumptions(document.assumptions)
  issues.push(...assumptionIssues)
  // Only bound tiers by the scenario's storey range once that range is itself valid.
  const assumptions = assumptionIssues.length === 0 ? document.assumptions : undefined

  const volumeIds = new Set<string>()
  const tierOwners = new Map<string, number>()
  document.volumes.forEach((volume, volumeIndex) => {
    const path = `volumes[${volumeIndex}]`
    if (volumeIds.has(volume.id)) issues.push(issue(`${path}.id`, 'must be unique'))
    volumeIds.add(volume.id)
    issues.push(...validateVolume(volume, path, assumptions))
    // Duplicates inside one volume are reported by validateVolume.
    volume.tiers.forEach((tier, tierIndex) => {
      const owner = tierOwners.get(tier.id)
      if (owner !== undefined && owner !== volumeIndex) {
        issues.push(issue(`${path}.tiers[${tierIndex}].id`, 'must be unique across the scenario'))
      }
      if (owner === undefined) tierOwners.set(tier.id, volumeIndex)
    })
  })
  return issues
}
