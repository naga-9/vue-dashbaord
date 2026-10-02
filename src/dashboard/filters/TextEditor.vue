<script setup>
// Text filter editor: contains / does not contain + text.
import DbIcon from '../ui/DbIcon.js'

const props = defineProps({
  filter: { type: Object, required: true },
  modelValue: { type: Object, required: true },
})
const emit = defineEmits(['update:modelValue'])
// The panel passes every editor the same props (options, labels); this one doesn't need them.
defineOptions({ inheritAttrs: false })

function set(patch) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}
</script>

<template>
  <div class="db-filter-editor db-filter-editor--text">
    <div class="db-filter-editor__top">
      <div class="db-segmented db-segmented--full" role="radiogroup" :aria-label="$dbt('filters.operator')">
        <button v-for="op in ['contains', 'not contains']" :key="op" type="button" role="radio" class="db-segmented__item" :aria-checked="modelValue.op === op" @click="set({ op })">
          {{ $dbt(`op.${op}`) }}
        </button>
      </div>
      <label class="db-search">
        <DbIcon name="search" :size="14" />
        <input :value="modelValue.value ?? ''" :aria-label="filter.label" :placeholder="filter.label" autofocus @input="set({ value: $event.target.value })" />
      </label>
    </div>
    <footer class="db-filter-editor__footer">
      <span />
      <button type="button" class="db-link" :disabled="!modelValue.value" @click="set({ value: '' })">{{ $dbt('common.clear') }}</button>
    </footer>
  </div>
</template>
