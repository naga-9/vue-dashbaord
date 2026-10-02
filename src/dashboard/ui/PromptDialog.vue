<script setup>
import { computed, ref } from 'vue'
import DialogFrame from './DialogFrame.vue'

const props = defineProps({
  title: { type: String, required: true },
  label: { type: String, default: '' },
  value: { type: String, default: '' },
  confirmLabel: { type: String, default: '' },
  validate: { type: Function, default: null },
})
const emit = defineEmits(['close'])

const text = ref(props.value)
const error = computed(() => (props.validate ? props.validate(text.value.trim()) : null))

function submit() {
  if (!text.value.trim() || error.value) return
  emit('close', text.value.trim())
}
</script>

<template>
  <DialogFrame :title="title" @close="emit('close', null)">
    <form id="db-prompt-form" @submit.prevent="submit">
      <label class="db-field">
        <span class="db-field__label">{{ label }}</span>
        <input v-model="text" class="db-input" autofocus />
        <span v-if="error" class="db-field__error">{{ error }}</span>
      </label>
    </form>
    <template #footer>
      <button type="button" class="db-btn" @click="emit('close', null)">{{ $dbt('common.cancel') }}</button>
      <button type="submit" form="db-prompt-form" class="db-btn db-btn--primary" :disabled="!text.trim() || !!error">
        {{ confirmLabel || $dbt('common.ok') }}
      </button>
    </template>
  </DialogFrame>
</template>
