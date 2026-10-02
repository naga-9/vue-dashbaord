<script setup>
// Value input of one condition, depending on the operator and field type.
// Offers dynamic values where they fit (date fields: relative dates; text fields: current user, …).
import { computed } from 'vue'
import { useDashboard } from '../core/plugin.js'
import { LIST_OPS, NO_VALUE_OPS, RANGE_OPS, isDynamic } from '../core/conditions.js'

const props = defineProps({
  modelValue: { type: null, default: null },
  op: { type: String, required: true },
  fieldType: { type: String, default: 'text' },
})
const emit = defineEmits(['update:modelValue'])

const ctx = useDashboard()
const inputType = computed(() => ({ number: 'number', date: 'date', datetime: 'datetime-local' })[props.fieldType] ?? 'text')
const dynamicType = computed(() => ({ date: 'date', datetime: 'date', text: 'select', number: 'select' })[props.fieldType])
const dynamicOptions = computed(() => (dynamicType.value ? ctx.dynamicValues.forType(dynamicType.value) : []))
const isRange = computed(() => RANGE_OPS.includes(props.op))
const isList = computed(() => LIST_OPS.includes(props.op))

function parse(text) {
  if (text === '') return null
  return props.fieldType === 'number' ? Number(text) : text
}

function setDynamic(key) {
  emit('update:modelValue', key ? { dynamic: key } : isRange.value ? [null, null] : isList.value ? [] : '')
}
</script>

<template>
  <span class="db-value-input">
    <template v-if="NO_VALUE_OPS.includes(op)" />

    <select v-else-if="isDynamic(modelValue)" class="db-input" :value="modelValue.dynamic" @change="setDynamic($event.target.value)">
      <option value="">{{ $dbt('dynamic.fixedValue') }}</option>
      <option v-for="d in dynamicOptions" :key="d.key" :value="d.key">{{ $dbt(`dynamic.${d.key}`) === `dynamic.${d.key}` ? d.label : $dbt(`dynamic.${d.key}`) }}</option>
    </select>

    <template v-else>
      <select v-if="fieldType === 'boolean'" class="db-input" :value="String(modelValue)" @change="emit('update:modelValue', $event.target.value === 'true')">
        <option value="true">{{ $dbt('common.yes') }}</option>
        <option value="false">{{ $dbt('common.no') }}</option>
      </select>

      <span v-else-if="isRange" class="db-range">
        <input class="db-input" :type="inputType" :value="modelValue?.[0] ?? ''" @input="emit('update:modelValue', [parse($event.target.value), modelValue?.[1] ?? null])" />
        <span>–</span>
        <input class="db-input" :type="inputType" :value="modelValue?.[1] ?? ''" @input="emit('update:modelValue', [modelValue?.[0] ?? null, parse($event.target.value)])" />
      </span>

      <input
        v-else-if="isList"
        class="db-input"
        :value="(modelValue ?? []).join(', ')"
        :placeholder="$dbt('conditions.listHint')"
        @change="
          emit(
            'update:modelValue',
            $event.target.value
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
              .map(parse),
          )
        "
      />

      <input v-else class="db-input" :type="inputType" :value="modelValue ?? ''" @input="emit('update:modelValue', parse($event.target.value))" />

      <select v-if="dynamicOptions.length" class="db-input db-input--narrow" value="" :title="$dbt('dynamic.use')" @change="setDynamic($event.target.value)">
        <option value="">@</option>
        <option v-for="d in dynamicOptions" :key="d.key" :value="d.key">{{ $dbt(`dynamic.${d.key}`) === `dynamic.${d.key}` ? d.label : $dbt(`dynamic.${d.key}`) }}</option>
      </select>
    </template>
  </span>
</template>
