export type Vec2Tuple = readonly [east: number, north: number]
export type Vec3Tuple = readonly [east: number, north: number, up: number]

export type CameraPresetId = 'isometric' | 'top' | 'north' | 'south' | 'eyeLevel'

export type CameraPreset = {
  position: Vec3Tuple
  target: Vec3Tuple
  projection: 'perspective' | 'orthographic'
  fov?: number
}

export type SiteSource = {
  title: string
  url?: string
  license?: string
  attribution?: string
  acquiredAt?: string
}

export type SiteManifest = {
  schemaVersion: 1
  id: string
  title: string
  subtitle: string
  description: string
  morphology: string
  location: {
    latitude: number
    longitude: number
    timeZone: string
  }
  crs: {
    sourceEPSG: string
    horizontalDatum: string
    verticalDatum: string
    originLatitude: number
    originLongitude: number
    originElevation: number
    projection: string
  }
  unit: 'm'
  dataStatus: 'curated-demo' | 'licensed-real-world-simplified'
  assetPaths: {
    terrain: string
    buildings: string
    studyArea: string
    thumbnail: string
    attribution: string
  }
  constraints: {
    maxHeightMeters: number
    setbackMeters: number
    label: string
  }
  cameraPresets: Record<CameraPresetId, CameraPreset>
  sources: SiteSource[]
  simplified: string[]
  statistics: {
    buildingCount: number
    terrainSamples: number
    studyAreaM2: number
    sourceChecksum: string
  }
}

export class SitePackageError extends Error {
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(`${path}: ${message}`)
    this.name = 'SitePackageError'
  }
}

function fail(path: string, message: string): never {
  throw new SitePackageError(message, path)
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'expected an object')
  }
  return value as Record<string, unknown>
}

function asString(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
    fail(path, 'expected a non-empty string')
  }
  return value
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, 'expected a finite number')
  }
  return value
}

function asInteger(value: unknown, path: string): number {
  const number = asNumber(value, path)
  if (!Number.isInteger(number)) fail(path, 'expected an integer')
  return number
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'expected an array')
  return value
}

function asStringArray(value: unknown, path: string): string[] {
  return asArray(value, path).map((entry, index) =>
    asString(entry, `${path}[${index}]`),
  )
}

function asVec3(value: unknown, path: string): Vec3Tuple {
  const array = asArray(value, path)
  if (array.length !== 3) fail(path, 'expected [east, north, up]')
  return [
    asNumber(array[0], `${path}[0]`),
    asNumber(array[1], `${path}[1]`),
    asNumber(array[2], `${path}[2]`),
  ]
}


function parseCameraPreset(value: unknown, path: string): CameraPreset {
  const record = asRecord(value, path)
  const projection = asString(record.projection, `${path}.projection`)
  if (projection !== 'perspective' && projection !== 'orthographic') {
    fail(`${path}.projection`, 'expected perspective or orthographic')
  }
  if (projection === 'orthographic') {
    fail(`${path}.projection`, 'orthographic presets are not supported in v1')
  }
  const fov = record.fov === undefined ? undefined : asNumber(record.fov, `${path}.fov`)
  if (fov !== undefined && (fov <= 5 || fov >= 120)) fail(`${path}.fov`, 'expected 5–120')
  return {
    position: asVec3(record.position, `${path}.position`),
    target: asVec3(record.target, `${path}.target`),
    projection,
    ...(fov === undefined ? {} : { fov }),
  }
}

function parseSource(value: unknown, path: string): SiteSource {
  const record = asRecord(value, path)
  const source: SiteSource = { title: asString(record.title, `${path}.title`) }
  for (const key of ['url', 'license', 'attribution', 'acquiredAt'] as const) {
    if (record[key] !== undefined) source[key] = asString(record[key], `${path}.${key}`)
  }
  return source
}

export function parseSiteManifest(value: unknown): SiteManifest {
  const root = asRecord(value, 'manifest')
  if (root.schemaVersion !== 1) fail('manifest.schemaVersion', 'unsupported schema version')
  if (root.unit !== 'm') fail('manifest.unit', 'only metres are supported')

  const dataStatus = asString(root.dataStatus, 'manifest.dataStatus')
  if (dataStatus !== 'curated-demo' && dataStatus !== 'licensed-real-world-simplified') {
    fail('manifest.dataStatus', 'unknown data status')
  }

  const location = asRecord(root.location, 'manifest.location')
  const latitude = asNumber(location.latitude, 'manifest.location.latitude')
  const longitude = asNumber(location.longitude, 'manifest.location.longitude')
  if (latitude < -90 || latitude > 90) fail('manifest.location.latitude', 'out of range')
  if (longitude < -180 || longitude > 180) fail('manifest.location.longitude', 'out of range')

  const crs = asRecord(root.crs, 'manifest.crs')
  const originLatitude = asNumber(crs.originLatitude, 'manifest.crs.originLatitude')
  const originLongitude = asNumber(crs.originLongitude, 'manifest.crs.originLongitude')
  if (originLatitude < -90 || originLatitude > 90) fail('manifest.crs.originLatitude', 'out of range')
  if (originLongitude < -180 || originLongitude > 180) fail('manifest.crs.originLongitude', 'out of range')
  const assetPaths = asRecord(root.assetPaths, 'manifest.assetPaths')
  const constraints = asRecord(root.constraints, 'manifest.constraints')
  const cameraPresets = asRecord(root.cameraPresets, 'manifest.cameraPresets')
  const statistics = asRecord(root.statistics, 'manifest.statistics')

  const maxHeightMeters = asNumber(constraints.maxHeightMeters, 'manifest.constraints.maxHeightMeters')
  const setbackMeters = asNumber(constraints.setbackMeters, 'manifest.constraints.setbackMeters')
  if (maxHeightMeters <= 0) fail('manifest.constraints.maxHeightMeters', 'must be positive')
  if (setbackMeters < 0) fail('manifest.constraints.setbackMeters', 'must not be negative')

  const buildingCount = asInteger(statistics.buildingCount, 'manifest.statistics.buildingCount')
  const terrainSamples = asInteger(statistics.terrainSamples, 'manifest.statistics.terrainSamples')
  const studyAreaM2 = asNumber(statistics.studyAreaM2, 'manifest.statistics.studyAreaM2')
  if (buildingCount < 0) fail('manifest.statistics.buildingCount', 'must not be negative')
  if (terrainSamples <= 0) fail('manifest.statistics.terrainSamples', 'must be positive')
  if (studyAreaM2 <= 0) fail('manifest.statistics.studyAreaM2', 'must be positive')

  const sources = asArray(root.sources, 'manifest.sources').map((source, index) =>
    parseSource(source, `manifest.sources[${index}]`),
  )
  if (sources.length === 0) fail('manifest.sources', 'at least one source is required')

  return {
    schemaVersion: 1,
    id: asString(root.id, 'manifest.id'),
    title: asString(root.title, 'manifest.title'),
    subtitle: asString(root.subtitle, 'manifest.subtitle'),
    description: asString(root.description, 'manifest.description'),
    morphology: asString(root.morphology, 'manifest.morphology'),
    location: {
      latitude,
      longitude,
      timeZone: asString(location.timeZone, 'manifest.location.timeZone'),
    },
    crs: {
      sourceEPSG: asString(crs.sourceEPSG, 'manifest.crs.sourceEPSG'),
      horizontalDatum: asString(crs.horizontalDatum, 'manifest.crs.horizontalDatum'),
      verticalDatum: asString(crs.verticalDatum, 'manifest.crs.verticalDatum'),
      originLatitude,
      originLongitude,
      originElevation: asNumber(crs.originElevation, 'manifest.crs.originElevation'),
      projection: asString(crs.projection, 'manifest.crs.projection'),
    },
    unit: 'm',
    dataStatus,
    assetPaths: {
      terrain: asString(assetPaths.terrain, 'manifest.assetPaths.terrain'),
      buildings: asString(assetPaths.buildings, 'manifest.assetPaths.buildings'),
      studyArea: asString(assetPaths.studyArea, 'manifest.assetPaths.studyArea'),
      thumbnail: asString(assetPaths.thumbnail, 'manifest.assetPaths.thumbnail'),
      attribution: asString(assetPaths.attribution, 'manifest.assetPaths.attribution'),
    },
    constraints: {
      maxHeightMeters,
      setbackMeters,
      label: asString(constraints.label, 'manifest.constraints.label'),
    },
    cameraPresets: {
      isometric: parseCameraPreset(cameraPresets.isometric, 'manifest.cameraPresets.isometric'),
      top: parseCameraPreset(cameraPresets.top, 'manifest.cameraPresets.top'),
      north: parseCameraPreset(cameraPresets.north, 'manifest.cameraPresets.north'),
      south: parseCameraPreset(cameraPresets.south, 'manifest.cameraPresets.south'),
      eyeLevel: parseCameraPreset(cameraPresets.eyeLevel, 'manifest.cameraPresets.eyeLevel'),
    },
    sources,
    simplified: asStringArray(root.simplified, 'manifest.simplified'),
    statistics: {
      buildingCount,
      terrainSamples,
      studyAreaM2,
      sourceChecksum: asString(statistics.sourceChecksum, 'manifest.statistics.sourceChecksum'),
    },
  }
}
