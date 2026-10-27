import { isSimpleRing, polygonArea } from '../../lib/polygon'
import {
  MAX_STOREYS,
  MAX_STOREY_HEIGHT,
  MIN_FOOTPRINT_AREA,
  MIN_STOREYS,
  MIN_STOREY_HEIGHT,
  type MassTier,
  type MassUse,
  type ScenarioAssumptions,
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

const USES: readonly MassUse[] = ['residential', 'commercial', 'mixed', 'civic', 'other']

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
    issues.push(issue(`${path}.vertices`, 'must be a simple ring without crossings'))
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
