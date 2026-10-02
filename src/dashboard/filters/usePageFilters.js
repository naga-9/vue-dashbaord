// Page filter state (overall.md 3): draft values, Apply, per-block conditions, Select options.
// Applied values live in the saved-filter content (so switching a saved filter applies it).
import { computed, reactive, ref, watch } from 'vue'
import { clone } from '../core/clone.js'
import { isDynamic } from '../core/conditions.js'
import { resolveConditions } from '../core/dynamicValues.js'
import { FILTER_TYPES, conditionsForBlock, isFilterValueEmpty } from './filterTypes.js'

// inputs: { getFilters(), getBlock(blockId), getFields(blockId), saved (useSavedFilters) }
export function usePageFilters(ctx, inputs) {
  const draft = ref({})
  const options = reactive({}) // filterId → { list, loading, error }
  const labels = reactive({}) // filterId → { value: label } for selected values
  let pruneTimer = null

  const applied = computed(() => inputs.saved.content.values ?? {})

  // Drops empty values so "changed" compares only real values.
  function cleanValues(values) {
    const out = {}
    for (const filter of inputs.getFilters()) {
      const fv = values[filter.id]
      if (fv && !isFilterValueEmpty(filter, fv)) out[filter.id] = clone(fv)
    }
    return out
  }

  const changedIds = computed(() => {
    const a = cleanValues(applied.value)
    const d = cleanValues(draft.value)
    return inputs.getFilters().filter((f) => JSON.stringify(a[f.id]) !== JSON.stringify(d[f.id])).map((f) => f.id)
  })

  function valueOf(filter) {
    return draft.value[filter.id] ?? FILTER_TYPES[filter.type].defaultValue()
  }

  function setValue(filterId, fv) {
    draft.value = { ...draft.value, [filterId]: fv }
  }

  function clear(filterId) {
    const next = { ...draft.value }
    delete next[filterId]
    draft.value = next
  }

  function apply() {
    inputs.saved.content = { values: cleanValues(draft.value) }
  }

  function resetDraft() {
    draft.value = clone(applied.value)
  }

  // Applied values changed (Apply, saved filter switched, URL) → draft follows.
  watch(applied, resetDraft, { immediate: true, deep: true })

  function conditionsFor(blockId, values = applied.value, exceptFilterId) {
    const block = inputs.getBlock(blockId)
    if (!block) return []
    return conditionsForBlock({ filters: inputs.getFilters(), values, block, fields: inputs.getFields(blockId), exceptFilterId })
  }

  const hasDynamicApplied = computed(() => Object.values(applied.value).some((fv) => isDynamic(fv?.value)))

  // ---- Select options: "what you can pick is what you can see" ----

  // One request per mapped block, with its fixed conditions and the other filters' current values.
  async function distinctRequests(filter, { search = '', extra = [] } = {}) {
    const requests = new Map()
    for (const mapping of filter.mappings ?? []) {
      const block = inputs.getBlock(mapping.blockId)
      const fields = inputs.getFields(mapping.blockId)
      if (!block?.source || !fields.some((f) => f.name === mapping.field)) continue
      const conditions = await resolveConditions(
        [...(block.fixedConditions ?? []), ...conditionsFor(mapping.blockId, draft.value, filter.id), ...extra.map((c) => ({ ...c, field: mapping.field }))],
        ctx.dynamicValues,
        ctx.resolveContext(draft.value),
      )
      const request = { source: block.source, field: mapping.field, conditions, search, limit: 100 }
      requests.set(JSON.stringify(request), request) // identical requests are sent once
    }
    return [...requests.values()]
  }

  async function fetchDistinct(filter, opts) {
    const requests = await distinctRequests(filter, opts)
    const results = await Promise.all(requests.map((r) => ctx.provider.getDistinctValues(r)))
    const merged = new Map()
    for (const list of results) for (const option of list) if (!merged.has(option.value)) merged.set(option.value, option)
    return [...merged.values()].sort((a, b) => a.label.localeCompare(b.label))
  }

  async function loadOptions(filter, search = '') {
    options[filter.id] ??= { list: [], loading: false, error: null }
    // Read it back through the reactive object, so changes below update the UI.
    const state = options[filter.id]
    if (filter.optionsFrom === 'custom') {
      state.list = filter.customOptions ?? []
      return
    }
    state.loading = true
    state.error = null
    try {
      const list = await fetchDistinct(filter, { search })
      state.list = list
      labels[filter.id] = { ...labels[filter.id], ...Object.fromEntries(list.map((o) => [o.value, o.label])) }
    } catch (e) {
      state.error = e
    } finally {
      state.loading = false
    }
  }

  // Selected values that no longer match the other filters are removed (checked with the provider).
  async function pruneSelections() {
    for (const filter of inputs.getFilters()) {
      if (filter.type !== 'select') continue
      const fv = draft.value[filter.id]
      if (!fv || isDynamic(fv.value) || !fv.value?.length) continue
      if (filter.optionsFrom === 'custom') {
        labels[filter.id] = Object.fromEntries((filter.customOptions ?? []).map((o) => [o.value, o.label]))
        continue
      }
      try {
        const found = await fetchDistinct(filter, { extra: [{ op: 'in', value: fv.value }] })
        labels[filter.id] = { ...labels[filter.id], ...Object.fromEntries(found.map((o) => [o.value, o.label])) }
        // "is not" values don't have to appear in the data.
        if (fv.op === 'is not') continue
        const keep = fv.value.filter((v) => found.some((o) => String(o.value) === String(v)))
        if (keep.length !== fv.value.length && JSON.stringify(draft.value[filter.id]) === JSON.stringify(fv)) {
          setValue(filter.id, { ...fv, value: keep })
        }
      } catch {
        // Options are a convenience; ignore errors here.
      }
    }
  }

  watch(
    draft,
    () => {
      clearTimeout(pruneTimer)
      pruneTimer = setTimeout(pruneSelections, 300)
    },
    { deep: true, immediate: true },
  )

  return reactive({
    draft,
    applied,
    changedIds,
    options,
    labels,
    hasDynamicApplied,
    valueOf,
    setValue,
    clear,
    apply,
    resetDraft,
    conditionsFor,
    loadOptions,
  })
}
