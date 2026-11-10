import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { drawMass, openStudio } from './studio-helpers'

// D40 — M5 accessibility checks (docs/plans/M5-plan.md, docs/handoffs/D39-D40-m5-perf-a11y.md).
//
// No new dependency: everything here is Playwright plus plain DOM queries, so
// the numbers are computable and reviewable. Each check reports what it found;
// a genuine product problem is marked `test.fixme` with the finding cited in
// docs/reviews/M5-a11y.md rather than worked around.
//
// Reduced motion is emulated for the whole file, which is also the state the
// motion check asserts.

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

type Route = { label: string; path: string; studio?: boolean }

const PAGES: readonly Route[] = [
  { label: 'landing', path: '/' },
  { label: 'about', path: '/about' },
  { label: 'studio', path: '/studio/compact-infill', studio: true },
]

/** The interactive controls the name, structure and target-size checks cover. */
const CONTROL_SELECTOR =
  'button, a[href], input, select, textarea, summary, [role="button"], [role="tab"], [role="slider"], [role="checkbox"]'

async function visit(page: Page, route: Route): Promise<void> {
  if (route.studio) {
    await openStudio(page)
    return
  }
  await page.goto(route.path)
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('h1')).toBeVisible()
}

type ControlName = {
  tag: string
  name: string
  visible: boolean
  disabled: boolean
  hint: string
}

/** Accessible name per element, in the accname order: aria-label, labelledby, label, content, title. */
async function controlNames(page: Page): Promise<ControlName[]> {
  return page.evaluate((selector) => {
    const text = (element: Element | null): string =>
      (element?.textContent ?? '').replace(/\s+/g, ' ').trim()

    const accessibleName = (element: Element): string => {
      const ariaLabel = element.getAttribute('aria-label')
      if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim()

      const labelledBy = element.getAttribute('aria-labelledby')
      if (labelledBy) {
        const parts = labelledBy
          .split(/\s+/)
          .map((id) => text(document.getElementById(id)))
          .filter(Boolean)
        if (parts.length > 0) return parts.join(' ')
      }

      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) {
        if (element.id) {
          const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`)
          if (text(label)) return text(label)
        }
        const wrapping = element.closest('label')
        if (text(wrapping)) return text(wrapping)
        if (element instanceof HTMLInputElement) {
          if (/^(button|submit|reset)$/.test(element.type) && element.value.trim()) return element.value.trim()
          // A placeholder is not an accessible name (WCAG 4.1.2 / accname step 2D excludes it).
        }
      }

      if (element instanceof HTMLImageElement && element.alt.trim()) return element.alt.trim()
      if (text(element)) return text(element)
      return (element.getAttribute('title') ?? '').trim()
    }

    const isVisible = (element: Element): boolean => {
      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }

    return [...document.querySelectorAll(selector)].map((element) => ({
      tag: element.tagName.toLowerCase(),
      name: accessibleName(element),
      visible: isVisible(element),
      disabled:
        element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true',
      hint: element.outerHTML.replace(/\s+/g, ' ').slice(0, 120),
    }))
  }, CONTROL_SELECTOR)
}

type Heading = { level: number; text: string; visible: boolean }
type Structure = {
  headings: Heading[]
  landmarks: { header: number; main: number; footer: number; nav: number }
}

async function structure(page: Page): Promise<Structure> {
  return page.evaluate(() => {
    const isVisible = (element: Element): boolean => {
      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || style.display === 'none') return false
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }
    return {
      headings: [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((heading) => ({
        level: Number(heading.tagName.slice(1)),
        text: (heading.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
        visible: isVisible(heading),
      })),
      landmarks: {
        header: document.querySelectorAll('header').length,
        main: document.querySelectorAll('main').length,
        footer: document.querySelectorAll('footer').length,
        nav: document.querySelectorAll('nav').length,
      },
    }
  })
}

type TabStop = { tag: string; name: string; outlineStyle: string; outlineWidth: string; boxShadow: string }

/** Every keyboard Tab stop until focus wraps back to <body>, with its focus indicator. */
async function tabStops(page: Page, max = 120): Promise<TabStop[]> {
  const stops: TabStop[] = []
  for (let index = 0; index < max; index += 1) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(() => {
      const element = document.activeElement
      if (!(element instanceof HTMLElement) || element === document.body) return null
      const style = getComputedStyle(element)
      return {
        tag: element.tagName.toLowerCase(),
        name: (element.getAttribute('aria-label') ?? element.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 60),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
      }
    })
    if (!stop) break
    stops.push(stop)
  }
  return stops
}


type Target = {
  tag: string
  name: string
  width: number
  height: number
  x: number
  y: number
  inline: boolean
}

/**
 * Interactive elements with their effective rendered boxes, for WCAG 2.5.8.
 * A checkbox/select that sits inside a <label> is clicked through the label, so
 * the label's box is the target, not the 16 px control inside it.
 */
async function touchTargets(page: Page): Promise<Target[]> {
  return page.evaluate((selector) => {
    const isVisible = (element: Element): boolean => {
      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }
    return [...document.querySelectorAll(selector)]
      .filter(isVisible)
      .flatMap((element) => {
        const label =
          element instanceof HTMLInputElement || element instanceof HTMLSelectElement
            ? element.closest('label')
            : null
        const box = label ? label.getBoundingClientRect() : element.getBoundingClientRect()
        if (box.width < 2 || box.height < 2) return [] // visually hidden (sr-only)
        const own = (element.textContent ?? '').replace(/\s+/g, ' ').trim()
        const labelText = (label?.textContent ?? '').replace(/\s+/g, ' ').trim()
        const parent = (element.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim()
        const name =
          [element.getAttribute('aria-label'), labelText, own, element.getAttribute('title')]
            .map((value) => (value ?? '').replace(/\s+/g, ' ').trim())
            .find((value) => value.length > 0) ?? ''
        return [
          {
            tag: element.tagName.toLowerCase(),
            name: name.slice(0, 60),
            width: Math.round(box.width * 10) / 10,
            height: Math.round(box.height * 10) / 10,
            x: box.x,
            y: box.y,
            // WCAG 2.5.8 inline exception: a link inside running text.
            inline: element.tagName === 'A' && own.length > 0 && parent.length > own.length + 2,
          },
        ]
      })
  }, CONTROL_SELECTOR)
}

/**
 * WCAG 2.5.8 spacing exception: an undersized target passes when a 24 css-px
 * circle centred on its box does not intersect another target's box.
 */
function spacedTargets(targets: Target[]): Set<Target> {
  const spaced = new Set<Target>()
  for (const target of targets) {
    const radius = 12
    const cx = target.x + target.width / 2
    const cy = target.y + target.height / 2
    const collides = targets.some((other) => {
      if (other === target) return false
      const nearestX = Math.max(other.x, Math.min(cx, other.x + other.width))
      const nearestY = Math.max(other.y, Math.min(cy, other.y + other.height))
      return Math.hypot(cx - nearestX, cy - nearestY) < radius
    })
    if (!collides) spaced.add(target)
  }
  return spaced
}

/** WCAG 2.x relative luminance and contrast ratio for sRGB hex colours. */
function channel(value: number): number {
  const scaled = value / 255
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const red = channel(Number.parseInt(hex.slice(1, 3), 16))
  const green = channel(Number.parseInt(hex.slice(3, 5), 16))
  const blue = channel(Number.parseInt(hex.slice(5, 7), 16))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(first: string, second: string): number {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Read a token out of src/styles/tokens.css (the contract's colour source). */
async function tokens(): Promise<Record<string, string>> {
  const css = await readFile(path.resolve('src/styles/tokens.css'), 'utf8')
  const values: Record<string, string> = {}
  const pattern = /--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\b/g
  for (const match of css.matchAll(pattern)) {
    const [, name, value] = match
    if (name && value) values[name] = value.toLowerCase()
  }
  return values
}


type TextSample = {
  text: string
  tag: string
  color: string
  background: string
  ratio: number
  fontSize: number
  bold: boolean
}

type TextContrastResult = { samples: TextSample[]; notComputable: string[] }

/**
 * Effective colour and nearest opaque background for every visible run of text,
 * measured from getComputedStyle (colours resolved through a 1x1 canvas so
 * oklab/color-mix values work). Translucent backgrounds are composited until an
 * opaque layer is found; a background image anywhere in that chain makes the
 * pair not computable.
 */
async function textContrasts(page: Page): Promise<TextContrastResult> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d')
    if (!context) return { samples: [], notComputable: ['canvas 2d unavailable'] }

    type Colour = { r: number; g: number; b: number; a: number }

    const parsed = (value: string): Colour => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = 'rgba(0, 0, 0, 0)'
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      const data = context.getImageData(0, 0, 1, 1).data
      return { r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0, a: (data[3] ?? 0) / 255 }
    }

    const over = (top: Colour, bottom: Colour): Colour => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    })

    const toHex = (colour: Colour): string =>
      `#${[colour.r, colour.g, colour.b]
        .map((value) => Math.round(value).toString(16).padStart(2, '0'))
        .join('')}`

    const channel = (value: number): number => {
      const scaled = value / 255
      return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
    }

    const luminance = (colour: Colour): number =>
      0.2126 * channel(colour.r) + 0.7152 * channel(colour.g) + 0.0722 * channel(colour.b)

    const ratioOf = (first: Colour, second: Colour): number => {
      const a = luminance(first)
      const b = luminance(second)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }

    const backgroundFor = (element: Element): Colour | null => {
      const layers: Colour[] = []
      let node: Element | null = element
      while (node) {
        const style = getComputedStyle(node)
        if (style.backgroundImage !== 'none') return null
        const colour = parsed(style.backgroundColor)
        if (colour.a > 0) {
          layers.push(colour)
          if (colour.a >= 0.999) break
        }
        node = node.parentElement
      }
      const base = layers[layers.length - 1]
      if (!base || base.a < 0.999) return null
      let result = base
      for (let index = layers.length - 2; index >= 0; index -= 1) {
        const layer = layers[index]
        if (layer) result = over(layer, result)
      }
      return result
    }

    const samples: TextSample[] = []
    const notComputable: string[] = []
    const skipped = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION', 'INPUT', 'SELECT', 'TEXTAREA'])

    for (const element of document.querySelectorAll('body *')) {
      if (!(element instanceof HTMLElement) || skipped.has(element.tagName)) continue
      const ownText = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!ownText) continue

      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue
      const rect = element.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue // sr-only / clipped
      if (element.closest('[aria-hidden="true"]')) continue // decorative
      // WCAG 1.4.3 does not apply to inactive controls.
      if (element.closest(':disabled') || element.closest('[aria-disabled="true"]')) continue

      const background = backgroundFor(element)
      if (!background) {
        notComputable.push(`${element.tagName.toLowerCase()} "${ownText.slice(0, 40)}"`)
        continue
      }

      let colour = parsed(style.color)
      if (colour.a < 1) colour = over(colour, background)
      const fontSize = Number.parseFloat(style.fontSize)
      const weight = Number.parseInt(style.fontWeight, 10)
      samples.push({
        text: ownText.slice(0, 60),
        tag: element.tagName.toLowerCase(),
        color: toHex(colour),
        background: toHex(background),
        ratio: Math.round(ratioOf(colour, background) * 100) / 100,
        fontSize,
        bold: weight >= 600,
      })
    }

    return { samples, notComputable }
  })
}

type AnimationInfo = { name: string; duration: number; infinite: boolean; playState: string }

async function runningAnimations(page: Page): Promise<AnimationInfo[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.playState === 'running')
      .map((animation) => {
        const effect = animation.effect
        const timing = effect instanceof KeyframeEffect ? effect.getTiming() : null
        const duration =
          typeof timing?.duration === 'number' ? timing.duration : Number.parseFloat(`${timing?.duration ?? 0}`)
        const name =
          animation instanceof CSSAnimation
            ? animation.animationName
            : animation instanceof CSSTransition
              ? `transition:${animation.transitionProperty}`
              : animation.constructor.name
        return {
          name,
          duration,
          infinite: timing ? timing.iterations === Infinity : false,
          playState: animation.playState,
        }
      }),
  )
}


// ---------------------------------------------------------------------------
// 1. Accessible names
// ---------------------------------------------------------------------------

for (const route of PAGES) {
  test(`${route.label}: every control has an accessible name`, async ({ page }) => {
    await visit(page, route)
    const controls = await controlNames(page)
    const unnamed = controls.filter((control) => control.name === '')
    const visibleUnnamed = unnamed.filter((control) => control.visible)
    console.log(
      `${route.label}: ${controls.length} controls, ${visibleUnnamed.length} visible unnamed, ${unnamed.length} unnamed in DOM`,
    )
    if (unnamed.length > 0) {
      console.log(
        `unnamed: ${unnamed.map((control) => `${control.tag}${control.visible ? '' : '(hidden)'} ${control.hint}`).join('\n')}`,
      )
    }
    expect(unnamed, `${route.label}: controls without an accessible name`).toEqual([])
  })
}

// ---------------------------------------------------------------------------
// 2. Document structure
// ---------------------------------------------------------------------------

for (const route of PAGES) {
  const title = `${route.label}: exactly one visible h1`
  const body = async ({ page }: { page: Page }) => {
    await visit(page, route)
    const { headings } = await structure(page)
    const h1s = headings.filter((heading) => heading.level === 1 && heading.visible)
    console.log(
      `${route.label} headings: ${headings
        .filter((heading) => heading.visible)
        .map((heading) => `h${heading.level}:${heading.text}`)
        .join(' | ')}`,
    )
    expect(h1s, `${route.label}: visible h1 count`).toHaveLength(1)
  }
  if (route.studio) {
    // A11Y-1 (docs/reviews/M5-a11y.md): the loaded studio has no h1 — StudioShell
    // renders an h1 only in its loading/error branch
    // (src/components/studio/StudioShell.tsx); the ready inspector starts at h2.
    test.fixme(title, body)
  } else {
    test(title, body)
  }

  test(`${route.label}: heading levels never skip`, async ({ page }) => {
    await visit(page, route)
    const { headings } = await structure(page)
    const visible = headings.filter((heading) => heading.visible)
    const skips = visible
      .map((heading, index) => ({ heading, previous: visible[index - 1] }))
      .filter(({ heading, previous }) => previous !== undefined && heading.level - previous.level > 1)
    expect(
      skips.map(({ heading, previous }) => `h${previous?.level} -> h${heading.level} (${heading.text})`),
      `${route.label}: skipped heading levels`,
    ).toEqual([])
  })

  test(`${route.label}: expected landmarks`, async ({ page }) => {
    await visit(page, route)
    const { landmarks } = await structure(page)
    console.log(`${route.label} landmarks: ${JSON.stringify(landmarks)}`)
    expect(landmarks.header, `${route.label}: header landmark`).toBeGreaterThanOrEqual(1)
    expect(landmarks.main, `${route.label}: main landmark`).toBe(1)
    if (route.studio) {
      // The studio renders no site footer; recorded, not a failure.
      expect(landmarks.footer, 'studio footer count (reported, not required)').toBe(0)
    } else {
      expect(landmarks.footer, `${route.label}: footer landmark`).toBeGreaterThanOrEqual(1)
    }
  })
}


// ---------------------------------------------------------------------------
// 3. Contrast — tokens from src/styles/tokens.css
// ---------------------------------------------------------------------------

test('token colour pairs meet WCAG AA (4.5:1 for text under 24 px)', async () => {
  const values = await tokens()
  const need = (name: string): string => {
    const value = values[name]
    if (!value) throw new Error(`Token --${name} not found in src/styles/tokens.css`)
    return value
  }

  const pairs = [
    { label: 'ink-primary on surface', foreground: 'ink-primary', background: 'surface' },
    { label: 'ink-primary on ground', foreground: 'ink-primary', background: 'bg-app' },
    { label: 'ink-secondary on surface', foreground: 'ink-secondary', background: 'surface' },
    { label: 'ink-secondary on ground', foreground: 'ink-secondary', background: 'bg-app' },
    { label: 'accent on surface', foreground: 'accent', background: 'surface' },
    { label: 'ink-on-inverse on accent', foreground: 'ink-on-inverse', background: 'accent' },
    { label: 'white on accent', foreground: 'white', background: 'accent' },
    { label: 'warning-ink on surface', foreground: 'warning-ink', background: 'surface' },
    { label: 'positive on surface', foreground: 'positive', background: 'surface' },
    { label: 'ink-disabled on surface (inactive UI)', foreground: 'ink-disabled', background: 'surface' },
  ] as const

  const results = pairs.map((pair) => {
    const foreground = pair.foreground === 'white' ? '#ffffff' : need(pair.foreground)
    const background = need(pair.background)
    return {
      ...pair,
      foreground,
      background,
      ratio: Math.round(contrastRatio(foreground, background) * 100) / 100,
      exempt: pair.foreground === 'ink-disabled',
    }
  })

  console.log(`token contrast: ${results.map((result) => `${result.label}=${result.ratio}`).join(' · ')}`)
  const failing = results.filter((result) => !result.exempt && result.ratio < 4.5)
  expect(failing, 'token pairs below 4.5:1').toEqual([])
})


// ---------------------------------------------------------------------------
// 4. Contrast — real rendered text
// ---------------------------------------------------------------------------

const requiredRatio = (sample: TextSample): number =>
  sample.fontSize >= 24 || (sample.fontSize >= 18.66 && sample.bold) ? 3 : 4.5

const TEXT_CONTRAST_PAGES = [
  { label: 'landing', path: '/', studio: false },
  { label: 'studio', path: '/studio/compact-infill', studio: true },
] as const

for (const route of TEXT_CONTRAST_PAGES) {
  test(`${route.label}: rendered text contrast`, async ({ page }) => {
    await visit(page, route)
    await page.waitForTimeout(300) // let the entry motion finish before sampling
    const { samples, notComputable } = await textContrasts(page)
    const below = samples.filter((sample) => sample.ratio < 4.5).sort((a, b) => a.ratio - b.ratio)
    const failing = samples
      .filter((sample) => sample.ratio < requiredRatio(sample))
      .sort((a, b) => a.ratio - b.ratio)
    const format = (sample: TextSample) =>
      `${sample.ratio}:1 ${sample.color} on ${sample.background} ${sample.fontSize}px "${sample.text}" (${sample.tag})`
    console.log(
      `${route.label}: ${samples.length} text runs sampled, ${below.length} below 4.5:1, ${failing.length} below their WCAG threshold, ${notComputable.length} not computable`,
    )
    if (below.length > 0) console.log(`below 4.5:1 (worst first):\n${below.slice(0, 10).map(format).join('\n')}`)
    if (notComputable.length > 0) console.log(`not computable: ${notComputable.slice(0, 10).join(' | ')}`)
    expect(failing.map(format), `${route.label}: text below its WCAG AA contrast threshold`).toEqual([])
  })
}

// ---------------------------------------------------------------------------
// 5. Reduced motion
// ---------------------------------------------------------------------------

const MOTION_PAGES = [
  { label: 'landing', path: '/' },
  { label: 'about', path: '/about' },
] as const

function motionOffenders(animations: AnimationInfo[]): string[] {
  return animations
    .filter((animation) => animation.infinite || animation.duration > 100)
    .map((animation) => `${animation.name} duration=${animation.duration}ms infinite=${animation.infinite}`)
}

for (const route of MOTION_PAGES) {
  test(`${route.label}: reduced motion leaves no running animation`, async ({ page }) => {
    await page.goto(route.path)
    await expect(page.locator('main')).toBeVisible()
    await page.waitForTimeout(200)
    const animations = await runningAnimations(page)
    console.log(`${route.label}: running animations under reduced motion = ${animations.length}`)
    expect(motionOffenders(animations), `${route.label}: motion not reduced`).toEqual([])
  })
}

test('studio with a mass selected: reduced motion leaves no running animation', async ({ page }) => {
  test.setTimeout(90_000)
  await openStudio(page)
  // Let the canvas mount and the initial layout settle before the first toolbar
  // click (the toolbar is absolutely positioned inside the resizing viewport).
  await page.waitForTimeout(1000)
  await drawMass(page)
  await page.waitForTimeout(200)
  const animations = await runningAnimations(page)
  console.log(`studio (mass selected): running animations under reduced motion = ${animations.length}`)
  expect(motionOffenders(animations), 'studio: motion not reduced').toEqual([])
})


// ---------------------------------------------------------------------------
// 6. Focus indicator (keyboard) — landing and About; the studio is covered by
//    e2e/keyboard.spec.ts, so this file does not duplicate it.
// ---------------------------------------------------------------------------

const FOCUS_PAGES = [
  { label: 'landing', path: '/' },
  { label: 'about', path: '/about' },
] as const

for (const route of FOCUS_PAGES) {
  test(`${route.label}: every keyboard stop shows a focus indicator`, async ({ page }) => {
    await page.goto(route.path)
    await expect(page.locator('h1')).toBeVisible()
    const stops = await tabStops(page)
    const invisible = stops.filter(
      (stop) => (stop.outlineStyle === 'none' || stop.outlineWidth === '0px') && stop.boxShadow === 'none',
    )
    console.log(
      `${route.label}: ${stops.length} tab stops: ${stops.map((stop) => `${stop.tag}:${stop.name}`).join(' | ')}`,
    )
    expect(stops.length, `${route.label}: too few keyboard stops`).toBeGreaterThan(5)
    expect(
      invisible.map((stop) => `${stop.tag} "${stop.name}" outline=${stop.outlineStyle} ${stop.outlineWidth} shadow=${stop.boxShadow}`),
      `${route.label}: keyboard stops without a visible focus indicator`,
    ).toEqual([])
  })
}

// ---------------------------------------------------------------------------
// 7. Touch / pointer target size at 1440x900 (WCAG 2.5.8, 24 x 24 minimum)
// ---------------------------------------------------------------------------

const TARGET_PAGES = [
  { label: 'landing', path: '/', studio: false },
  { label: 'studio', path: '/studio/compact-infill', studio: true },
] as const

for (const route of TARGET_PAGES) {
  const title = `${route.label}: interactive targets meet the 24x24 minimum`
  const body = async ({ page }: { page: Page }) => {
    await visit(page, route)
    const targets = await touchTargets(page)
    const under24 = targets.filter((target) => target.width < 24 || target.height < 24)
    const under44 = targets.filter((target) => target.width < 44 || target.height < 44)
    const spaced = spacedTargets(targets)
    const format = (target: Target) =>
      `${target.tag} "${target.name}" ${target.width}x${target.height}${target.inline ? ' (inline link)' : ''}${spaced.has(target) ? ' (spacing exception)' : ''}`
    console.log(
      `${route.label}: ${targets.length} targets, ${under24.length} under 24x24, ${under44.length} under 44x44`,
    )
    if (under24.length > 0) console.log(`under 24x24:\n${under24.map(format).join('\n')}`)
    if (under44.length > 0) console.log(`under 44x44:\n${under44.map(format).join('\n')}`)
    // WCAG 2.5.8: inline text links and the spacing exception (a 24 px circle
    // centred on the target hits nothing else) are reported, not failed.
    const failing = under24.filter((target) => !target.inline && !spaced.has(target))
    expect(failing.map(format), `${route.label}: controls below the 24x24 minimum`).toEqual([])
  }
  if (route.studio) {
    // A11Y-2 (docs/reviews/M5-a11y.md): the sun band's Morning/Noon/Evening and
    // 30/60/120 min/s buttons are 17.8 px tall and their 24 px spacing circles
    // hit neighbouring buttons, so they fail WCAG 2.5.8.
    test.fixme(title, body)
  } else {
    test(title, body)
  }
}

