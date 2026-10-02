<script setup>
// Renders the package's open dialogs and toasts (see core/dialogs.js).
import { DialogContent, DialogOverlay, DialogRoot } from 'reka-ui'
import ConfirmDialog from './ConfirmDialog.vue'
import PromptDialog from './PromptDialog.vue'

defineProps({ state: { type: Object, required: true } })
</script>

<template>
  <DialogRoot v-for="dialog in state.dialogs" :key="dialog.id" :open="true" @update:open="(open) => !open && dialog.close(undefined)">
    <DialogOverlay class="db-dialog-overlay" />
    <DialogContent
      class="db-dialog"
      :class="`db-dialog--${dialog.options.size ?? (dialog.component ? 'md' : 'sm')}`"
      :aria-describedby="undefined"
      @interact-outside="(event) => dialog.options.keepOpenOnOutside && event.preventDefault()"
    >
      <ConfirmDialog v-if="dialog.props.kind === 'confirm'" v-bind="dialog.props" @close="dialog.close" />
      <PromptDialog v-else-if="dialog.props.kind === 'prompt'" v-bind="dialog.props" @close="dialog.close" />
      <component :is="dialog.component" v-else v-bind="dialog.props" @close="dialog.close" />
    </DialogContent>
  </DialogRoot>

  <div class="db-toasts" aria-live="polite">
    <div v-for="toast in state.toasts" :key="toast.id" class="db-toast" :class="`db-toast--${toast.type}`">{{ toast.message }}</div>
  </div>
</template>
