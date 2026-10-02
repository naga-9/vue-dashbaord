<script setup>
// Vertical filter panel on the left of the page (overall.md 3 → Filters UI, screens 1 and 1b).
// Saved filters on top, one field per filter, Reset / Apply at the bottom; collapses to a rail.
import { computed } from 'vue'
import { useDashboard } from '../core/plugin.js'
import DbIcon from '../ui/DbIcon.js'
import SavedItemsDropdown from '../savedviews/SavedItemsDropdown.vue'
import { isFilterValueEmpty } from './filterTypes.js'
import FilterField from './FilterField.vue'
import SavedFiltersPanel from './SavedFiltersPanel.vue'

const props = defineProps({
  filters: { type: Array, required: true },
  state: { type: Object, required: true }, // usePageFilters
  saved: { type: Object, default: null }, // useSavedFilters (null in page edit mode)
  panelId: { type: String, required: true },
})
const collapsed = defineModel('collapsed', { type: Boolean, default: false })

const ctx = useDashboard()
const changes = computed(() => props.state.changedIds.length)
const activeCount = computed(() => props.filters.filter((f) => !isFilterValueEmpty(f, props.state.applied[f.id])).length)
const draftHasValues = computed(() => props.filters.some((f) => !isFilterValueEmpty(f, props.state.draft[f.id])))
const panelOpen = computed(() => ctx.panel.openId === props.panelId)

function togglePanel() {
  ctx.panel.openId = panelOpen.value ? null : props.panelId
}

function clearAll() {
  for (const filter of props.filters) props.state.clear(filter.id)
}

function onKeydown(event) {
  if (event.key === 'Enter' && changes.value && event.target.tagName === 'INPUT') props.state.apply()
}
</script>

<template>
  <aside v-if="collapsed" class="db-filter-rail" :aria-label="$dbt('filters.title')">
    <button
      type="button"
      class="db-icon-btn db-filter-rail__filters"
      :class="{ 'db-icon-btn--active': activeCount }"
      :aria-label="$dbt('filters.showWithCount', { count: activeCount })"
      :title="$dbt('filters.showWithCount', { count: activeCount })"
      @click="collapsed = false"
    >
      <DbIcon name="filter" :size="18" />
      <span v-if="activeCount" class="db-filter-rail__badge">{{ activeCount }}</span>
    </button>
    <template v-if="saved?.loaded">
      <SavedItemsDropdown :saved="saved" icon-only />
      <button type="button" class="db-icon-btn" :class="{ 'db-icon-btn--active': panelOpen }" :aria-pressed="panelOpen" :aria-label="$dbt('saved.filter.settings')" :title="$dbt('saved.filter.settings')" @click="togglePanel">
        <DbIcon name="settings" />
      </button>
    </template>
    <span class="db-filter-rail__sep" aria-hidden="true" />
    <button type="button" class="db-icon-btn" :aria-label="$dbt('filters.expand')" :title="$dbt('filters.expand')" @click="collapsed = false">
      <DbIcon name="chevrons-right" />
    </button>
  </aside>

  <aside v-else class="db-filter-panel" :aria-label="$dbt('filters.title')" @keydown="onKeydown">
    <header class="db-filter-panel__header">
      <span class="db-filter-panel__title">
        {{ $dbt('filters.title') }}<span v-if="activeCount" class="db-muted"> · {{ $dbt('filters.activeCount', { count: activeCount }) }}</span>
      </span>
      <button v-if="draftHasValues" type="button" class="db-link db-small-link" @click="clearAll">{{ $dbt('filters.clearAll') }}</button>
      <button type="button" class="db-icon-btn" :aria-label="$dbt('filters.collapse')" :title="$dbt('filters.collapse')" @click="collapsed = true">
        <DbIcon name="chevrons-left" />
      </button>
    </header>

    <div v-if="saved?.loaded" class="db-filter-panel__saved">
      <SavedItemsDropdown :saved="saved" />
      <button type="button" class="db-icon-btn" :class="{ 'db-icon-btn--active': panelOpen }" :aria-pressed="panelOpen" :aria-label="$dbt('saved.filter.settings')" :title="$dbt('saved.filter.settings')" @click="togglePanel">
        <DbIcon name="settings" />
      </button>
    </div>

    <div class="db-filter-panel__fields">
      <FilterField
        v-for="filter in filters"
        :key="filter.id"
        :filter="filter"
        :model-value="state.valueOf(filter)"
        :changed="state.changedIds.includes(filter.id)"
        :options="state.options[filter.id]"
        :labels="state.labels[filter.id]"
        @update:model-value="(value) => state.setValue(filter.id, value)"
        @load-options="(term) => state.loadOptions(filter, term)"
      />
    </div>

    <footer class="db-filter-panel__footer">
      <button type="button" class="db-btn" :disabled="!changes" @click="state.resetDraft()">{{ $dbt('filters.reset') }}</button>
      <button type="button" class="db-btn db-btn--primary db-filter-panel__apply" :disabled="!changes" @click="state.apply()">
        {{ changes ? $dbt('filters.applyCount', { count: changes }) : $dbt('filters.apply') }}
      </button>
    </footer>
  </aside>

  <SavedFiltersPanel v-if="saved?.loaded" :panel-id="panelId" :saved="saved" />
</template>
