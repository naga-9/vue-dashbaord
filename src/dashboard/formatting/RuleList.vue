<script setup>
// Rules as one-line summaries with an edit icon, plus "+ Add rule" (block form and side panel).
import { useDashboard } from '../core/plugin.js'
import DbIcon from '../ui/DbIcon.js'
import RuleDialog from './RuleDialog.vue'
import { ruleSummary } from './ruleSummary.js'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  fields: { type: Array, default: () => [] },
  targets: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const ctx = useDashboard()

async function edit(index) {
  const result = await ctx.dialogs.open(RuleDialog, { rule: index === null ? null : props.modelValue[index], fields: props.fields, targets: props.targets }, { size: 'md' })
  if (!result) return
  const next = [...props.modelValue]
  if (result.remove) next.splice(index, 1)
  else if (index === null) next.push(result.rule)
  else next[index] = result.rule
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="db-rule-list">
    <div v-for="(rule, index) in modelValue" :key="index" class="db-rule-item">
      <span class="db-swatch" :class="`db-fmt-${rule.style}`">Aa</span>
      <span class="db-rule-item__text">{{ ruleSummary(rule, fields, ctx) }}</span>
      <button type="button" class="db-icon-btn" :aria-label="$dbt('rules.editTitle')" :title="$dbt('rules.editTitle')" @click="edit(index)">
        <DbIcon name="pencil" :size="14" />
      </button>
    </div>
    <button type="button" class="db-link db-small-link" :disabled="!targets.length || !fields.length" @click="edit(null)">+ {{ $dbt('rules.add') }}</button>
  </div>
</template>
