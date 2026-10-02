// Filter values ⇄ URL form (overall.md 3 → Filter values in the URL).
// URL form: { <filterId>: string | string[] }, which the host copies to/from its query string.
//   multiple values: repeated keys · exclude: "!" prefix · ranges: "from..to" · dynamic: "@key"
import { isDynamic } from '../core/conditions.js'
import { FILTER_TYPES, isFilterValueEmpty } from './filterTypes.js'

function range([from, to]) {
  return `${from ?? ''}..${to ?? ''}`
}

function parseRange(text, toValue) {
  const [from, to] = text.split('..')
  return [from === '' || from === undefined ? null : toValue(from), to === '' || to === undefined ? null : toValue(to)]
}

export function filterValuesToUrl(filters, values) {
  const query = {}
  for (const filter of filters) {
    const fv = values[filter.id]
    if (!fv || isFilterValueEmpty(filter, fv)) continue
    if (isDynamic(fv.value)) {
      query[filter.id] = `${fv.op === 'is not' ? '!' : ''}@${fv.value.dynamic}`
      continue
    }
    switch (filter.type) {
      case 'text':
        query[filter.id] = `${fv.op === 'not contains' ? '!' : ''}${fv.value}`
        break
      case 'number':
      case 'date':
        query[filter.id] = range(fv.value)
        break
      case 'select': {
        const prefix = fv.op === 'is not' ? '!' : ''
        const list = fv.value.map((v) => `${prefix}${v}`)
        query[filter.id] = list.length === 1 ? list[0] : list
        break
      }
      case 'boolean':
        query[filter.id] = String(fv.value)
        break
    }
  }
  return query
}

export function filterValuesFromUrl(filters, query) {
  const values = {}
  for (const filter of filters) {
    const raw = query?.[filter.id]
    if (raw === undefined || raw === null) continue
    const list = Array.isArray(raw) ? raw.map(String) : [String(raw)]
    if (!list.length) continue
    const exclude = list.every((v) => v.startsWith('!'))
    const items = list.map((v) => (exclude ? v.slice(1) : v))

    if (items[0].startsWith('@')) {
      const dynamic = { dynamic: items[0].slice(1) }
      values[filter.id] = { op: filter.type === 'select' ? (exclude ? 'is not' : 'is') : FILTER_TYPES[filter.type].ops[0], value: dynamic }
      continue
    }
    switch (filter.type) {
      case 'text':
        values[filter.id] = { op: exclude ? 'not contains' : 'contains', value: items[0] }
        break
      case 'number':
        values[filter.id] = { op: 'between', value: parseRange(items[0], Number) }
        break
      case 'date':
        values[filter.id] = { op: 'between', value: parseRange(items[0], String) }
        break
      case 'select':
        values[filter.id] = { op: exclude ? 'is not' : 'is', value: items }
        break
      case 'boolean':
        values[filter.id] = { op: 'is', value: items[0] === 'true' }
        break
    }
  }
  return values
}
