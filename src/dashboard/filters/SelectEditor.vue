<script setup>
// Select filter editor (filters design, screen 2): is / is not, search, dynamic values, options.
import { computed, onMounted, ref, watch } from 'vue'
import { useDashboard } from '../core/plugin.js'
import { isDynamic } from '../core/conditions.js'
import DbIcon from '../ui/DbIcon.js'
import { dynamicLabel } from './filterSummary.js'

const props = defineProps({
  filter: { type: Object, required: true },
  modelValue: { type: Object, required: true }, // { op, value }
  options: { type: Object, default: () => ({ list: [], loading: false }) },
  labels: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'load-options'])

const ctx = useDashboard()
const term = ref('')
let searchTimer = null

const dynamics = computed(() => ctx.dynamicValues.forType('select'))
const selected = computed(() => (isDynamic(props.modelValue.value) ? [] : (props.modelValue.value ?? [])))
const selectedDynamic = computed(() => (isDynamic(props.modelValue.value) ? props.modelValue.value.dynamic : null))
const count = computed(() => (selectedDynamic.value ? 1 : selected.value.length))
// Custom option lists are filtered here; mapped options are searched by the provider.
const shown = computed(() => {
  const list = props.options?.list ?? []
  if (props.filter.optionsFrom !== 'custom' || !term.value) return list
  const t = term.value.toLowerCase()
  return list.filter((o) => o.label.toLowerCase().includes(t))
})

function set(patch) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

function toggle(value) {
  if (!props.filter.multiple) return set({ value: selected.value[0] === value ? [] : [value] })
  set({ value: selected.value.includes(value) ? selected.value.filter((v) => v !== value) : [...selected.value, value] })
}

function toggleDynamic(key) {
  set({ value: selectedDynamic.value === key ? [] : { dynamic: key } })
}

watch(term, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('load-options', value), 200)
})
onMounted(() => emit('load-options', ''))
</script>

<template>
  <div class="db-filter-editor db-filter-editor--select">
    <div class="db-filter-editor__top">
      <div class="db-segmented db-segmented--full" role="radiogroup" :aria-label="$dbt('filters.operator')">
        <button v-for="op in ['is', 'is not']" :key="op" type="button" role="radio" class="db-segmented__item" :aria-checked="modelValue.op === op" @click="set({ op })">
          {{ $dbt(`op.${op}`) }}
        </button>
      </div>
      <label class="db-search">
        <DbIcon name="search" :size="14" />
        <input v-model="term" :aria-label="$dbt('filters.searchIn', { label: filter.label })" :placeholder="$dbt('filters.searchIn', { label: filter.label })" />
      </label>
    </div>

    <div class="db-filter-editor__list" role="listbox" :aria-multiselectable="filter.multiple">
      <template v-if="dynamics.length">
        <label v-for="d in dynamics" :key="d.key" class="db-option db-option--dynamic">
          <input type="checkbox" :checked="selectedDynamic === d.key" @change="toggleDynamic(d.key)" />
          {{ dynamicLabel(ctx, d.key) }}
        </label>
        <div class="db-filter-editor__sep" />
      </template>
      <label v-for="option in shown" :key="String(option.value)" class="db-option" :class="{ 'db-option--on': selected.includes(option.value) }">
        <input :type="filter.multiple ? 'checkbox' : 'radio'" :checked="selected.includes(option.value)" @change="toggle(option.value)" />
        {{ option.label }}
      </label>
      <p v-if="options?.loading" class="db-filter-editor__note">{{ $dbt('common.loading') }}</p>
      <p v-else-if="!shown.length" class="db-filter-editor__note">{{ $dbt('common.noOptions') }}</p>
    </div>

    <footer class="db-filter-editor__footer">
      <span>{{ $dbt('filters.selectedCount', { count }) }}</span>
      <button type="button" class="db-link" :disabled="!count" @click="set({ value: [] })">{{ $dbt('common.clear') }}</button>
    </footer>
  </div>
</template>
