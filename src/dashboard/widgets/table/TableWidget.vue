<script setup>
// Table widget (tableWidget.md), built on Tabulator with remote paging and sorting.
// `state` (the view) is read-only here. Sorting, moving or resizing columns in the table itself
// is temporary: Tabulator keeps it, nothing is emitted, and it is dropped when `state` changes.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import 'tabulator-tables/dist/css/tabulator_simple.min.css'
import { useDashboard } from '../../core/plugin.js'
import { formatValue, defaultFormatFor } from '../../core/format.js'
import { matchRule } from '../../core/conditions.js'
import { normalizeState, requestSort, usableColumns } from './tableState.js'

const props = defineProps({
  config: { type: Object, required: true },
  formatting: { type: Array, default: () => [] },
  fields: { type: Array, default: () => [] },
  fetchData: { type: Function, default: undefined },
  reloadKey: { type: Number, default: 0 },
  state: { type: Object, default: null },
})
const emit = defineEmits(['open-record'])

const ctx = useDashboard()
const el = ref(null)
let table = null
let built = false
let resizeObserver = null
let rebuildTimer = null
let redrawTimer = null

const columns = computed(() => usableColumns(props.config, props.fields))
const view = computed(() => normalizeState(props.state, props.config, props.fields))
const STYLE_CLASSES = ['db-fmt-danger', 'db-fmt-warning', 'db-fmt-success', 'db-fmt-muted']

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// Last matching rule wins (view rules come after block rules).
function styleFor(row, target, field) {
  let style = null
  for (const rule of props.formatting) {
    if (rule.target !== target || (target === 'cell' && rule.field !== field)) continue
    if (matchRule(rule, row)) style = rule.style
  }
  return style
}

function applyStyle(element, style) {
  element.classList.remove(...STYLE_CLASSES)
  if (style) element.classList.add(`db-fmt-${style}`)
}

function formatOptions(column) {
  const field = props.fields.find((f) => f.name === column.field)
  return { format: column.format ?? defaultFormatFor(field?.type), decimals: column.decimals, currency: column.currency }
}

function labelOf(column) {
  return column.label || props.fields.find((f) => f.name === column.field)?.label || column.field
}

function columnDefs() {
  const env = ctx.formatEnv()
  return view.value.columns.map((viewColumn) => {
    const column = columns.value.find((c) => c.field === viewColumn.field)
    const options = formatOptions(column)
    const numeric = ['number', 'currency', 'percent'].includes(options.format)
    return {
      field: column.field,
      title: labelOf(column),
      visible: !viewColumn.hidden,
      hozAlign: numeric ? 'right' : 'left',
      headerHozAlign: numeric ? 'right' : 'left',
      formatter(cell) {
        applyStyle(cell.getElement(), styleFor(cell.getRow().getData(), 'cell', column.field))
        return escapeHtml(formatValue(cell.getValue(), options, env))
      },
    }
  })
}

async function requestData(url, config, params) {
  if (!props.fetchData) return { last_page: 1, data: [] }
  // Tabulator's own sort: the view's sort, or a temporary one clicked in the header.
  const sort = (params.sort ?? []).map(({ field, dir }) => ({ field, dir }))
  const size = params.size || view.value.pageSize
  try {
    const result = await props.fetchData({
      fields: columns.value.map((c) => c.field),
      sort: requestSort({ sort, groupRowsBy: view.value.groupRowsBy }),
      offset: ((params.page || 1) - 1) * size,
      limit: size,
    })
    const total = result.total ?? result.rows.length
    return { last_page: Math.max(1, Math.ceil(total / size)), last_row: total, data: result.rows }
  } catch {
    // The block shows the error state; a superseded request is ignored by Tabulator.
    return { last_page: 1, data: [] }
  }
}

function build() {
  destroy()
  if (!el.value || !columns.value.length) return
  const state = view.value
  table = new Tabulator(el.value, {
    height: '100%',
    layout: 'fitDataStretch',
    columns: columnDefs(),
    columnDefaults: { resizable: true, headerSort: true },
    movableColumns: true,
    placeholder: '',
    ajaxURL: 'dashboard://data',
    ajaxRequestFunc: requestData,
    pagination: true,
    paginationMode: 'remote',
    paginationSize: state.pageSize,
    paginationSizeSelector: [10, 25, 50, 100],
    paginationCounter: 'rows',
    sortMode: 'remote',
    initialSort: state.sort.map((s) => ({ column: s.field, dir: s.dir })),
    groupBy: state.groupRowsBy || false,
    rowFormatter(row) {
      applyStyle(row.getElement(), styleFor(row.getData(), 'row'))
    },
  })
  table.on('tableBuilt', () => {
    built = true
  })
  table.on('rowClick', (event, row) => {
    const id = row.getData().id
    if (id !== undefined) emit('open-record', { id })
  })
}

function destroy() {
  if (table) table.destroy()
  table = null
  built = false
}

function scheduleRebuild() {
  clearTimeout(rebuildTimer)
  rebuildTimer = setTimeout(build, 120)
}

// A different view (switched, or changed in the side panel) or block config → rebuild,
// which also drops temporary changes made in the table.
watch(
  () => JSON.stringify([view.value, props.config, props.fields]),
  scheduleRebuild,
)
// New rules only need the rows re-rendered, not new data.
watch(
  () => props.formatting,
  () => {
    if (built) table.getRows().forEach((row) => row.reformat())
  },
  { deep: true },
)
watch(
  () => props.reloadKey,
  () => {
    if (built) table.setData()
  },
)

onMounted(() => {
  build()
  resizeObserver = new ResizeObserver(() => {
    clearTimeout(redrawTimer)
    redrawTimer = setTimeout(() => built && table?.redraw(), 50)
  })
  resizeObserver.observe(el.value)
})
onBeforeUnmount(() => {
  clearTimeout(rebuildTimer)
  clearTimeout(redrawTimer)
  resizeObserver?.disconnect()
  destroy()
})

defineExpose({
  runAction() {},
  // What the user sees, including temporary changes made in the table (contracts.md → Export).
  getExportData() {
    const shown = built
      ? table
          .getColumns()
          .filter((c) => c.getField() && c.isVisible())
          .map((c) => c.getField())
      : view.value.columns.filter((c) => !c.hidden).map((c) => c.field)
    const sort = built ? table.getSorters().map((s) => ({ field: s.field, dir: s.dir })) : view.value.sort
    return {
      columns: shown.map((field) => {
        const column = columns.value.find((c) => c.field === field)
        return { field, label: labelOf(column), ...formatOptions(column) }
      }),
      query: { fields: shown, sort: requestSort({ sort, groupRowsBy: view.value.groupRowsBy }) },
    }
  },
})
</script>

<template>
  <div class="db-table">
    <div ref="el" class="db-table__grid" />
    <p v-if="!columns.length" class="db-table__note">{{ $dbt('table.noColumns') }}</p>
  </div>
</template>
