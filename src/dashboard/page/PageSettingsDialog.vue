<script setup>
// Page settings (overall.md 2 → Page UI, screen 5): name, description, visibility.
// A modal so more page options can be added later. In edit mode its changes are part of the page
// draft (saved with Save); when creating a page it is the whole form.
import { ref } from 'vue'
import DialogFrame from '../ui/DialogFrame.vue'

const props = defineProps({
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  visibility: { type: String, default: 'private' },
  canPublish: Boolean,
  title: { type: String, required: true },
  confirmLabel: { type: String, default: '' },
  partOfEdit: Boolean, // shows the "saved with Save" note
})
const emit = defineEmits(['close'])

const form = ref({ name: props.name, description: props.description ?? '', visibility: props.visibility })

function submit() {
  if (!form.value.name.trim()) return
  emit('close', { ...form.value, name: form.value.name.trim() })
}
</script>

<template>
  <DialogFrame :title="title" @close="emit('close', null)">
    <form id="db-page-settings" class="db-form db-page-settings" @submit.prevent="submit">
      <label class="db-field">
        <span class="db-field__label">{{ $dbt('common.name') }} *</span>
        <input v-model="form.name" class="db-input" autofocus />
      </label>
      <label class="db-field">
        <span class="db-field__label">{{ $dbt('common.description') }}</span>
        <textarea v-model="form.description" class="db-input" rows="3" />
      </label>
      <fieldset class="db-field">
        <legend class="db-field__label">{{ $dbt('common.visibility') }}</legend>
        <label class="db-check"><input v-model="form.visibility" type="radio" value="private" /> {{ $dbt('visibility.privateLong') }}</label>
        <label class="db-check" :class="{ 'db-muted': !canPublish && visibility !== 'public' }">
          <input v-model="form.visibility" type="radio" value="public" :disabled="!canPublish && visibility !== 'public'" /> {{ $dbt('visibility.publicLong') }}
        </label>
      </fieldset>
      <p v-if="partOfEdit" class="db-muted">{{ $dbt('page.settingsNote') }}</p>
    </form>
    <template #footer>
      <button type="button" class="db-btn" @click="emit('close', null)">{{ $dbt('common.cancel') }}</button>
      <button type="submit" form="db-page-settings" class="db-btn db-btn--primary" :disabled="!form.name.trim()">{{ confirmLabel || $dbt('common.done') }}</button>
    </template>
  </DialogFrame>
</template>
