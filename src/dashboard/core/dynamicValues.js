// Dynamic values (overall.md 3): stored by key, resolved just before each data request.
// Definition: { key, label, type, resolve(context) → value }, type = a filter type.
// Date dynamic values resolve to a [from, to] range of ISO dates.
import { isDynamic } from './conditions.js'

// ---- date helpers (all dates are 'YYYY-MM-DD' strings, computed in the user's timezone) ----

export function todayIn(timezone) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function toDate(iso) {
  return new Date(`${iso}T00:00:00Z`)
}

function toIso(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(iso, days) {
  const d = toDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toIso(d)
}

function weekRange(iso, offset) {
  const d = toDate(iso)
  const monday = addDays(iso, -((d.getUTCDay() + 6) % 7) + offset * 7)
  return [monday, addDays(monday, 6)]
}

function monthRange(iso, offset) {
  const d = toDate(iso)
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset + 1, 0))
  return [toIso(start), toIso(end)]
}

function quarterRange(iso, offset) {
  const d = toDate(iso)
  const firstMonth = Math.floor(d.getUTCMonth() / 3) * 3 + offset * 3
  const start = new Date(Date.UTC(d.getUTCFullYear(), firstMonth, 1))
  const end = new Date(Date.UTC(d.getUTCFullYear(), firstMonth + 3, 0))
  return [toIso(start), toIso(end)]
}

function yearRange(iso, offset) {
  const year = toDate(iso).getUTCFullYear() + offset
  return [`${year}-01-01`, `${year}-12-31`]
}

function dateValue(key, label, range) {
  return { key, label, type: 'date', resolve: (ctx) => range(todayIn(ctx.timezone)) }
}

const builtIns = [
  dateValue('today', 'Today', (t) => [t, t]),
  dateValue('yesterday', 'Yesterday', (t) => [addDays(t, -1), addDays(t, -1)]),
  dateValue('tomorrow', 'Tomorrow', (t) => [addDays(t, 1), addDays(t, 1)]),
  dateValue('this_week', 'This week', (t) => weekRange(t, 0)),
  dateValue('last_week', 'Last week', (t) => weekRange(t, -1)),
  dateValue('next_week', 'Next week', (t) => weekRange(t, 1)),
  dateValue('this_month', 'This month', (t) => monthRange(t, 0)),
  dateValue('last_month', 'Last month', (t) => monthRange(t, -1)),
  dateValue('next_month', 'Next month', (t) => monthRange(t, 1)),
  dateValue('this_quarter', 'This quarter', (t) => quarterRange(t, 0)),
  dateValue('last_quarter', 'Last quarter', (t) => quarterRange(t, -1)),
  dateValue('next_quarter', 'Next quarter', (t) => quarterRange(t, 1)),
  dateValue('this_year', 'This year', (t) => yearRange(t, 0)),
  dateValue('last_year', 'Last year', (t) => yearRange(t, -1)),
  dateValue('next_year', 'Next year', (t) => yearRange(t, 1)),
  ...[7, 30, 90].map((n) => dateValue(`last_${n}_days`, `Last ${n} days`, (t) => [addDays(t, -(n - 1)), t])),
  ...[7, 30, 90].map((n) => dateValue(`next_${n}_days`, `Next ${n} days`, (t) => [t, addDays(t, n - 1)])),
  dateValue('year_to_date', 'Year to date', (t) => [`${t.slice(0, 4)}-01-01`, t]),
  { key: 'current_user', label: 'Current user', type: 'select', resolve: (ctx) => ctx.user?.id },
]

export function createDynamicValueRegistry(extra = []) {
  const registry = new Map()
  for (const def of [...builtIns, ...extra]) registry.set(def.key, def)
  return {
    register(def) {
      registry.set(def.key, def)
    },
    get(key) {
      return registry.get(key)
    },
    // Dynamic values offered for a filter type (date filters get date values, …).
    forType(type) {
      return [...registry.values()].filter((def) => def.type === type)
    },
    all() {
      return [...registry.values()]
    },
  }
}

// Adapts a resolved dynamic value to the condition's operator.
function adapt(def, op, resolved) {
  if (def.type === 'date' && Array.isArray(resolved)) {
    const [from, to] = resolved
    if (op === 'between' || op === '=') return { op: 'between', value: [from, to] }
    if (op === '>' || op === '>=') return { op, value: from }
    if (op === '<' || op === '<=') return { op, value: to }
    return { op, value: from }
  }
  if (op === 'in' || op === 'not in') return { op, value: Array.isArray(resolved) ? resolved : [resolved] }
  return { op, value: resolved }
}

// Resolves every dynamic value in a list of conditions. Throws if a key is unknown or resolve fails.
export async function resolveConditions(conditions, registry, context) {
  return Promise.all(
    conditions.map(async (condition) => {
      if (!isDynamic(condition.value)) return condition
      const def = registry.get(condition.value.dynamic)
      if (!def) throw new Error(`Unknown dynamic value "${condition.value.dynamic}"`)
      const resolved = await def.resolve(context)
      return { ...condition, ...adapt(def, condition.op, resolved) }
    }),
  )
}

export async function resolveRules(rules, registry, context) {
  return Promise.all(rules.map(async (rule) => ({ ...rule, when: await resolveConditions(rule.when ?? [], registry, context) })))
}
