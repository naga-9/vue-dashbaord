<script setup>
// One filter in the filter panel: label (• when changed but not applied, × to clear) and its control.
// Select, date and text open an editor beside the panel; number and Yes/No are edited in place.
import { computed, ref } from 'vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { useDashboard } from '../core/plugin.js'
import DbIcon from '../ui/DbIcon.js'
import { FILTER_TYPES, isFilterValueEmpty } from './filterTypes.js'
import { filterSummary } from './filterSummary.js'
import SelectEditor from './SelectEditor.vue'
import DateEditor from './DateEditor.vue'
import TextEditor from './TextEditor.vue'

const props = defineProps({
  filter: { type: Object, required: true },
  modelValue: { type: Object, required: true },
  changed: Boolean,
  options: { type: Object, default: undefined },
  labels: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'load-options'])

const ctx = useDashboard()
const open = ref(false)
const hasValue = computed(() => !isFilterValueEmpty(props.filter, props.modelValue))
const summary = computed(() => filterSummary(props.filter, props.modelValue, ctx, props.labels))
const editors = { select: SelectEditor, date: DateEditor, text: TextEditor }
const editor = computed(() => editors[props.filter.type])
const id = `db-filter-${Math.random().toString(36).slice(2, 8)}`

function setRange(index, raw) {
  const value = [...(props.modelValue.value ?? [null, null])]
  value[index] = raw === '' ? null : Number(raw)
  emit('update:modelValue', { op: 'between', value })
}

function clear() {
  emit('update:modelValue', FILTER_TYPES[props.filter.type].defaultValue())
}
</script>

<template>
  <div class="db-filter-field" :class="{ 'db-filter-field--active': hasValue, 'db-filter-field--changed': changed }">
    <div class="db-filter-field__head">
      <span :id="id" class="db-filter-field__label">
        {{ filter.label }}
        <span v-if="changed" class="db-filter-field__dot" :title="$dbt('filters.notApplied')">•</span>
      </span>
      <button v-if="hasValue" type="button" class="db-icon-btn db-icon-btn--tiny" :aria-label="$dbt('filters.clearOne', { label: filter.label })" :title="$dbt('common.clear')" @click="clear">
        <DbIcon name="x" :size="12" />
      </button>
    </div>

    <div v-if="filter.type === 'number'" class="db-filter-field__range">
      <input
        class="db-input"
        type="number"
        :aria-label="`${filter.label} ${$dbt('filters.from')}`"
        :placeholder="$dbt('filters.from')"
        :class="{ 'db-input--active': modelValue.value?.[0] !== null && modelValue.value?.[0] !== undefined }"
        :value="modelValue.value?.[0] ?? ''"
        @input="setRange(0, $event.target.value)"
      />
      <input
        class="db-input"
        type="number"
        :aria-label="`${filter.label} ${$dbt('filters.to')}`"
        :placeholder="$dbt('filters.to')"
        :class="{ 'db-input--active': modelValue.value?.[1] !== null && modelValue.value?.[1] !== undefined }"
        :value="modelValue.value?.[1] ?? ''"
        @input="setRange(1, $event.target.value)"
      />
    </div>

    <div v-else-if="filter.type === 'boolean'" class="db-segmented db-segmented--full" role="radiogroup" :aria-labelledby="id">
      <button
        v-for="choice in [
          { value: null, label: 'filters.any' },
          { value: true, label: 'common.yes' },
          { value: false, label: 'common.no' },
        ]"
        :key="String(choice.value)"
        type="button"
        role="radio"
        class="db-segmented__item"
        :aria-checked="modelValue.value === choice.value || (choice.value === null && modelValue.value !== true && modelValue.value !== false)"
        @click="emit('update:modelValue', { op: 'is', value: choice.value })"
      >
        {{ $dbt(choice.label) }}
      </button>
    </div>

    <PopoverRoot v-else v-model:open="open">
      <PopoverTrigger as-child>
        <button type="button" class="db-filter-box" :class="{ 'db-filter-box--open': open }" :aria-labelledby="id">
          <span class="db-filter-box__value" :title="summary ?? undefined">{{ summary ?? $dbt('filters.any') }}</span>
          <DbIcon name="chevron-down" :size="14" />
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent class="db-root db-popover db-filter-popover" side="right" align="start" :side-offset="8" :collision-padding="8">
          <component
            :is="editor"
            :filter="filter"
            :model-value="modelValue"
            :options="options"
            :labels="labels"
            @update:model-value="(value) => emit('update:modelValue', value)"
            @load-options="(term) => emit('load-options', term)"
          />
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>
