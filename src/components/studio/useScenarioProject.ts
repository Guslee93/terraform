import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react'
import { updateScenarioDetails } from '../../features/editor/commands'
import { createHistory } from '../../features/editor/history'
import { createEditorState, reduceEditor, type EditorEvent, type EditorState } from '../../features/editor/interaction'
import { createScenario } from '../../features/massing/factories'
import { MAX_NOTES_LENGTH, SCENARIO_SCHEMA_VERSION, type ScenarioDocument } from '../../features/massing/types'
import { createAutosave, type SaveStatus } from '../../features/scenarios/autosave'
import { createDefaultProject, type ProjectExport, type ProjectRecord } from '../../features/scenarios/project'
import {
  addToProject,
  duplicateScenario,
  nextScenarioName,
  removeFromProject,
  resetScenario as emptiedScenario,
  setActive,
} from '../../features/scenarios/projectOps'
import type { LoadResult, ScenarioRepository, SkippedRecord } from '../../features/scenarios/repository'
import { dropSession, parkSession, sessionFor, type Sessions } from '../../features/scenarios/sessions'

/**
 * The studio's scenario project (M4, ADR-0011): loads a site's scenarios, keeps one editor
 * session per scenario, autosaves committed edits and exposes the scenario menu's actions.
 * Storage problems become a `storage` mode, never a crash (QA-14):
 * - `persistent`: IndexedDB works; edits autosave.
 * - `memory`: storage unavailable; the studio works but nothing is saved, and says so.
 * - `read-only`: the stored project is from a newer version; we never write over it.
 */
export type StorageMode = 'persistent' | 'memory' | 'read-only'

type ProjectData = {
  readonly project: ProjectRecord
  /** Last known copy of every scenario; the active one is newer in the editor. */
  readonly stored: ReadonlyMap<string, ScenarioDocument>
  readonly skipped: readonly SkippedRecord[]
  readonly storage: StorageMode
  readonly newerVersion: number | null
}

type EditorAction = EditorEvent | { readonly type: 'replace'; readonly state: EditorState }

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  return action.type === 'replace' ? action.state : reduceEditor(state, action)
}

const systemNow = () => new Date().toISOString()

export function useScenarioProject({ siteId, repository, now = systemNow }: {
  siteId: string
  repository: ScenarioRepository
  now?: () => string
}) {
  const [data, setData] = useState<ProjectData | null>(null)
  const [editor, dispatchEditor] = useReducer(editorReducer, siteId, (id) =>
    createEditorState(createHistory(createScenario({ id: 'loading', siteId: id }))),
  )
  const sessions = useRef<Sessions>(new Map())
  const lastSeen = useRef<ScenarioDocument | null>(null)
  const editorRef = useRef(editor)
  const nowRef = useRef(now)
  useEffect(() => {
    editorRef.current = editor
    nowRef.current = now
  })

  const autosave = useMemo(
    () => createAutosave({
      save: (document) => repository.saveScenario(document),
      // No writes while a pointer gesture is open (FR-043, D36).
      isBusy: () => editorRef.current.interaction.kind !== 'idle',
      now: () => nowRef.current(),
    }),
    [repository],
  )
  useEffect(() => () => autosave.dispose(), [autosave])
  const saveStatus = useSyncExternalStore<SaveStatus>(autosave.subscribe, autosave.status)

  /** Show `document` in the editor without counting it as an edit. */
  const activate = useCallback((state: EditorState) => {
    lastSeen.current = state.history.document
    dispatchEditor({ type: 'replace', state })
  }, [])

  const apply = useCallback((result: LoadResult) => {
    const at = nowRef.current()
    let storage: StorageMode = 'persistent'
    let newerVersion: number | null = null
    let project: ProjectRecord
    let scenarios: readonly ScenarioDocument[]
    let skipped: readonly SkippedRecord[] = []
    if (result.status === 'ready') {
      ;({ project, scenarios, skipped } = result)
      if (result.repaired) repository.saveProject(project).catch(() => undefined)
    } else {
      ;({ project, scenarios } = createDefaultProject(siteId, at))
      if (result.status === 'empty') {
        for (const document of scenarios) autosave.commit(document)
        void autosave.flush()
        repository.saveProject(project).catch(() => undefined)
      } else if (result.status === 'unavailable') {
        storage = 'memory'
      } else {
        storage = 'read-only'
        newerVersion = result.version
      }
    }
    sessions.current = new Map()
    const stored = new Map(scenarios.map((document) => [document.id, document]))
    const active = stored.get(project.activeScenarioId) ?? scenarios[0]
    if (active) activate(createEditorState(createHistory(active)))
    setData({ project, stored, skipped, storage, newerVersion })
  }, [activate, autosave, repository, siteId])

  useEffect(() => {
    let cancelled = false
    repository.load(siteId).then((result) => {
      if (!cancelled) apply(result)
    }, () => {
      if (!cancelled) apply({ status: 'unavailable', reason: "This browser can't store data" })
    })
    return () => {
      cancelled = true
    }
  }, [apply, repository, siteId])

  // Committed edits only: history.document changes on commit, never during a drag preview.
  useEffect(() => {
    const document = editor.history.document
    if (!data || data.storage !== 'persistent' || document === lastSeen.current) return
    lastSeen.current = document
    autosave.commit(document)
  }, [autosave, data, editor.history.document])

  // Save before the page goes away or into the background (FR-043).
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') void autosave.flush()
    }
    const leave = () => void autosave.flush()
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', leave)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', leave)
      void autosave.flush()
    }
  }, [autosave])

  const persistent = data?.storage === 'persistent'
  const activeId = data?.project.activeScenarioId ?? null
  const scenarios = useMemo(() => (data
    ? data.project.scenarioIds.flatMap((id) => {
        const document = id === activeId ? editor.history.document : data.stored.get(id)
        return document ? [document] : []
      })
    : []), [activeId, data, editor.history.document])

  const saveProject = (project: ProjectRecord) => {
    if (persistent) repository.saveProject(project).catch(() => undefined)
  }

  /** Park the active session and return the stored map with its latest document. */
  const parkActive = (current: ProjectData) => {
    sessions.current = parkSession(sessions.current, editor)
    return new Map(current.stored).set(editor.history.document.id, editor.history.document)
  }

  const switchTo = (id: string) => {
    if (!data || id === activeId || editor.interaction.kind !== 'idle') return
    const stored = parkActive(data)
    const target = stored.get(id)
    if (!target) return
    const project = setActive(data.project, id, now())
    setData({ ...data, project, stored })
    activate(sessionFor(sessions.current, target))
    if (persistent) void autosave.flush() // save-before-switch (FR-046)
    saveProject(project)
  }

  const add = (document: ScenarioDocument) => {
    if (!data || editor.interaction.kind !== 'idle') return
    const stored = parkActive(data).set(document.id, document)
    const project = addToProject(data.project, document.id, now())
    setData({ ...data, project, stored })
    activate(createEditorState(createHistory(document)))
    if (persistent) {
      autosave.commit(document)
      void autosave.flush()
    }
    saveProject(project)
  }

  const names = scenarios.map((document) => document.name)
  const latest = (id: string) => scenarios.find((document) => document.id === id)

  const create = () => add(createScenario({ siteId, name: nextScenarioName(names), now: now() }))

  const duplicate = (id: string) => {
    const source = latest(id)
    if (source) add(duplicateScenario(source, names, now()))
  }

  /** Returns an error message, or null when renamed. */
  const rename = (id: string, name: string): string | null => {
    const trimmed = name.trim()
    if (!trimmed) return 'A scenario needs a name.'
    if (names.some((other, index) => other === trimmed && scenarios[index]?.id !== id)) return 'Another scenario already has this name.'
    if (!data) return null
    if (id === activeId) {
      dispatchEditor({ type: 'command', command: updateScenarioDetails({ name: trimmed }) })
      return null
    }
    const document = data.stored.get(id)
    if (!document) return null
    const parked = sessions.current.get(id)
    if (parked) sessions.current = new Map(sessions.current).set(id, reduceEditor(parked, {
      type: 'command', command: updateScenarioDetails({ name: trimmed }),
    }))
    const renamed = { ...document, name: trimmed, updatedAt: now() }
    setData({ ...data, stored: new Map(data.stored).set(id, renamed) })
    if (persistent) autosave.commit(renamed)
    return null
  }

  /** Notes of the active scenario, undoable (FR-041). */
  const setNotes = (notes: string) => {
    dispatchEditor({ type: 'command', command: updateScenarioDetails({ notes: notes.slice(0, MAX_NOTES_LENGTH) }) })
  }

  /** Returns an error message, or null when removed. The last scenario can't be removed. */
  const remove = async (id: string): Promise<string | null> => {
    if (!data || editor.interaction.kind !== 'idle') return null
    if (data.project.scenarioIds.length <= 1) return 'A project keeps at least one scenario.'
    const project = removeFromProject(data.project, id, now())
    const stored = new Map(id === activeId ? data.stored : parkActive(data))
    stored.delete(id)
    sessions.current = dropSession(sessions.current, id)
    if (id === activeId) {
      const next = stored.get(project.activeScenarioId)
      if (next) activate(sessionFor(sessions.current, next))
    }
    setData({ ...data, project, stored })
    autosave.discard(id)
    if (persistent) {
      saveProject(project)
      await repository.deleteScenario(id).catch(() => undefined)
    }
    return null
  }

  const resetScenario = (id: string) => {
    const source = latest(id)
    if (!data || !source || editor.interaction.kind !== 'idle') return
    const emptied = emptiedScenario(source, now())
    sessions.current = dropSession(sessions.current, id)
    setData({ ...data, stored: new Map(data.stored).set(id, emptied) })
    if (id === activeId) activate(createEditorState(createHistory(emptied)))
    if (persistent) autosave.commit(emptied)
  }

  /** Back to the packaged baseline: Concept A and B, empty (ADR-0011 §4). */
  const resetDemo = async () => {
    if (!data || data.storage === 'read-only') return
    for (const id of data.project.scenarioIds) autosave.discard(id)
    if (persistent) await repository.resetSite(siteId).catch(() => undefined)
    apply(persistent ? { status: 'empty' } : { status: 'unavailable', reason: "This browser can't store data" })
  }

  /** Backup from what's on screen, including unsaved edits and unreadable records (FR-048). */
  const exportProject = (): string => {
    if (!data) return ''
    const bundle: ProjectExport = {
      schemaVersion: SCENARIO_SCHEMA_VERSION,
      provenance: { siteId, appVersion: __APP_VERSION__, exportedAt: now() },
      project: data.project,
      scenarios,
      ...(data.skipped.some((record) => record.json !== null)
        ? { unreadable: data.skipped.flatMap((record) => (record.json === null ? [] : [{ id: record.id, json: record.json }])) }
        : {}),
    }
    return JSON.stringify(bundle, null, 2)
  }

  /** Replace this site's project with a backup. Throws ScenarioLoadError for a bad file. */
  const importProject = async (json: string) => {
    if (!persistent) throw new Error('Importing needs browser storage, which is unavailable here.')
    await autosave.flush()
    apply(await repository.importProject(json))
  }

  const discardSkipped = async (id: string) => {
    if (!data) return
    if (persistent) await repository.deleteScenario(id)
    setData({ ...data, skipped: data.skipped.filter((record) => record.id !== id) })
  }

  return {
    ready: data !== null,
    storage: data?.storage ?? 'memory',
    newerVersion: data?.newerVersion ?? null,
    skipped: data?.skipped ?? [],
    scenarios,
    activeId,
    editor,
    // React's dispatch is stable; it accepts every EditorEvent.
    dispatch: dispatchEditor satisfies (event: EditorEvent) => void,
    saveStatus,
    canRemove: (data?.project.scenarioIds.length ?? 0) > 1,
    actions: { switchTo, create, duplicate, rename, setNotes, remove, resetScenario, resetDemo, exportProject, exportSavedData: () => repository.exportProject(siteId), importProject, discardSkipped, flush: () => autosave.flush() },
  }
}

export type ScenarioProject = ReturnType<typeof useScenarioProject>
