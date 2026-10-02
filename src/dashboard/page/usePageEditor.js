// Page edit mode (overall.md 2): a local draft of the page with undo/redo, Save / Cancel.
// Block configs are never part of it. The draft is kept in ctx.drafts while navigating in the app.
import { computed, ref } from 'vue'
import { clone } from '../core/clone.js'

const HISTORY_LIMIT = 100
const BOTTOM = 1000 // GridStack moves items up to the first free row

export function newId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function blockIdsOf(page) {
  return (page?.layout ?? []).flatMap((item) => (item.tabGroupId ? item.tabs.flatMap((tab) => tab.blocks.map((b) => b.blockId)) : [item.blockId]))
}

export function usePageEditor(ctx, getPage) {
  const draft = ref(null)
  const past = ref([])
  const future = ref([])
  const editing = computed(() => draft.value !== null)
  const draftKey = () => `page:${getPage()?.id}`

  const dirty = computed(() => editing.value && JSON.stringify(draft.value) !== JSON.stringify(getPage()))

  function persist() {
    if (draft.value) ctx.drafts.set(draftKey(), { draft: clone(draft.value), base: getPage().modified })
    else ctx.drafts.delete(draftKey())
  }

  function start() {
    draft.value = clone(getPage())
    past.value = []
    future.value = []
    persist()
  }

  // Resumes unsaved changes kept from earlier (same base version only).
  function resume() {
    const kept = ctx.drafts.get(draftKey())
    if (kept && kept.base === getPage()?.modified) {
      draft.value = clone(kept.draft)
      return true
    }
    return false
  }

  function stop() {
    draft.value = null
    past.value = []
    future.value = []
    persist()
  }

  // Every change goes through here, so undo/redo covers all of them.
  function change(fn) {
    past.value = [...past.value, clone(draft.value)].slice(-HISTORY_LIMIT)
    future.value = []
    const next = clone(draft.value)
    fn(next)
    draft.value = next
    persist()
  }

  function undo() {
    if (!past.value.length) return
    future.value = [clone(draft.value), ...future.value]
    draft.value = past.value[past.value.length - 1]
    past.value = past.value.slice(0, -1)
    persist()
  }

  function redo() {
    if (!future.value.length) return
    past.value = [...past.value, clone(draft.value)]
    draft.value = future.value[0]
    future.value = future.value.slice(1)
    persist()
  }

  // ---- helpers on a page object ----

  function gridOf(page, gridKey) {
    if (gridKey === 'page') return page.layout
    for (const item of page.layout) {
      if (!item.tabGroupId) continue
      const tab = item.tabs.find((t) => t.id === gridKey)
      if (tab) return tab.blocks
    }
    return null
  }

  function findBlock(page, blockId) {
    for (const key of ['page', ...page.layout.filter((i) => i.tabGroupId).flatMap((g) => g.tabs.map((t) => t.id))]) {
      const list = gridOf(page, key)
      const index = list.findIndex((i) => i.blockId === blockId)
      if (index >= 0) return { list, index, gridKey: key }
    }
    return null
  }

  function removeMappings(page, blockIds) {
    for (const filter of page.filters) filter.mappings = (filter.mappings ?? []).filter((m) => !blockIds.includes(m.blockId))
  }

  // ---- operations ----

  return {
    draft,
    editing,
    dirty,
    canUndo: computed(() => past.value.length > 0),
    canRedo: computed(() => future.value.length > 0),
    start,
    resume,
    stop,
    undo,
    redo,

    applyLayout(gridKey, positions) {
      const list = gridOf(draft.value, gridKey)
      if (!list) return
      const changed = positions.some((p) => {
        const item = list.find((i) => (i.blockId ?? i.tabGroupId) === p.key)
        return item && (item.x !== p.x || item.y !== p.y || item.w !== p.w || item.h !== p.h)
      })
      if (!changed) return
      change((page) => {
        for (const p of positions) {
          const item = gridOf(page, gridKey).find((i) => (i.blockId ?? i.tabGroupId) === p.key)
          if (item) Object.assign(item, { x: p.x, y: p.y, w: p.w, h: p.h })
        }
      })
    },

    addBlock(blockId, gridKey = 'page') {
      change((page) => gridOf(page, gridKey).push({ blockId, x: 0, y: BOTTOM, w: 12, h: 6 }))
    },

    removeBlock(blockId) {
      change((page) => {
        const found = findBlock(page, blockId)
        if (found) found.list.splice(found.index, 1)
        removeMappings(page, [blockId])
      })
    },

    moveBlock(blockId, gridKey) {
      change((page) => {
        const found = findBlock(page, blockId)
        if (!found || found.gridKey === gridKey) return
        const [placement] = found.list.splice(found.index, 1)
        gridOf(page, gridKey).push({ ...placement, x: 0, y: BOTTOM })
      })
    },

    addTabGroup(firstTabName) {
      change((page) =>
        page.layout.push({ tabGroupId: newId('tg'), x: 0, y: BOTTOM, w: 12, h: 8, tabs: [{ id: newId('t'), name: firstTabName, blocks: [] }] }),
      )
    },

    editTabGroup(tabGroupId, { op, tabId, name, offset }) {
      change((page) => {
        const index = page.layout.findIndex((i) => i.tabGroupId === tabGroupId)
        const group = page.layout[index]
        if (!group) return
        const tabIndex = group.tabs.findIndex((t) => t.id === tabId)
        if (op === 'add-tab') group.tabs.push({ id: newId('t'), name, blocks: [] })
        if (op === 'rename-tab' && tabIndex >= 0) group.tabs[tabIndex].name = name
        if (op === 'move-tab' && tabIndex >= 0) {
          const target = tabIndex + offset
          if (target >= 0 && target < group.tabs.length) [group.tabs[tabIndex], group.tabs[target]] = [group.tabs[target], group.tabs[tabIndex]]
        }
        if (op === 'remove-tab' && tabIndex >= 0 && group.tabs.length > 1) {
          // The tab's blocks move to the page grid instead of disappearing.
          for (const p of group.tabs[tabIndex].blocks) page.layout.push({ ...p, x: 0, y: BOTTOM })
          group.tabs.splice(tabIndex, 1)
        }
        if (op === 'remove-group') {
          for (const tab of group.tabs) for (const p of tab.blocks) page.layout.push({ ...p, x: 0, y: BOTTOM })
          page.layout.splice(index, 1)
        }
      })
    },

    setFilters(filters) {
      change((page) => {
        page.filters = filters
      })
    },

    setDetails(details) {
      change((page) => Object.assign(page, details))
    },
  }
}
