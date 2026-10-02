<script setup>
// The table's section of the block's side panel (contracts.md → View settings):
// columns (show/hide, reorder), sort levels, group by, rows per page. Changes apply live.
import { computed } from 'vue'
import { clone } from '../../core/clone.js'
import DbIcon from '../../ui/DbIcon.js'
import ReorderList from '../../ui/ReorderList.vue'
import { usableColumns } from './tableState.js'

const props = defineProps({
  state: { type: Object, required: true },
  config: { type: Object, required: true },
  fields: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:state'])

const columns = computed(() => usableColumns(props.config, props.fields))
const labelOf = (field) => columns.value.find((c) => c.field === field)?.label || props.fields.find((f) => f.name === field)?.label || field
const unsorted = computed(() => columns.value.filter((c) => !props.state.sort.some((s) => s.field === c.field)))

function update(patch) {
  emit('update:state', { ...clone(props.state), ...patch })
}

function toggleColumn(index) {
  const next = clone(props.state.columns)
  if (next[index].hidden) delete next[index].hidden
  else next[index].hidden = true
  update({ columns: next })
}

function setSort(index, patch) {
  update({ sort: props.state.sort.map((s, i) => (i === index ? { ...s, ...patch } : s)) })
}

function addSort() {
  const first = unsorted.value[0]
  if (first) update({ sort: [...props.state.sort, { field: first.field, dir: 'asc' }] })
}
</script>

<template>
  <section class="db-panel-section">
    <h3 class="db-panel-section__title">{{ $dbt('table.columns') }}</h3>
    <ReorderList :items="state.columns" :item-key="(c) => c.field" @update:items="(cols) => update({ columns: cols })">
      <template #default="{ item, index }">
        <label class="db-check db-reorder__main">
          <input type="checkbox" :checked="!item.hidden" @change="toggleColumn(index)" />
          {{ labelOf(item.field) }}
        </label>
      </template>
    </ReorderList>
  </section>

  <section class="db-panel-section">
    <h3 class="db-panel-section__title">{{ $dbt('table.sort') }}</h3>
    <ReorderList v-if="state.sort.length" :items="state.sort" :item-key="(s) => s.field" @update:items="(sort) => update({ sort })">
      <template #default="{ item, index }">
        <select class="db-input db-reorder__main" :aria-label="$dbt('table.sortField')" :value="item.field" @change="setSort(index, { field: $event.target.value })">
          <option :value="item.field">{{ labelOf(item.field) }}</option>
          <option v-for="c in unsorted" :key="c.field" :value="c.field">{{ labelOf(c.field) }}</option>
        </select>
        <select class="db-input db-input--dir" :aria-label="$dbt('table.direction')" :value="item.dir" @change="setSort(index, { dir: $event.target.value })">
          <option value="asc">{{ $dbt('table.ascending') }}</option>
          <option value="desc">{{ $dbt('table.descending') }}</option>
        </select>
        <button type="button" class="db-icon-btn" :aria-label="$dbt('table.removeSort')" @click="update({ sort: state.sort.filter((_, i) => i !== index) })">
          <DbIcon name="x" :size="14" />
        </button>
      </template>
    </ReorderList>
    <p v-else class="db-muted db-small">{{ $dbt('table.noSort') }}</p>
    <button v-if="unsorted.length" type="button" class="db-link db-small-link" @click="addSort">+ {{ $dbt('table.addSort') }}</button>
  </section>

  <section class="db-panel-section db-panel-section--row">
    <label class="db-field db-field--grow">
      <span class="db-field__label">{{ $dbt('table.groupBy') }}</span>
      <select class="db-input" :value="state.groupRowsBy ?? ''" @change="update({ groupRowsBy: $event.target.value || null })">
        <option value="">{{ $dbt('table.noGrouping') }}</option>
        <option v-for="c in columns" :key="c.field" :value="c.field">{{ labelOf(c.field) }}</option>
      </select>
    </label>
    <label class="db-field">
      <span class="db-field__label">{{ $dbt('table.rowsPerPage') }}</span>
      <select class="db-input" :value="state.pageSize" @change="update({ pageSize: Number($event.target.value) })">
        <option v-for="size in [10, 25, 50, 100]" :key="size" :value="size">{{ size }}</option>
      </select>
    </label>
  </section>
</template>
