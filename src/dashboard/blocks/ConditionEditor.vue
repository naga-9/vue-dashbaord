<script setup>
// Editor for a list of conditions (fixed conditions, rule conditions). Combined with AND.
import { OPS_BY_FIELD_TYPE, defaultValueFor } from '../core/conditions.js'
import ValueInput from './ValueInput.vue'
import DbIcon from '../ui/DbIcon.js'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  fields: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const fieldOf = (name) => props.fields.find((f) => f.name === name)
const opsFor = (name) => OPS_BY_FIELD_TYPE[fieldOf(name)?.type] ?? OPS_BY_FIELD_TYPE.text

function update(index, patch) {
  emit(
    'update:modelValue',
    props.modelValue.map((c, i) => (i === index ? { ...c, ...patch } : c)),
  )
}

function setField(index, name) {
  const op = opsFor(name)[0]
  update(index, { field: name, op, value: fieldOf(name)?.type === 'boolean' ? true : defaultValueFor(op) })
}

function setOp(index, op) {
  const current = props.modelValue[index]
  const keep = defaultValueFor(op)?.constructor === current.value?.constructor
  update(index, { op, value: keep ? current.value : fieldOf(current.field)?.type === 'boolean' ? true : defaultValueFor(op) })
}

function add() {
  const field = props.fields[0]
  if (!field) return
  const op = opsFor(field.name)[0]
  emit('update:modelValue', [...props.modelValue, { field: field.name, op, value: field.type === 'boolean' ? true : defaultValueFor(op) }])
}

function remove(index) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
}
</script>

<template>
  <div class="db-conditions">
    <div v-for="(condition, index) in modelValue" :key="index" class="db-condition">
      <select class="db-input" :aria-label="$dbt('table.field')" :value="condition.field" @change="setField(index, $event.target.value)">
        <option v-if="!fieldOf(condition.field)" :value="condition.field">{{ condition.field }} ({{ $dbt('common.missingField') }})</option>
        <option v-for="field in fields" :key="field.name" :value="field.name">{{ field.label }}</option>
      </select>
      <select class="db-input db-input--op" :value="condition.op" @change="setOp(index, $event.target.value)">
        <option v-for="op in opsFor(condition.field)" :key="op" :value="op">{{ $dbt(`op.${op}`) }}</option>
      </select>
      <ValueInput :model-value="condition.value" :op="condition.op" :field-type="fieldOf(condition.field)?.type" @update:model-value="update(index, { value: $event })" />
      <button type="button" class="db-icon-btn" :aria-label="$dbt('common.remove')" :title="$dbt('common.remove')" @click="remove(index)"><DbIcon name="x" :size="14" /></button>
    </div>
    <button type="button" class="db-link db-small-link" :disabled="!fields.length" @click="add">+ {{ $dbt('conditions.add') }}</button>
  </div>
</template>
