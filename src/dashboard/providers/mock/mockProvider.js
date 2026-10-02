// Mock data provider for tests and demos (contracts.md → Data provider).
// Sample sources + items, kept in memory (or in localStorage with `persistKey`, so two
// browser tabs see each other's saves, e.g. to try save conflicts).
//
// createMockProvider({ userId: 'u_demo' | 'u_asha' | 'u_viewer', delay, persistKey, seed })
import { clone } from '../../core/clone.js'
import { ProviderError } from '../errors.js'
import { compareValues, isDynamic, matchCondition } from '../../core/conditions.js'
import { sources as sampleSources, users, seedItems } from './sampleData.js'

const COLLECTIONS = ['pages', 'blocks', 'savedViews', 'savedFilters']
// Fields set by the backend, never taken from the frontend.
const BACKEND_FIELDS = ['id', 'owner', 'ownerName', 'isMine', 'modified', 'modifiedBy', 'canEdit', 'canDelete', 'isFavourite', 'isMyDefault', 'isPublicDefault']

// ---- data requests ----

const aggregateFns = {
  count: (values) => values.length,
  sum: (values) => values.reduce((total, v) => total + (Number(v) || 0), 0),
  avg: (values) => (values.length ? aggregateFns.sum(values) / values.length : null),
  min: (values) => values.reduce((min, v) => (min === null || compareValues(v, min) < 0 ? v : min), null),
  max: (values) => values.reduce((max, v) => (max === null || compareValues(v, max) > 0 ? v : max), null),
}

function aggregate(rows, groupBy, aggregates) {
  const groups = new Map()
  for (const row of rows) {
    const key = JSON.stringify(groupBy.map((field) => row[field]))
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return [...groups.values()].map((groupRows) => {
    const result = {}
    for (const field of groupBy) result[field] = groupRows[0][field]
    for (const { field, fn, as } of aggregates) {
      const values = field ? groupRows.map((row) => row[field]) : groupRows
      result[as ?? `${fn}_${field ?? 'rows'}`] = aggregateFns[fn](values)
    }
    return result
  })
}

function sortRows(rows, sort) {
  return [...rows].sort((a, b) => {
    for (const { field, dir } of sort) {
      const result = compareValues(a[field], b[field])
      if (result !== 0) return dir === 'desc' ? -result : result
    }
    return 0
  })
}

// Simulated network delay that can be aborted like a real fetch.
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

function permissionsFor(user) {
  const flags = user.permissions === 'all' ? { canCreate: true, canPublish: true } : { canCreate: false, canPublish: false }
  return { pages: { ...flags }, blocks: { ...flags }, savedViews: { ...flags }, savedFilters: { ...flags } }
}

function emptyState() {
  return { pages: [], blocks: [], savedViews: [], savedFilters: [], favourites: {}, myDefaults: {}, versions: {}, seq: 1 }
}

// ---- provider ----

export function createMockProvider({ userId = 'u_demo', delay = 250, persistKey = null, seed = true, sources = sampleSources } = {}) {
  const user = users[userId]
  if (!user) throw new Error(`Unknown mock user "${userId}"`)
  const permissions = permissionsFor(user)
  let memory = null

  // ---- storage ----

  function now() {
    return new Date().toISOString()
  }

  function seeded() {
    const state = emptyState()
    if (!seed) return state
    const items = seedItems()
    const stamp = now()
    for (const name of COLLECTIONS) {
      state[name] = items[name].map((item) => ({ ...item, modified: stamp, modifiedBy: users[item.owner].name }))
    }
    for (const kind of ['page', 'block']) {
      for (const item of state[`${kind}s`]) {
        state.versions[`${kind}:${item.id}`] = [{ versionId: `v_${state.seq++}`, modified: stamp, modifiedBy: item.modifiedBy, snapshot: clone(item) }]
      }
    }
    return state
  }

  function load() {
    if (!persistKey) return (memory ??= seeded())
    try {
      const saved = localStorage.getItem(persistKey)
      if (saved) return JSON.parse(saved)
    } catch {
      // fall through to a fresh state
    }
    const state = seeded()
    save(state)
    return state
  }

  function save(state) {
    if (!persistKey) {
      memory = state
      return
    }
    localStorage.setItem(persistKey, JSON.stringify(state))
  }

  // Runs a change against the latest state and saves it.
  function change(fn) {
    const state = load()
    const result = fn(state)
    save(state)
    return result
  }

  // ---- items ----

  const isVisible = (item) => item.visibility === 'public' || item.owner === user.id
  const canEdit = (item) => item.owner === user.id || user.admin

  function decorate(item, state, kind) {
    const out = {
      ...clone(item),
      ownerName: users[item.owner]?.name ?? item.owner,
      isMine: item.owner === user.id,
      canEdit: canEdit(item),
      canDelete: canEdit(item),
    }
    if (kind === 'page') out.isFavourite = (state.favourites[user.id] ?? []).includes(item.id)
    if (kind === 'savedView') out.isMyDefault = state.myDefaults[`${user.id}|view|${item.blockId}`] === item.id
    if (kind === 'savedFilter') out.isMyDefault = state.myDefaults[`${user.id}|filter|${item.pageId}`] === item.id
    if (kind === 'savedView' || kind === 'savedFilter') out.isPublicDefault = Boolean(item.isPublicDefault) && item.visibility === 'public'
    return out
  }

  function findVisible(state, collection, id) {
    const item = state[collection].find((i) => i.id === id)
    if (!item || !isVisible(item)) throw new ProviderError('not_found', 'This item no longer exists.')
    return item
  }

  function clean(data) {
    const out = clone(data)
    for (const key of BACKEND_FIELDS) delete out[key]
    return out
  }

  function addVersion(state, kind, item) {
    const key = `${kind}:${item.id}`
    state.versions[key] ??= []
    state.versions[key].unshift({ versionId: `v_${state.seq++}`, modified: item.modified, modifiedBy: item.modifiedBy, snapshot: clone(item) })
  }

  function makeCrud(kind, collection, permissionType, prefix) {
    return {
      async list(filterFn = () => true) {
        await wait(delay)
        const state = load()
        return state[collection].filter((i) => isVisible(i) && filterFn(i)).map((i) => decorate(i, state, kind))
      },
      async get(id) {
        await wait(delay)
        const state = load()
        return decorate(findVisible(state, collection, id), state, kind)
      },
      async create(data) {
        await wait(delay)
        if (!permissions[permissionType].canCreate) throw new ProviderError('forbidden', 'You may not create this.')
        if (data.visibility === 'public' && !permissions[permissionType].canPublish) throw new ProviderError('forbidden', 'You may not publish this.')
        return change((state) => {
          const item = { ...clean(data), id: `${prefix}_${state.seq++}`, owner: user.id, modified: now(), modifiedBy: user.name }
          state[collection].push(item)
          if (kind === 'page' || kind === 'block') addVersion(state, kind, item)
          return decorate(item, state, kind)
        })
      },
      async update(data) {
        await wait(delay)
        return change((state) => {
          const index = state[collection].findIndex((i) => i.id === data.id)
          const current = state[collection][index]
          if (!current || !isVisible(current)) throw new ProviderError('not_found', 'This item no longer exists.')
          if (!canEdit(current)) throw new ProviderError('forbidden', 'You may not edit this.')
          if (current.modified !== data.modified) {
            throw new ProviderError('conflict', 'Changed by someone else.', { modified: current.modified, modifiedBy: current.modifiedBy })
          }
          if (data.visibility === 'public' && current.visibility !== 'public' && !permissions[permissionType].canPublish) {
            throw new ProviderError('forbidden', 'You may not publish this.')
          }
          const item = { ...current, ...clean(data), id: current.id, owner: current.owner, modified: now(), modifiedBy: user.name }
          // A view/filter made private stops being the public default.
          if (item.visibility !== 'public') item.isPublicDefault = false
          else item.isPublicDefault = current.isPublicDefault
          state[collection][index] = item
          if (kind === 'page' || kind === 'block') addVersion(state, kind, item)
          return decorate(item, state, kind)
        })
      },
      async remove(id, cascade = () => {}) {
        await wait(delay)
        change((state) => {
          const item = findVisible(state, collection, id)
          if (!canEdit(item)) throw new ProviderError('forbidden', 'You may not delete this.')
          state[collection] = state[collection].filter((i) => i.id !== id)
          cascade(state, item)
        })
      },
    }
  }

  const pages = makeCrud('page', 'pages', 'pages', 'pg')
  const blocks = makeCrud('block', 'blocks', 'blocks', 'blk')
  const views = makeCrud('savedView', 'savedViews', 'savedViews', 'sv')
  const filters = makeCrud('savedFilter', 'savedFilters', 'savedFilters', 'sf')

  function blockIdsOf(page) {
    return page.layout.flatMap((item) => (item.tabGroupId ? item.tabs.flatMap((tab) => tab.blocks.map((b) => b.blockId)) : [item.blockId]))
  }

  async function setPublicDefault(collection, ownerField, ownerId, itemId, permissionType) {
    await wait(delay)
    if (!permissions[permissionType].canPublish) throw new ProviderError('forbidden', 'You may not set the public default.')
    change((state) => {
      if (itemId) {
        const item = findVisible(state, collection, itemId)
        if (item.visibility !== 'public') throw new ProviderError('forbidden', 'Only a public item can be the public default.')
      }
      for (const item of state[collection]) {
        if (item[ownerField] === ownerId) item.isPublicDefault = item.id === itemId
      }
    })
  }

  async function setMyDefault(kind, ownerId, itemId) {
    await wait(delay)
    change((state) => {
      const key = `${user.id}|${kind}|${ownerId}`
      if (itemId) state.myDefaults[key] = itemId
      else delete state.myDefaults[key]
    })
  }

  function getSource(id) {
    const source = sources.find((s) => s.id === id)
    if (!source) throw new ProviderError('not_found', `Unknown source "${id}"`)
    return source
  }

  function filterRows(source, conditions) {
    const names = new Set(source.fields.map((f) => f.name))
    for (const condition of conditions) {
      if (!names.has(condition.field)) throw new ProviderError('bad_request', `Unknown field "${condition.field}" in ${source.label}`)
      if (isDynamic(condition.value)) throw new ProviderError('bad_request', 'Dynamic values must be resolved before calling the provider')
    }
    return source.rows.filter((row) => conditions.every((c) => matchCondition(row, c)))
  }

  return {
    // ---- current user ----
    async getCurrentUser() {
      await wait(delay)
      return { id: user.id, name: user.name, permissions: clone(permissions), attributes: {} }
    },

    // ---- pages ----
    listPages: () => pages.list(),
    getPage: (id) => pages.get(id),
    createPage: (data) => pages.create(data),
    updatePage: (item) => pages.update(item),
    deletePage: (id) =>
      pages.remove(id, (state) => {
        state.savedFilters = state.savedFilters.filter((f) => f.pageId !== id)
        for (const list of Object.values(state.favourites)) list.splice(0, list.length, ...list.filter((p) => p !== id))
      }),
    async setFavourite(pageId, isFavourite) {
      await wait(delay)
      change((state) => {
        const list = (state.favourites[user.id] ??= [])
        const without = list.filter((p) => p !== pageId)
        state.favourites[user.id] = isFavourite ? [...without, pageId] : without
      })
    },

    // ---- blocks ----
    listBlocks: () => blocks.list(),
    async getBlocks(ids) {
      await wait(delay)
      const state = load()
      return state.blocks.filter((b) => ids.includes(b.id) && isVisible(b)).map((b) => decorate(b, state, 'block'))
    },
    createBlock: (data) => blocks.create(data),
    updateBlock: (item) => blocks.update(item),
    deleteBlock: (id) =>
      blocks.remove(id, (state) => {
        state.savedViews = state.savedViews.filter((v) => v.blockId !== id)
      }),
    async getBlockUsage(id) {
      await wait(delay)
      return { pageCount: load().pages.filter((p) => blockIdsOf(p).includes(id)).length }
    },

    // ---- saved views ----
    listSavedViews: (blockId) => views.list((v) => v.blockId === blockId),
    createSavedView: (data) => views.create(data),
    updateSavedView: (item) => views.update(item),
    deleteSavedView: (id) => views.remove(id),
    setPublicDefaultView: (blockId, viewId) => setPublicDefault('savedViews', 'blockId', blockId, viewId, 'savedViews'),
    setMyDefaultView: (blockId, viewId) => setMyDefault('view', blockId, viewId),

    // ---- saved filters ----
    listSavedFilters: (pageId) => filters.list((f) => f.pageId === pageId),
    createSavedFilter: (data) => filters.create(data),
    updateSavedFilter: (item) => filters.update(item),
    deleteSavedFilter: (id) => filters.remove(id),
    setPublicDefaultFilter: (pageId, filterId) => setPublicDefault('savedFilters', 'pageId', pageId, filterId, 'savedFilters'),
    setMyDefaultFilter: (pageId, filterId) => setMyDefault('filter', pageId, filterId),

    // ---- version history ----
    async listVersions(kind, id) {
      await wait(delay)
      const state = load()
      findVisible(state, `${kind}s`, id)
      return (state.versions[`${kind}:${id}`] ?? []).map(({ versionId, modified, modifiedBy }) => ({ versionId, modified, modifiedBy }))
    },
    async getVersion(kind, id, versionId) {
      await wait(delay)
      const state = load()
      findVisible(state, `${kind}s`, id)
      const version = (state.versions[`${kind}:${id}`] ?? []).find((v) => v.versionId === versionId)
      if (!version) throw new ProviderError('not_found', 'Version not found.')
      return decorate(version.snapshot, state, kind)
    },
    async restoreVersion(kind, id, versionId) {
      await wait(delay)
      return change((state) => {
        const collection = `${kind}s`
        const index = state[collection].findIndex((i) => i.id === id)
        const current = state[collection][index]
        if (!current || !isVisible(current)) throw new ProviderError('not_found', 'This item no longer exists.')
        if (!canEdit(current)) throw new ProviderError('forbidden', 'You may not edit this.')
        const version = (state.versions[`${kind}:${id}`] ?? []).find((v) => v.versionId === versionId)
        if (!version) throw new ProviderError('not_found', 'Version not found.')
        const item = { ...clone(version.snapshot), id, owner: current.owner, modified: now(), modifiedBy: user.name }
        state[collection][index] = item
        addVersion(state, kind, item)
        return decorate(item, state, kind)
      })
    },

    // ---- data sources ----
    async listSources() {
      await wait(delay)
      return sources.map(({ id, label }) => ({ id, label }))
    },
    async getSourceFields(sourceId) {
      await wait(delay)
      return getSource(sourceId).fields.map(({ name, label, type }) => ({ name, label, type }))
    },

    // ---- data ----
    async getData(request, { signal } = {}) {
      await wait(delay, signal)
      const source = getSource(request.source)
      const { conditions = [], sort = [], groupBy, aggregates, offset = 0, limit } = request
      let rows = filterRows(source, conditions)
      const aggregated = Boolean(groupBy?.length || aggregates?.length)

      if (aggregated) rows = aggregate(rows, groupBy ?? [], aggregates ?? [])
      // Sort before picking fields, so sorting by a field that isn't requested still works.
      rows = sortRows(rows, sort)
      const total = rows.length
      rows = rows.slice(offset, limit === undefined ? undefined : offset + limit)

      if (request.fields && !aggregated) {
        const names = new Set(source.fields.map((f) => f.name))
        const fields = ['id', ...request.fields.filter((f) => f !== 'id' && names.has(f))]
        rows = rows.map((row) => Object.fromEntries(fields.map((f) => [f, row[f]])))
      }
      return { rows: clone(rows), total }
    },

    async getDistinctValues({ source: sourceId, field, conditions = [], search = '', limit = 100 }, { signal } = {}) {
      await wait(delay, signal)
      const source = getSource(sourceId)
      const fieldDef = source.fields.find((f) => f.name === field)
      if (!fieldDef) throw new ProviderError('bad_request', `Unknown field "${field}" in ${source.label}`)
      const term = search.toLowerCase()
      const seen = new Map()
      for (const row of filterRows(source, conditions)) {
        const value = row[field]
        if (value === null || value === undefined || seen.has(value)) continue
        const label = fieldDef.labels?.[value] ?? String(value)
        if (term && !label.toLowerCase().includes(term) && !String(value).toLowerCase().includes(term)) continue
        seen.set(value, { value, label })
      }
      return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(0, limit)
    },

    // Not part of the contract: lets the demo app reset the sample data.
    reset() {
      memory = null
      if (persistKey) localStorage.removeItem(persistKey)
    },
  }
}
