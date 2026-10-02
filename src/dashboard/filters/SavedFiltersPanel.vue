<script setup>
// Saved filters side panel (filters design, screen 4): same shape as the saved views panel.
// The footer appears when the applied filters differ from the opened saved filter.
import { computed } from 'vue'
import SidePanel from '../ui/SidePanel.vue'
import SavedItemsList from '../savedviews/SavedItemsList.vue'

const props = defineProps({
  panelId: { type: String, required: true },
  saved: { type: Object, required: true }, // useSavedFilters
})

const selected = computed(() => props.saved.selected)
</script>

<template>
  <SidePanel :id="panelId" :title="$dbt('saved.filter.title')">
    <section class="db-panel-section">
      <SavedItemsList :saved="saved" none-icon="x" />
    </section>

    <template v-if="saved.changed && selected" #footer>
      <p class="db-panel__unsaved">{{ $dbt('saved.filtersDifferFrom') }} <strong>{{ selected.name }}</strong></p>
      <div class="db-panel__actions">
        <button type="button" class="db-btn" @click="saved.reset()">{{ $dbt('common.discard') }}</button>
        <button v-if="saved.canCreate" type="button" class="db-btn" @click="saved.saveAs()">{{ $dbt('saved.saveAsNew') }}</button>
        <button v-if="selected.canEdit" type="button" class="db-btn db-btn--primary" @click="saved.saveChanges()">{{ $dbt('saved.update') }}</button>
      </div>
    </template>
  </SidePanel>
</template>
