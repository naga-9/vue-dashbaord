<script setup>
// Date filter editor (filters design, screen 3): relative dates on the left, custom range on the right,
// and what the current choice resolves to.
import { computed, ref, watch } from 'vue'
import { useDashboard } from '../core/plugin.js'
import { isDynamic } from '../core/conditions.js'
import { formatDateRange } from '../core/format.js'
import { dynamicLabel } from './filterSummary.js'

const props = defineProps({
  filter: { type: Object, required: true },
  modelValue: { type: Object, required: true },
})
const emit = defineEmits(['update:modelValue'])
// The panel passes every editor the same props (options, labels); this one doesn't need them.
defineOptions({ inheritAttrs: false })

const ctx = useDashboard()
const presets = computed(() => ctx.dynamicValues.forType('date'))
const dynamicKey = computed(() => (isDynamic(props.modelValue.value) ? props.modelValue.value.dynamic : null))
const range = computed(() => (isDynamic(props.modelValue.value) ? [null, null] : (props.modelValue.value ?? [null, null])))
const hint = ref({ title: '', text: '', error: false })

function setRange(index, raw) {
  const next = [...range.value]
  next[index] = raw || null
  emit('update:modelValue', { op: 'between', value: next })
}

watch(
  () => props.modelValue.value,
  async (value) => {
    if (isDynamic(value)) {
      const def = ctx.dynamicValues.get(value.dynamic)
      if (!def) return (hint.value = { title: value.dynamic, text: ctx.t('dynamic.unknown', { key: value.dynamic }), error: true })
      try {
        const resolved = await def.resolve(ctx.resolveContext())
        hint.value = { title: dynamicLabel(ctx, value.dynamic), text: formatDateRange(resolved, ctx.formatEnv()), error: false }
      } catch (e) {
        hint.value = { title: dynamicLabel(ctx, value.dynamic), text: ctx.t('dynamic.failed', { message: e.message }), error: true }
      }
      return
    }
    const [from, to] = value ?? []
    hint.value = from || to ? { title: ctx.t('filters.customRange'), text: formatDateRange([from, to], ctx.formatEnv()), error: false } : { title: '', text: '', error: false }
  },
  { immediate: true },
)
</script>

<template>
  <div class="db-filter-editor db-filter-editor--date">
    <div class="db-date-editor">
      <div class="db-date-editor__presets" role="listbox" :aria-label="$dbt('filters.relativeDates')">
        <button
          v-for="p in presets"
          :key="p.key"
          type="button"
          role="option"
          class="db-date-editor__preset"
          :aria-selected="dynamicKey === p.key"
          @click="emit('update:modelValue', { op: 'between', value: { dynamic: p.key } })"
        >
          {{ dynamicLabel(ctx, p.key) }}
        </button>
      </div>
      <div class="db-date-editor__custom">
        <h4 class="db-panel-section__title">{{ $dbt('filters.customRange') }}</h4>
        <div class="db-date-editor__range">
          <label class="db-field">
            <span class="db-field__label">{{ $dbt('filters.from') }}</span>
            <input class="db-input" type="date" :value="range[0] ?? ''" @input="setRange(0, $event.target.value)" />
          </label>
          <label class="db-field">
            <span class="db-field__label">{{ $dbt('filters.to') }}</span>
            <input class="db-input" type="date" :value="range[1] ?? ''" @input="setRange(1, $event.target.value)" />
          </label>
        </div>
        <div v-if="hint.title" class="db-date-editor__hint" :class="{ 'db-date-editor__hint--error': hint.error }">
          <strong>{{ hint.title }}</strong>
          <span>{{ hint.text }}</span>
        </div>
      </div>
    </div>
    <footer class="db-filter-editor__footer">
      <span>{{ $dbt('filters.rangeHint') }}</span>
      <button type="button" class="db-link" @click="emit('update:modelValue', { op: 'between', value: [null, null] })">{{ $dbt('common.clear') }}</button>
    </footer>
  </div>
</template>
