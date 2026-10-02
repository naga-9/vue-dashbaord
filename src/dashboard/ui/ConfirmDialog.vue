<script setup>
import DialogFrame from './DialogFrame.vue'

defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: '' },
  cancelLabel: { type: String, default: '' },
  danger: Boolean,
  hideCancel: Boolean,
})
const emit = defineEmits(['close'])
</script>

<template>
  <DialogFrame :title="title" @close="emit('close', false)">
    <p class="db-dialog__message">{{ message }}</p>
    <template #footer>
      <button v-if="!hideCancel" type="button" class="db-btn" @click="emit('close', false)">{{ cancelLabel || $dbt('common.cancel') }}</button>
      <button type="button" class="db-btn" :class="danger ? 'db-btn--danger' : 'db-btn--primary'" @click="emit('close', true)">
        {{ confirmLabel || $dbt('common.ok') }}
      </button>
    </template>
  </DialogFrame>
</template>
