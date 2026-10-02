// Page filter types (overall.md 3, contracts.md → Filter operators / FilterMapping).
import { isDynamic, isEmptyValue } from '../core/conditions.js'

export const FILTER_TYPES = {
  text: {
    ops: ['contains', 'not contains'],
    fieldTypes: ['text'],
    defaultValue: () => ({ op: 'contains', value: '' }),
    isEmpty: (fv) => isEmptyValue(fv?.value),
    toCondition: (field, fv) => ({ field, op: fv.op, value: fv.value }),
  },
  number: {
    ops: ['between'],
    fieldTypes: ['number'],
    defaultValue: () => ({ op: 'between', value: [null, null] }),
    isEmpty: (fv) => !fv?.value || (isEmptyValue(fv.value[0]) && isEmptyValue(fv.value[1])),
    toCondition: (field, fv) => rangeCondition(field, fv.value),
  },
  date: {
    ops: ['between'],
    fieldTypes: ['date', 'datetime'],
    defaultValue: () => ({ op: 'between', value: [null, null] }),
    isEmpty: (fv) => !fv?.value || (!isDynamic(fv.value) && isEmptyValue(fv.value[0]) && isEmptyValue(fv.value[1])),
    toCondition: (field, fv) => (isDynamic(fv.value) ? { field, op: 'between', value: fv.value } : rangeCondition(field, fv.value)),
  },
  select: {
    ops: ['is', 'is not'],
    fieldTypes: ['text', 'number'],
    defaultValue: () => ({ op: 'is', value: [] }),
    isEmpty: (fv) => !fv?.value || (!isDynamic(fv.value) && fv.value.length === 0),
    toCondition: (field, fv) => ({ field, op: fv.op === 'is not' ? 'not in' : 'in', value: fv.value }),
  },
  boolean: {
    ops: ['is'],
    fieldTypes: ['boolean'],
    defaultValue: () => ({ op: 'is', value: null }),
    isEmpty: (fv) => fv?.value !== true && fv?.value !== false,
    toCondition: (field, fv) => ({ field, op: '=', value: fv.value }),
  },
}

function rangeCondition(field, [from, to]) {
  if (isEmptyValue(from)) return { field, op: '<=', value: to }
  if (isEmptyValue(to)) return { field, op: '>=', value: from }
  return { field, op: 'between', value: [from, to] }
}

export function isFilterValueEmpty(filter, fv) {
  return FILTER_TYPES[filter.type].isEmpty(fv)
}

// Translates the page filters' values into conditions for one block, through the
// filter mappings. Mappings to fields the block's source no longer has are skipped.
// `exceptFilterId` leaves one filter out (used for Select option narrowing).
export function conditionsForBlock({ filters, values, block, fields, exceptFilterId }) {
  if (!block?.source) return []
  const fieldsByName = new Map(fields.map((f) => [f.name, f]))
  const conditions = []
  for (const filter of filters) {
    if (filter.id === exceptFilterId) continue
    const fv = values[filter.id]
    if (!fv || isFilterValueEmpty(filter, fv)) continue
    for (const mapping of filter.mappings ?? []) {
      const field = fieldsByName.get(mapping.field)
      if (mapping.blockId !== block.id || !field) continue
      const condition = FILTER_TYPES[filter.type].toCondition(mapping.field, fv)
      // Select values from the URL are strings; number fields need numbers.
      if (filter.type === 'select' && field.type === 'number' && Array.isArray(condition.value)) condition.value = condition.value.map(Number)
      conditions.push(condition)
    }
  }
  return conditions
}

// Fields of a block's source that a filter type may map to.
export function mappableFields(filterType, fields) {
  return fields.filter((f) => FILTER_TYPES[filterType].fieldTypes.includes(f.type))
}
