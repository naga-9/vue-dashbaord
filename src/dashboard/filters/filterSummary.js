// One-line text of a filter's value for its field box, e.g. "ITEM-A, ITEM-B +23" or "Next month".
// Returns null when the filter has no value ("Any").
import { isDynamic } from '../core/conditions.js'
import { formatDateRange, formatValue } from '../core/format.js'
import { isFilterValueEmpty } from './filterTypes.js'

export function dynamicLabel(ctx, key) {
  const msg = `dynamic.${key}`
  return ctx.t(msg) === msg ? (ctx.dynamicValues.get(key)?.label ?? key) : ctx.t(msg)
}

export function filterSummary(filter, fv, ctx, labels = {}) {
  if (!fv || isFilterValueEmpty(filter, fv)) return null
  const env = ctx.formatEnv()
  const not = fv.op === 'is not' || fv.op === 'not contains' ? `${ctx.t('filters.not')} ` : ''
  if (isDynamic(fv.value)) return not + dynamicLabel(ctx, fv.value.dynamic)

  switch (filter.type) {
    case 'select': {
      const names = fv.value.map((v) => labels[v] ?? String(v))
      const shown = names.slice(0, 2).join(', ')
      return not + (names.length > 2 ? `${shown} +${names.length - 2}` : shown)
    }
    case 'text':
      return `${not}“${fv.value}”`
    case 'date': {
      const [from, to] = fv.value
      if (from && to) return formatDateRange([from, to], env)
      return from ? `≥ ${formatValue(from, { format: 'date' }, env)}` : `≤ ${formatValue(to, { format: 'date' }, env)}`
    }
    case 'number': {
      const [from, to] = fv.value
      const n = (v) => formatValue(v, { format: 'number' }, env)
      if (from !== null && to !== null) return `${n(from)} – ${n(to)}`
      return from !== null ? `≥ ${n(from)}` : `≤ ${n(to)}`
    }
    case 'boolean':
      return ctx.t(fv.value ? 'common.yes' : 'common.no')
    default:
      return String(fv.value)
  }
}
