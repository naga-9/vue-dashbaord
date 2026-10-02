// Table view state helpers (tableWidget.md → View state).

// Columns of the block config whose fields still exist in the source (missing ones are ignored).
export function usableColumns(config, fields) {
  const names = new Set(fields.map((f) => f.name))
  return (config?.columns ?? []).filter((c) => names.has(c.field))
}

export function defaultState(config, fields) {
  return {
    columns: usableColumns(config, fields).map((c) => ({ field: c.field })),
    sort: [],
    groupRowsBy: null,
    pageSize: config?.pageSize ?? 25,
  }
}

// Applies a (saved) state to the current config:
// - fields no longer in the config are skipped
// - configured columns missing from the state are added hidden (differs from Tabulator's default)
export function normalizeState(state, config, fields) {
  const columns = usableColumns(config, fields)
  if (!state) return defaultState(config, fields)
  const known = new Set(columns.map((c) => c.field))
  const stateColumns = (state.columns ?? [])
    .filter((c) => known.has(c.field))
    .map((c) => {
      // Column widths are not part of a view (overall.md 6).
      const out = { field: c.field }
      if (c.hidden) out.hidden = true
      return out
    })
  const inState = new Set(stateColumns.map((c) => c.field))
  for (const c of columns) if (!inState.has(c.field)) stateColumns.push({ field: c.field, hidden: true })

  return {
    columns: stateColumns,
    sort: (state.sort ?? []).filter((s) => known.has(s.field)).map(({ field, dir }) => ({ field, dir })),
    groupRowsBy: known.has(state.groupRowsBy) ? state.groupRowsBy : null,
    pageSize: state.pageSize || config?.pageSize || 25,
  }
}

// The group field goes first, so groups stay together across pages.
export function requestSort(state) {
  const { sort, groupRowsBy } = state
  if (!groupRowsBy) return sort
  const own = sort.find((s) => s.field === groupRowsBy)
  return [{ field: groupRowsBy, dir: own?.dir ?? 'asc' }, ...sort.filter((s) => s.field !== groupRowsBy)]
}
