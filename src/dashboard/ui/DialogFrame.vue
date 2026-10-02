<script setup>
// Standard layout for every dialog: title, scrollable body, footer with buttons.
import { DialogTitle } from 'reka-ui'

defineProps({ title: { type: String, required: true } })
const emit = defineEmits(['close'])
</script>

<template>
  <div class="db-dialog__frame">
    <header class="db-dialog__header">
      <DialogTitle class="db-dialog__title">
        {{ title }}
        <slot name="title-extra" />
      </DialogTitle>
      <button type="button" class="db-icon-btn" :aria-label="$dbt('common.close')" @click="emit('close')">✕</button>
    </header>
    <div class="db-dialog__body"><slot /></div>
    <footer v-if="$slots.footer" class="db-dialog__footer"><slot name="footer" /></footer>
  </div>
</template>
