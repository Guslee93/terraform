import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createScenarioRepository } from '../../features/scenarios/repository'
import { createMemoryStore } from '../../features/scenarios/store'
import { createDefaultProject } from '../../features/scenarios/project'
import { useScenarioProject } from './useScenarioProject'
import { ScenarioMenu } from './ScenarioMenu'
import { ScenarioNotes } from './ScenarioNotes'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})
async function setup(single = false) {
  const store = createMemoryStore()
  const repository = createScenarioRepository(store, { now: () => '2026-11-02T00:00:00Z', appVersion: 'test' })
  if (single) {
    const { project, scenarios } = createDefaultProject('s', '2026-11-02T00:00:00Z')
    await repository.saveScenario(scenarios[0]!)
    await repository.saveProject({ ...project, scenarioIds: [project.activeScenarioId] })
  }
  function Harness() {
    const project = useScenarioProject({ siteId: 's', repository })
    return <><ScenarioMenu project={project} site={null} /><output aria-label="Active scenario">{project.editor.history.document.name}</output><ScenarioNotes key={project.activeId} notes={project.editor.history.document.notes} disabled={!project.ready} onCommit={project.actions.setNotes} /></>
  }
  render(<Harness />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Concept A' })).toBeEnabled())
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Concept A' }))
  return { user }
}
describe('ScenarioMenu', () => {
  it('lists and switches scenarios, supports arrows and returns focus on Escape', async () => {
    const { user } = await setup()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('button', { name: 'Concept B' })).toHaveFocus()
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
