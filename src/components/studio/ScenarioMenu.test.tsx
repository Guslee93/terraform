import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createScenarioRepository } from '../../features/scenarios/repository'
import { createMemoryStore } from '../../features/scenarios/store'
import { createDefaultProject } from '../../features/scenarios/project'
import { useScenarioProject, type ScenarioProject } from './useScenarioProject'
import { ScenarioMenu } from './ScenarioMenu'
import { ScenarioNotes } from './ScenarioNotes'

import compactManifest from '../../../public/sites/compact-infill/manifest.json'
import compactTerrain from '../../../public/sites/compact-infill/terrain.json'
import compactStudyArea from '../../../public/sites/compact-infill/study-area.json'
import { parseSiteManifest } from '../../features/sites/manifest'
import { parseStudyArea, parseTerrain } from '../../features/sites/package'
import { normalizeRing } from '../../lib/polygon'
import { constraintsFromManifest } from '../../features/analysis/constraints'
import { sampleTerrainHeight } from '../../features/sites/geometry'
import { addVolume } from '../../features/editor/commands'
import { moveGesture } from '../../features/editor/interaction'
import { createRectangleFootprint, createTier, createVolume } from '../../features/massing/factories'

const terrain = parseTerrain(compactTerrain)
const site = {
  studyArea: normalizeRing(parseStudyArea(compactStudyArea).polygon),
  heightAt: (east: number, north: number) => sampleTerrainHeight(terrain, east, north),
  constraints: constraintsFromManifest(parseSiteManifest(compactManifest).constraints, 'grade'),
}
let project: ScenarioProject
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
    // Model native cleanup when the menu item that opened the dialog no longer exists.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }
})
async function setup(single = false) {
  const store = createMemoryStore()
  const repository = createScenarioRepository(store, { now: () => '2026-11-02T00:00:00Z', appVersion: 'test' })
  if (single) {
    const { project, scenarios } = createDefaultProject('compact-infill', '2026-11-02T00:00:00Z')
    await repository.saveScenario(scenarios[0]!)
    await repository.saveProject({ ...project, scenarioIds: [project.activeScenarioId] })
  }
  function Harness() {
    project = useScenarioProject({ siteId: 'compact-infill', repository })
    return <><ScenarioMenu project={project} site={site} /><output aria-label="Active scenario">{project.editor.history.document.name}</output><ScenarioNotes key={project.activeId} notes={project.editor.history.document.notes} disabled={!project.ready} onCommit={project.actions.setNotes} /></>
  }
  render(<Harness />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Concept A' })).toBeEnabled())
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Concept A' }))
  return { user }
}
describe('ScenarioMenu', () => {
  it.each(['Enter', 'Save name', 'Escape'])('restores row focus after rename via %s', async (method) => {
    const { user } = await setup()
    await user.click(screen.getAllByRole('button', { name: 'Rename' })[1]!)
    const input = screen.getByRole('textbox', { name: 'Scenario name' })
    await user.clear(input)
    await user.type(input, 'Courtyard')
    if (method === 'Save name') await user.click(screen.getByRole('button', { name: method }))
    else await user.keyboard(`{${method}}`)
    expect(screen.getAllByRole('button', { name: 'Rename' })[1]).toHaveFocus()
    expect(project.scenarios[1]?.name).toBe(method === 'Escape' ? 'Concept B' : 'Courtyard')
  })
  it('restores trigger focus when the row being renamed disappears', async () => {
    const { user } = await setup()
    await user.click(screen.getAllByRole('button', { name: 'Rename' })[1]!)
    await act(() => project.actions.remove(project.scenarios[1]!.id))
    expect(screen.getByRole('button', { name: 'Concept A' })).toHaveFocus()
  })
  it('shows status dots and geometry-derived GFA for each scenario', async () => {
    await setup()
    act(() => project.dispatch({ type: 'command', command: addVolume(createVolume({
      tiers: [createTier({ footprint: createRectangleFootprint(10, 10), storeys: 2 })],
    })) }))
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('2 floors · Concept GFA 200 m²')
    expect(rows[1]).toHaveTextContent('0 floors · Concept GFA 0 m²')
    for (const row of rows) {
      const status = within(row).getByTitle(/demo envelope|Not evaluated/)
      expect(status.querySelector('[aria-hidden="true"]')).toHaveClass('rounded-full')
    }
  })
  it('cancels then confirms deletion of a scenario', async () => {
    const { user } = await setup()
    const removedId = project.scenarios[1]!.id
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[1]!)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(project.scenarios).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Concept A' }))
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[1]!)
    await user.click(screen.getByRole('button', { name: 'Delete scenario' }))
    await waitFor(() => expect(project.scenarios).toHaveLength(1))
    expect(project.scenarios.some((scenario) => scenario.id === removedId)).toBe(false)
  })
  it('cancels then confirms resetting buildings and notes', async () => {
    const { user } = await setup()
    act(() => {
      project.dispatch({ type: 'command', command: addVolume(createVolume({ tiers: [createTier({ footprint: createRectangleFootprint(10, 10) })] })) })
      project.actions.setNotes('Keep until confirmed')
    })
    await user.click(screen.getAllByRole('button', { name: 'Reset' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(project.editor.history.document.volumes).toHaveLength(1)
    expect(project.editor.history.document.notes).toBe('Keep until confirmed')
    await user.click(screen.getByRole('button', { name: 'Concept A' }))
    await user.click(screen.getAllByRole('button', { name: 'Reset' })[0]!)
    await user.click(screen.getByRole('button', { name: 'Reset scenario' }))
    await waitFor(() => expect(project.editor.history.document.volumes).toHaveLength(0))
    expect(project.editor.history.document.notes).toBe('')
  })
  it('disables menu actions during a gesture', async () => {
    await setup()
    act(() => project.dispatch({ type: 'command', command: addVolume(createVolume({ id: 'moving', tiers: [createTier({ footprint: createRectangleFootprint(10, 10) })] })) }))
    act(() => project.dispatch({ type: 'pointerDown', point: [0, 0], gesture: moveGesture('moving') }))
    expect(project.editor.interaction.kind).not.toBe('idle')
    for (const button of within(screen.getByRole('group', { name: 'Scenarios' })).getAllByRole('button')) expect(button).toBeDisabled()
  })
  it.each([
    ['Reset', 'Reset scenario'], ['Delete', 'Delete scenario'], ['Reset demo…', 'Reset demo'],
  ])('restores trigger focus after every dismissal of %s', async (menuAction, confirmAction) => {
    const { user } = await setup()
    for (const dismissal of ['cancel', 'escape', 'confirm']) {
      await user.click(screen.getAllByRole('button', { name: menuAction })[0]!)
      const dialog = screen.getByRole('dialog')
      if (dismissal === 'escape') fireEvent(dialog, new Event('cancel', { cancelable: true }))
      else await user.click(within(dialog).getByRole('button', { name: dismissal === 'cancel' ? 'Cancel' : confirmAction }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      const trigger = screen.getByRole('button', { name: project.editor.history.document.name })
      expect(trigger).toHaveFocus()
      if (dismissal !== 'confirm') await user.click(trigger)
    }
  })

  it('closes on Tab-out without stealing focus', async () => {
    const { user } = await setup()
    act(() => screen.getByRole('button', { name: 'Reset demo…' }).focus())
    await user.tab()
    expect(screen.queryByLabelText('Scenarios')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /notes/i })).toHaveFocus()
  })
  it('stays open when plain text inside the menu is clicked', async () => {
    const { user } = await setup()
    const menu = screen.getByLabelText('Scenarios')
    // A non-focusable click blurs the focused control with no new focus target (relatedTarget null).
    await user.click(within(menu).getAllByText(/floors?/i)[0]!)
    expect(screen.getByLabelText('Scenarios')).toBeInTheDocument()
  })
  it('lists and switches scenarios, supports arrows and returns focus on Escape', async () => {
    const { user } = await setup()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('button', { name: /Concept B/ })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Active scenario')).toHaveTextContent('Concept B')
    const trigger = screen.getByRole('button', { name: 'Concept B' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByLabelText('Scenarios')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
  it('shows duplicate-name errors and allows cancellation', async () => {
    const { user } = await setup()
    await user.click(screen.getAllByRole('button', { name: 'Rename' })[0]!)
    const input = screen.getByRole('textbox', { name: 'Scenario name' })
    await user.clear(input)
    await user.type(input, 'Concept B{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Another scenario already has this name.')
    await user.keyboard('{Escape}')
    expect(input).not.toBeInTheDocument()
    expect(screen.getByLabelText('Active scenario')).toHaveTextContent('Concept A')
  })
  it('hides delete for the last scenario', async () => {
    await setup(true)
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
  it('requires confirmation before resetting the demo', async () => {
    const { user } = await setup()
    await user.click(screen.getByRole('button', { name: 'New scenario' }))
    await user.click(screen.getByRole('button', { name: 'Concept C' }))
    await user.click(screen.getByRole('button', { name: 'Reset demo…' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Remove every scenario for this site')
    expect(screen.getByLabelText('Active scenario')).toHaveTextContent('Concept C')
    await user.click(within(dialog).getByRole('button', { name: 'Reset demo' }))
    await waitFor(() => expect(screen.getByLabelText('Active scenario')).toHaveTextContent('Concept A'))
  })
})
