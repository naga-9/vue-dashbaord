// Conditions (contracts.md → Condition) and conditional-formatting rules (→ Rule).

export const CONDITION_OPS = [
  '=', '!=', '<', '<=', '>', '>=', 'in', 'not in', 'between', 'contains', 'not contains', 'is set', 'is not set',
]

// Operators that take no value / a list / a [from, to] range.
export const NO_VALUE_OPS = ['is set', 'is not set']
export const LIST_OPS = ['in', 'not in']
export const RANGE_OPS = ['between']

// Operators offered per source field type (fixed conditions, rule conditions).
export const OPS_BY_FIELD_TYPE = {
  text: ['=', '!=', 'in', 'not in', 'contains', 'not contains', 'is set', 'is not set'],
  number: ['=', '!=', '<', '<=', '>', '>=', 'between', 'is set', 'is not set'],
  date: ['=', '!=', '<', '<=', '>', '>=', 'between', 'is set', 'is not set'],
  datetime: ['<', '<=', '>', '>=', 'between', 'is set', 'is not set'],
  boolean: ['=', 'is set', 'is not set'],
}

export function isEmptyValue(value) {
  return value === null || value === undefined || value === ''
}

export function isDynamic(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && 'dynamic' in value
}

export function compareValues(a, b) {
  if (a === b) return 0
  if (isEmptyValue(a)) return -1
  if (isEmptyValue(b)) return 1
  return a < b ? -1 : 1
}

// Evaluates one resolved condition against a row (dynamic values must be resolved first).
export function matchCondition(row, { field, op, value }) {
  const actual = row[field]
  switch (op) {
    case '=': return actual === value
    case '!=': return actual !== value
    case '<': return compareValues(actual, value) < 0
    case '<=': return compareValues(actual, value) <= 0
    case '>': return compareValues(actual, value) > 0
    case '>=': return compareValues(actual, value) >= 0
    case 'in': return (value ?? []).includes(actual)
    case 'not in': return !(value ?? []).includes(actual)
    case 'between': {
      const [from, to] = value ?? []
      return (isEmptyValue(from) || compareValues(actual, from) >= 0) && (isEmptyValue(to) || compareValues(actual, to) <= 0)
    }
    case 'contains': return String(actual ?? '').toLowerCase().includes(String(value ?? '').toLowerCase())
    case 'not contains': return !String(actual ?? '').toLowerCase().includes(String(value ?? '').toLowerCase())
    case 'is set': return !isEmptyValue(actual)
    case 'is not set': return isEmptyValue(actual)
    default: throw new Error(`Unknown operator "${op}"`)
  }
}

// A rule matches a row when all its conditions match. Rules whose conditions use
// fields missing from the row are ignored (overall.md 4: missing fields are ignored).
export function matchRule(rule, row) {
  if (!rule?.when?.length) return false
  if (rule.when.some((c) => !(c.field in row))) return false
  return rule.when.every((c) => matchCondition(row, c))
}

// Default value for a new condition, by operator.
export function defaultValueFor(op) {
  if (NO_VALUE_OPS.includes(op)) return null
  if (LIST_OPS.includes(op)) return []
  if (RANGE_OPS.includes(op)) return [null, null]
  return ''
}
