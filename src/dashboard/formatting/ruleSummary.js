// One-line summary of a formatting rule, e.g. "Amount ≥ 15,000 → Amount cell".
import { isDynamic } from '../core/conditions.js'

function valueText(value, ctx) {
  if (value === null || value === undefined) return ''
  if (isDynamic(value)) {
    const def = ctx.dynamicValues.get(value.dynamic)
    const key = `dynamic.${value.dynamic}`
    return ctx.t(key) === key ? (def?.label ?? value.dynamic) : ctx.t(key)
  }
  if (Array.isArray(value)) return value.filter((v) => v !== null && v !== '').join(' – ')
  if (typeof value === 'boolean') return ctx.t(value ? 'common.yes' : 'common.no')
  if (typeof value === 'number') return new Intl.NumberFormat(ctx.formatEnv().locale).format(value)
  return String(value)
}

export function conditionSummary(condition, fields, ctx) {
  const field = fields.find((f) => f.name === condition.field)?.label ?? condition.field
  return [field, ctx.t(`op.${condition.op}`), valueText(condition.value, ctx)].filter(Boolean).join(' ')
}

export function ruleSummary(rule, fields, ctx) {
  const when = (rule.when ?? []).map((c) => conditionSummary(c, fields, ctx)).join(` ${ctx.t('rules.and')} `) || ctx.t('rules.always')
  const target =
    rule.target === 'cell'
      ? ctx.t('rules.cellOf', { field: fields.find((f) => f.name === rule.field)?.label ?? rule.field })
      : ctx.t(`target.${rule.target}`).toLowerCase()
  return `${when} → ${target}`
}
