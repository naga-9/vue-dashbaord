<script setup>
// Widget part of the Edit block modal for tables (tableWidget.md → Block config):
// columns (drag to reorder, label, format, decimals for numbers, remove) and default rows per page.
import { computed } from 'vue'
import { FORMATS, defaultFormatFor } from '../../core/format.js'
import DbIcon from '../../ui/DbIcon.js'
import ReorderList from '../../ui/ReorderList.vue'

const NUMERIC = ['number', 'currency', 'percent']

const props = defineProps({
  modelValue: { type: Object, required: true },
  fields: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const columns = computed(() => props.modelValue.columns ?? [])
const unused = computed(() => props.fields.filter((f) => !columns.value.some((c) => c.field === f.name)))
const fieldOf = (name) => props.fields.find((f) => f.name === name)
const formatOf = (column) => column.format ?? defaultFormatFor(fieldOf(column.field)?.type)

function update(patch) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

function updateColumn(index, patch) {
  update({ columns: columns.value.map((c, i) => (i === index ? { ...c, ...patch } : c)) })
}

function addColumn(name) {
  const field = fieldOf(name)
  if (field) update({ columns: [...columns.value, { field: field.name, label: field.label }] })
}
</script>

<template>
  <section class="db-form-section">
    <div class="db-form-section__head">
      <h3 class="db-panel-section__title">{{ $dbt('table.columns') }}</h3>
      <label v-if="fields.length" class="db-inline-field db-small">
        {{ $dbt('table.rowsPerPage') }}
        <select class="db-input db-input--compact" :value="modelValue.pageSize ?? 25" @change="update({ pageSize: Number($event.target.value) })">
          <option v-for="size in [10, 25, 50, 100]" :key="size" :value="size">{{ size }}</option>
        </select>
      </label>
    </div>

    <p v-if="!fields.length" class="db-muted">{{ $dbt('table.needsSource') }}</p>
    <template v-else>
      <ReorderList :items="columns" :item-key="(c) => c.field" @update:items="(cols) => update({ columns: cols })">
        <template #default="{ item, index }">
          <span class="db-col-field" :title="item.field">
            {{ item.field }}
            <span v-if="!fieldOf(item.field)" class="db-badge db-badge--danger">{{ $dbt('common.missingField') }}</span>
          </span>
          <input class="db-input db-reorder__main" :aria-label="$dbt('table.label')" :value="item.label ?? ''" @input="updateColumn(index, { label: $event.target.value })" />
          <select class="db-input db-input--format" :aria-label="$dbt('table.format')" :value="formatOf(item)" @change="updateColumn(index, { format: $event.target.value })">
            <option v-for="format in FORMATS" :key="format" :value="format">{{ $dbt(`format.${format}`) }}</option>
          </select>
          <input
            v-if="NUMERIC.includes(formatOf(item))"
            class="db-input db-input--decimals"
            type="number"
            min="0"
            max="6"
            :aria-label="$dbt('table.decimals')"
            :title="$dbt('table.decimals')"
            :placeholder="$dbt('table.decimalsShort')"
            :value="item.decimals ?? ''"
            @input="updateColumn(index, { decimals: $event.target.value === '' ? undefined : Number($event.target.value) })"
          />
          <button type="button" class="db-icon-btn" :aria-label="$dbt('common.remove')" :title="$dbt('common.remove')" @click="update({ columns: columns.filter((_, i) => i !== index) })">
            <DbIcon name="x" :size="14" />
          </button>
        </template>
      </ReorderList>
      <select v-if="unused.length" class="db-input db-input--add" value="" @change="addColumn($event.target.value); $event.target.value = ''">
        <option value="">+ {{ $dbt('table.addColumn') }}</option>
        <option v-for="field in unused" :key="field.name" :value="field.name">{{ field.label }}</option>
      </select>
    </template>
  </section>
</template>
