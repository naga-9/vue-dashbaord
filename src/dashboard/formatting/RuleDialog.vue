<script setup>
// Edits one conditional-formatting rule (block rules and saved-view rules use the same dialog).
import { computed, ref } from 'vue'
import { clone } from '../core/clone.js'
import DialogFrame from '../ui/DialogFrame.vue'
import ConditionEditor from '../blocks/ConditionEditor.vue'

const STYLES = ['danger', 'warning', 'success', 'muted']

const props = defineProps({
  rule: { type: Object, default: null }, // null = new rule
  fields: { type: Array, default: () => [] },
  targets: { type: Array, default: () => [] },
})
const emit = defineEmits(['close'])

const isNew = computed(() => !props.rule)
const draft = ref(clone(props.rule) ?? { when: [], style: 'danger', target: props.targets[0], field: props.targets[0] === 'cell' ? props.fields[0]?.name : undefined })
const needsField = computed(() => draft.value.target === 'cell')

function setTarget(target) {
  draft.value = { ...draft.value, target, field: target === 'cell' ? (draft.value.field ?? props.fields[0]?.name) : undefined }
}
</script>

<template>
  <DialogFrame :title="isNew ? $dbt('rules.addTitle') : $dbt('rules.editTitle')" @close="emit('close', null)">
    <div class="db-rule-form">
      <div class="db-field">
        <span class="db-field__label">{{ $dbt('rules.when') }}</span>
        <ConditionEditor v-model="draft.when" :fields="fields" />
      </div>
      <div class="db-row">
        <label class="db-field">
          <span class="db-field__label">{{ $dbt('rules.style') }}</span>
          <span class="db-row">
            <select v-model="draft.style" class="db-input">
              <option v-for="style in STYLES" :key="style" :value="style">{{ $dbt(`style.${style}`) }}</option>
            </select>
            <span class="db-swatch" :class="`db-fmt-${draft.style}`">Aa</span>
          </span>
        </label>
        <label class="db-field">
          <span class="db-field__label">{{ $dbt('rules.apply') }}</span>
          <select class="db-input" :value="draft.target" @change="setTarget($event.target.value)">
            <option v-for="target in targets" :key="target" :value="target">{{ $dbt(`target.${target}`) }}</option>
          </select>
        </label>
        <label v-if="needsField" class="db-field">
          <span class="db-field__label">{{ $dbt('table.field') }}</span>
          <select v-model="draft.field" class="db-input">
            <option v-for="field in fields" :key="field.name" :value="field.name">{{ field.label }}</option>
          </select>
        </label>
      </div>
    </div>
    <template #footer>
      <button v-if="!isNew" type="button" class="db-btn db-btn--ghost db-btn--danger-text" @click="emit('close', { remove: true })">{{ $dbt('rules.remove') }}</button>
      <span class="db-spacer" />
      <button type="button" class="db-btn" @click="emit('close', null)">{{ $dbt('common.cancel') }}</button>
      <button type="button" class="db-btn db-btn--primary" :disabled="!draft.when.length" @click="emit('close', { rule: draft })">{{ $dbt('common.apply') }}</button>
    </template>
  </DialogFrame>
</template>
