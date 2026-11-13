import { expect, test } from '@playwright/test'
import { drawMass, openAnalysis } from './studio-helpers'
import type { FlowRequest, FlowResult } from '../src/features/analysis/flowRunner'
import { budget } from './budget'

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

test('Wind → Add a block updates the real worker field → Export image and clip actions', async ({ page }) => {
  test.setTimeout(budget(120_000))
  // Observe the actual worker, without replacing its solver or adding a product test hook.
  await page.addInitScript(() => {
    const NativeWorker = window.Worker
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options)
        if (!String(url).includes('flowWorker')) return
        const send = this.postMessage.bind(this)
        this.postMessage = (request: FlowRequest) => {
          document.documentElement.dataset.flowBuildings = String(request.buildings.length)
          document.documentElement.dataset.flowRequest = String(request.id)
          send(request)
        }
        this.addEventListener('message', (event: MessageEvent<FlowResult>) => {
          if (!event.data.settled) return
          document.documentElement.dataset.flowResult = String(event.data.id)
          document.documentElement.dataset.flowSolid = String(event.data.solid.reduce((sum, cell) => sum + cell, 0))
        })
      }
    }
  })
  await page.goto('/studio/compact-infill')
  await openAnalysis(page, 'Wind')
  const root = page.locator('html')
  await expect(root).toHaveAttribute('data-flow-result', /\d+/, { timeout: budget(45_000) })
  const count = Number(await root.getAttribute('data-flow-buildings'))
  const solids = await root.getAttribute('data-flow-solid')
  await page.getByRole('button', { name: 'Add a block' }).click()
  await drawMass(page)
  await expect(root).toHaveAttribute('data-flow-buildings', String(count + 1))
  await expect.poll(async () => (await root.getAttribute('data-flow-result')) === (await root.getAttribute('data-flow-request')), { timeout: budget(45_000) }).toBe(true)
  await expect(root).not.toHaveAttribute('data-flow-solid', solids ?? '')
  await expect(page.getByTestId('analysis-card-wind')).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Image passes' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record 6 s clip' })).toBeVisible()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.screenshot({ path: 'docs/screenshots/c28-wind-block-export-1440x900.png' })
})
