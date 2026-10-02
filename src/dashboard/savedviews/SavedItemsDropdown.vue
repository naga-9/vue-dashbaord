<script setup>
// Switcher for saved views (block header) and saved filters (filter panel): only lists them;
// managing them is in the side panel. "None", then Private, then Public. ✓ = current, ★ = my default.
import { computed } from 'vue'
import { useDashboard } from '../core/plugin.js'
import DbMenu from '../ui/DbMenu.vue'
import DbIcon from '../ui/DbIcon.js'
import { groupSaved } from './groupSaved.js'

const props = defineProps({
  saved: { type: Object, required: true }, // useSavedViews / useSavedFilters
  showChanged: Boolean, // • when there are unsaved side-panel changes (views)
  iconOnly: Boolean, // collapsed filter rail
})

const { t } = useDashboard()
const noneLabel = computed(() => t(`saved.${props.saved.kind}.none`))
const currentName = computed(() => props.saved.selected?.name ?? noneLabel.value)

const items = computed(() => {
  const s = props.saved
  const entry = (item) => ({ label: item.name, checked: item.id === s.currentId, hint: item.isMyDefault ? '★' : '', onSelect: () => s.select(item.id) })
  const groups = groupSaved(s.items)
  const list = [{ label: noneLabel.value, checked: !s.currentId, onSelect: () => s.select(null) }]
  if (groups.private.length) list.push({ separator: true }, { heading: t('visibility.private') }, ...groups.private.map(entry))
  if (groups.public.length) list.push({ separator: true }, { heading: t('visibility.public') }, ...groups.public.map(entry))
  return list
})
</script>

<template>
  <DbMenu :items="items" :align="iconOnly ? 'start' : 'end'">
    <button
      v-if="iconOnly"
      type="button"
      class="db-icon-btn"
      :aria-label="`${$dbt(`saved.${saved.kind}.title`)}: ${currentName}`"
      :title="`${$dbt(`saved.${saved.kind}.title`)}: ${currentName}`"
    >
      <DbIcon name="bookmark" />
    </button>
    <button v-else type="button" class="db-btn db-btn--ghost db-btn--small db-saved-trigger" :title="$dbt(`saved.${saved.kind}.title`)">
      <DbIcon name="bookmark" />
      <span class="db-saved-trigger__name">{{ currentName }}</span>
      <span v-if="showChanged && saved.changed" class="db-saved-trigger__changed" :title="$dbt('saved.changedHint')">•</span>
      <DbIcon name="chevron-down" :size="14" />
    </button>
  </DbMenu>
</template>
