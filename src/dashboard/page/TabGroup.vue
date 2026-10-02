<script setup>
// A tab group on the page grid (overall.md 2 → Tab groups). Each tab has its own grid of blocks.
// Tabs are loaded the first time they are opened, then kept (so view state survives switching).
import { computed, reactive, watch } from 'vue'
import { useDashboard } from '../core/plugin.js'
import DbMenu from '../ui/DbMenu.vue'
import DbIcon from '../ui/DbIcon.js'
import PageGrid from './PageGrid.vue'

const props = defineProps({
  group: { type: Object, required: true },
  activeTabId: { type: String, default: null },
  editing: Boolean,
})
const emit = defineEmits(['select-tab', 'layout-change', 'edit'])

const { t } = useDashboard()
const visited = reactive(new Set())
const active = computed(() => props.group.tabs.find((tab) => tab.id === props.activeTabId) ?? props.group.tabs[0])

watch(
  () => active.value?.id,
  (id) => id && visited.add(id),
  { immediate: true },
)

function itemsOf(tab) {
  return tab.blocks.map((p) => ({ key: p.blockId, x: p.x, y: p.y, w: p.w, h: p.h, placement: p }))
}

function onKeydown(event, index) {
  const tabs = props.group.tabs
  const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : null
  if (next === null) return
  const tab = tabs[(next + tabs.length) % tabs.length]
  emit('select-tab', tab.id)
  event.currentTarget.parentElement.children[(next + tabs.length) % tabs.length]?.focus()
}

const editItems = computed(() => [
  { label: t('tabs.rename'), onSelect: () => emit('edit', { op: 'rename-tab', tabId: active.value.id }) },
  { label: t('tabs.moveLeft'), onSelect: () => emit('edit', { op: 'move-tab', tabId: active.value.id, offset: -1 }) },
  { label: t('tabs.moveRight'), onSelect: () => emit('edit', { op: 'move-tab', tabId: active.value.id, offset: 1 }) },
  { label: t('tabs.remove'), danger: true, disabled: props.group.tabs.length < 2, onSelect: () => emit('edit', { op: 'remove-tab', tabId: active.value.id }) },
  { separator: true },
  { label: t('tabs.removeGroup'), danger: true, onSelect: () => emit('edit', { op: 'remove-group' }) },
])
</script>

<template>
  <section class="db-tab-group">
    <header class="db-tab-group__header">
      <span v-if="editing" class="db-drag-handle db-drag-handle--page" :title="$dbt('edit.drag')"><DbIcon name="grip" :size="14" /></span>
      <div class="db-tabs" role="tablist">
        <button
          v-for="(tab, index) in group.tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="db-tabs__tab"
          :aria-selected="tab.id === active?.id"
          :tabindex="tab.id === active?.id ? 0 : -1"
          @click="emit('select-tab', tab.id)"
          @keydown="onKeydown($event, index)"
        >
          {{ tab.name }}
        </button>
        <button v-if="editing" type="button" class="db-icon-btn db-icon-btn--small db-tabs__add" :aria-label="$dbt('tabs.add')" :title="$dbt('tabs.add')" @click="emit('edit', { op: 'add-tab' })">
          <DbIcon name="plus" :size="14" />
        </button>
      </div>
      <span class="db-spacer" />
      <DbMenu v-if="editing" :items="editItems">
        <button type="button" class="db-icon-btn db-icon-btn--small" :aria-label="$dbt('tabs.edit')" :title="$dbt('tabs.edit')"><DbIcon name="more" :size="14" /></button>
      </DbMenu>
    </header>
    <div class="db-tab-group__body">
      <template v-for="tab in group.tabs" :key="tab.id">
        <div v-if="visited.has(tab.id)" v-show="tab.id === active?.id" class="db-tab-group__panel" role="tabpanel">
          <PageGrid :items="itemsOf(tab)" :editing="editing" handle="db-drag-handle--tab" @layout-change="(layout) => emit('layout-change', tab.id, layout)">
            <template #item="{ item }">
              <slot name="block" :placement="item.placement" :tab-id="tab.id" />
            </template>
          </PageGrid>
          <p v-if="!tab.blocks.length" class="db-muted db-tab-group__empty">{{ $dbt(editing ? 'tabs.emptyEditing' : 'tabs.empty') }}</p>
        </div>
      </template>
    </div>
  </section>
</template>
