<script setup>
// Edit form of a saved view / saved filter: name + visibility.
import { computed, ref } from 'vue'
import DialogFrame from './DialogFrame.vue'

const props = defineProps({
  title: { type: String, required: true },
  name: { type: String, default: '' },
  visibility: { type: String, default: 'private' },
  canPublish: Boolean,
  canSetPublicDefault: Boolean,
  publicDefault: Boolean,
  takenNames: { type: Array, default: () => [] },
})
const emit = defineEmits(['close'])

const name = ref(props.name)
const visibility = ref(props.visibility)
const publicDefault = ref(props.publicDefault)
const error = computed(() => {
  const value = name.value.trim().toLowerCase()
  return props.takenNames.some((n) => n.toLowerCase() === value) ? 'common.nameTaken' : null
})

function submit() {
  if (!name.value.trim() || error.value) return
  emit('close', { name: name.value.trim(), visibility: visibility.value, publicDefault: publicDefault.value })
}
</script>

<template>
  <DialogFrame :title="title" @close="emit('close', null)">
    <form id="db-saved-item-form" class="db-form" @submit.prevent="submit">
      <label class="db-field">
        <span class="db-field__label">{{ $dbt('common.name') }}</span>
        <input v-model="name" class="db-input" autofocus />
        <span v-if="error" class="db-field__error">{{ $dbt(error) }}</span>
      </label>
      <fieldset class="db-field">
        <span class="db-field__label">{{ $dbt('common.visibility') }}</span>
        <label class="db-check"><input v-model="visibility" type="radio" value="private" /> {{ $dbt('visibility.private') }}</label>
        <label class="db-check" :class="{ 'db-muted': !canPublish && visibility !== 'public' }">
          <input v-model="visibility" type="radio" value="public" :disabled="!canPublish" /> {{ $dbt('visibility.public') }}
        </label>
      </fieldset>
      <label v-if="canSetPublicDefault" class="db-check" :class="{ 'db-muted': visibility !== 'public' }">
        <input v-model="publicDefault" type="checkbox" :disabled="visibility !== 'public'" />
        {{ $dbt('saved.defaultForEveryone') }}
      </label>
    </form>
    <template #footer>
      <button type="button" class="db-btn" @click="emit('close', null)">{{ $dbt('common.cancel') }}</button>
      <button type="submit" form="db-saved-item-form" class="db-btn db-btn--primary" :disabled="!name.trim() || !!error">{{ $dbt('common.save') }}</button>
    </template>
  </DialogFrame>
</template>
