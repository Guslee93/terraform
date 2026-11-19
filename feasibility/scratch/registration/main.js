// Throwaway registration viewer: DTM1 terrain + SVV strategic Lden polygons (draped) + matrikkel
// parcels + the app's curated OSM buildings and roads, all in Terraform's local ENU frame
// (three: x = East, y = Up, z = -North, as ADR-0002). Not product code.
import * as THREE from 'three'

const scene = await (await fetch('./scene.json')).json()
const view = new URLSearchParams(location.search).get('view') ?? 'oblique'

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(devicePixelRatio)
renderer.setSize(innerWidth, innerHeight)
document.body.appendChild(renderer.domElement)
const world = new THREE.Scene()
world.background = new THREE.Color('#f2f1ee')
world.add(new THREE.HemisphereLight('#ffffff', '#b8b4aa', 1.6))
const sun = new THREE.DirectionalLight('#ffffff', 1.4)
sun.position.set(-200, 300, 150)
world.add(sun)

// Terrain with a per-vertex band texture (the grid IS the noise raster, so UV = grid index).
const { w, h, e, n, z } = scene.terrain
const pos = new Float32Array(w * h * 3)
const uv = new Float32Array(w * h * 2)
for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
  const i = r * w + c
  pos.set([e[i], z[i], -n[i]], i * 3)
  uv.set([(c + 0.5) / w, 1 - (r + 0.5) / h], i * 2)
}
const index = []
for (let r = 0; r + 1 < h; r++) for (let c = 0; c + 1 < w; c++) {
  const a = r * w + c, b = a + 1, d = a + w, f = d + 1
  index.push(a, d, b, b, d, f)
}
const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
geo.setIndex(index)
geo.computeVertexNormals()
const COLORS = { 0: [222, 220, 214], 50: [236, 231, 196], 55: [244, 214, 120], 60: [238, 170, 80], 65: [214, 104, 64], 70: [170, 48, 64], 75: [110, 28, 72] }
const tex = new Uint8Array(w * h * 4)
scene.noise.band.forEach((b, i) => {
  const r = Math.floor(i / w), c = i % w
  const j = ((h - 1 - r) * w + c) * 4 // DataTexture row 0 is the bottom (south)
  tex.set([...COLORS[b], 255], j)
})
const dataTex = new THREE.DataTexture(tex, w, h)
dataTex.colorSpace = THREE.SRGBColorSpace
dataTex.needsUpdate = true
world.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: dataTex })))

// Parcels (draped +0.25 m).
const parcelPts = []
for (const ring of scene.parcels) for (let k = 0; k + 5 < ring.length; k += 3)
  parcelPts.push(ring[k], ring[k + 2] + 0.05, -ring[k + 1], ring[k + 3], ring[k + 5] + 0.05, -ring[k + 4])
const pg = new THREE.BufferGeometry()
pg.setAttribute('position', new THREE.Float32BufferAttribute(parcelPts, 3))
world.add(new THREE.LineSegments(pg, new THREE.LineBasicMaterial({ color: '#1b3a5c' })))

// Buildings: extruded footprints, semi-transparent.
const bmat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })
const emat = new THREE.LineBasicMaterial({ color: '#444', transparent: true, opacity: 0.6 })
for (const b of scene.buildings) {
  const shape = new THREE.Shape(b.fp.map(([x, y]) => new THREE.Vector2(x, y)))
  const g = new THREE.ExtrudeGeometry(shape, { depth: b.h, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  g.translate(0, b.base, 0)
  world.add(new THREE.Mesh(g, bmat))
  world.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), emat))
}

// Major road centrelines from the app's package (OSM), for the noise check.
const rp = []
for (const r of scene.roads) {
  if (!['primary', 'secondary', 'tertiary'].includes(r.hw)) continue
  for (let k = 0; k + 1 < r.c.length; k++) rp.push(r.c[k][0], 0, -r.c[k][1], r.c[k + 1][0], 0, -r.c[k + 1][1])
}
// Lift road lines onto the terrain by nearest vertex height.
for (let k = 0; k < rp.length; k += 3) {
  const c = Math.round(((rp[k] - e[0]) / (e[w - 1] - e[0])) * (w - 1)), r = Math.round(((n[0] + rp[k + 2]) / (n[0] - n[(h - 1) * w])) * (h - 1))
  rp[k + 1] = (z[Math.min(h - 1, Math.max(0, r)) * w + Math.min(w - 1, Math.max(0, c))] ?? 0) + 0.6
}
const rg = new THREE.BufferGeometry()
rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3))
world.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#0a7f6f' })))

let camera
if (view === 'top') {
  const a = innerWidth / innerHeight, s = 310
  camera = new THREE.OrthographicCamera(-s * a, s * a, s, -s, 1, 2000)
  camera.position.set(0, 800, 0); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0)
} else {
  camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 1, 5000)
  camera.position.set(-260, 330, 380); camera.lookAt(0, -10, -20)
}
renderer.render(world, camera)

document.getElementById('legend').innerHTML = `<b>Registration check · local ENU (m)</b>
Road noise Lden ${scene.noise.year}, Statens vegvesen strategic map (CNOSSOS-EU), 5 dB bands:<br>
${scene.noise.bands.map((b) => `<span class="sw" style="background:rgb(${COLORS[b]})"></span>${b}–${b + 5}`).join(' ')}
<span class="sw" style="background:rgb(${COLORS[0]})"></span>&lt; 50 / not mapped<br>
<span class="sw" style="background:#1b3a5c"></span>Parcels, Kartverket matrikkel (eiendomskart, not a survey)
<span class="sw" style="background:#0a7f6f"></span>OSM major roads<br>
Terrain: Kartverket DTM1 (2 m mesh). Buildings: app package (OSM). © Kartverket CC BY 4.0 · © OpenStreetMap ODbL · Statens vegvesen`
window.__ready = true
