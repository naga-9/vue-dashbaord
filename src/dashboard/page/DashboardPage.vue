<script setup>
// A dashboard page (overall.md 2): blocks and tab groups on a grid, page filters on top,
// view and edit mode. The host selects the page by prop and syncs filters/tabs with its URL.
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { clone } from '../core/clone.js'
import { SMALL_SCREEN, useDashboard } from '../core/plugin.js'
import { trySave } from '../core/saving.js'
import { duplicatePage } from '../core/duplicate.js'
import { useSavedFilters } from '../savedviews/useSavedItems.js'
import { usePageFilters } from '../filters/usePageFilters.js'
import { filterValuesFromUrl, filterValuesToUrl } from '../filters/urlFilters.js'
import FilterPanel from '../filters/FilterPanel.vue'
import BlockForm from '../blocks/BlockForm.vue'
import VersionHistoryDialog from '../blocks/VersionHistoryDialog.vue'
import DbMenu from '../ui/DbMenu.vue'
import DbIcon from '../ui/DbIcon.js'
import PageGrid from './PageGrid.vue'
import TabGroup from './TabGroup.vue'
import PageBlockCell from './PageBlockCell.vue'
import AddBlockDialog from './AddBlockDialog.vue'
import FilterSetupDialog from './FilterSetupDialog.vue'
import PageSettingsDialog from './PageSettingsDialog.vue'
import { blockIdsOf, usePageEditor } from './usePageEditor.js'

const props = defineProps({
  pageId: { type: String, required: true },
  filterValues: { type: Object, default: null }, // URL form, see filters/urlFilters.js
  openTabs: { type: Array, default: () => [] }, // ids of open tabs
})
const emit = defineEmits(['update:filterValues', 'update:openTabs', 'tab-changed', 'open-record', 'page-saved', 'page-deleted', 'open-page'])

const ctx = useDashboard()
const { t, dialogs } = ctx

const page = ref(null)
const loadState = ref('loading') // loading | ready | not-found | error
const loadError = ref(null)
const blocks = reactive({}) // blockId → block (only the ones the user can see)
const fields = reactive({}) // blockId → source fields
const reloadSignal = ref(0)
const localTabs = reactive({}) // tabGroupId → open tab id
const COLLAPSED_KEY = 'db-filters-collapsed'
// Per-viewer convenience: whether the filter panel is collapsed (browser storage may be unavailable).
const filtersCollapsed = ref(readCollapsed())

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

watch(filtersCollapsed, (value) => {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0')
  } catch {
    // not stored; the panel just opens expanded next time
  }
})
const smallScreen = ref(false)
let media = null

const editor = usePageEditor(ctx, () => page.value)
const shown = computed(() => editor.draft.value ?? page.value)
const editing = computed(() => editor.editing.value)
const saved = useSavedFilters(ctx, () => page.value?.id)
const filters = usePageFilters(ctx, {
  getFilters: () => shown.value?.filters ?? [],
  getBlock: (id) => blocks[id],
  getFields: (id) => fields[id] ?? [],
  saved,
})

// ---- loading ----

async function loadBlocks(ids) {
  const missing = ids.filter((id) => !blocks[id])
  if (!missing.length) return
  const list = await ctx.provider.getBlocks(missing)
  await Promise.all(
    list.map(async (block) => {
      blocks[block.id] = block
      fields[block.id] = await ctx.getFields(block.source).catch(() => [])
    }),
  )
}

async function reloadBlock(id) {
  const [block] = await ctx.provider.getBlocks([id])
  if (!block) {
    delete blocks[id]
    return
  }
  blocks[block.id] = block
  fields[block.id] = await ctx.getFields(block.source).catch(() => [])
}

function hasUrlValues() {
  return props.filterValues && Object.keys(props.filterValues).length > 0
}

async function load() {
  loadState.value = 'loading'
  loadError.value = null
  for (const key of Object.keys(blocks)) delete blocks[key]
  try {
    await ctx.ready
    page.value = await ctx.provider.getPage(props.pageId)
    await loadBlocks(blockIdsOf(page.value))
    // Filter values in the URL take priority over the default saved filter.
    await saved.load({ applyDefault: !hasUrlValues() })
    if (hasUrlValues()) saved.content = { values: filterValuesFromUrl(page.value.filters, props.filterValues) }
    editor.resume()
    loadState.value = 'ready'
  } catch (e) {
    loadState.value = e?.code === 'not_found' ? 'not-found' : 'error'
    loadError.value = e
  }
}

watch(() => props.pageId, load, { immediate: true })

// Applied filter values → URL form for the host (on Apply / saved filter switch).
watch(
  () => filters.applied,
  (values) => {
    if (!page.value) return
    const query = filterValuesToUrl(shown.value.filters, values)
    if (JSON.stringify(query) !== JSON.stringify(props.filterValues ?? {})) emit('update:filterValues', query)
    // Dynamic values are re-resolved on every Apply.
    if (filters.hasDynamicApplied) reloadSignal.value++
  },
  { deep: true },
)

// URL changed by the host (e.g. browser back) → apply those values.
watch(
  () => props.filterValues,
  (query) => {
    if (loadState.value !== 'ready') return
    const current = filterValuesToUrl(shown.value.filters, filters.applied)
    if (JSON.stringify(current) !== JSON.stringify(query ?? {})) saved.content = { values: filterValuesFromUrl(shown.value.filters, query ?? {}) }
  },
  { deep: true },
)

// A block saved elsewhere (block form, library) → reload it here.
watch(
  () => ({ ...ctx.blockVersions }),
  (versions, old = {}) => {
    for (const id of Object.keys(versions)) if (versions[id] !== old[id] && blocks[id]) reloadBlock(id)
  },
)

// ---- tabs ----

function activeTab(group) {
  return group.tabs.find((tab) => props.openTabs.includes(tab.id))?.id ?? localTabs[group.tabGroupId] ?? group.tabs[0]?.id
}

function selectTab(group, tabId) {
  localTabs[group.tabGroupId] = tabId
  emit('tab-changed', { tabGroupId: group.tabGroupId, tabId })
  const open = shown.value.layout.filter((i) => i.tabGroupId).map((g) => (g.tabGroupId === group.tabGroupId ? tabId : activeTab(g)))
  emit('update:openTabs', open)
}

// ---- layout ----

const pageItems = computed(() => (shown.value?.layout ?? []).map((item) => ({ key: item.blockId ?? item.tabGroupId, x: item.x, y: item.y, w: item.w, h: item.h, item })))

const gridTargets = computed(() => [
  { key: 'page', label: t('edit.pageGrid') },
  ...(shown.value?.layout ?? []).filter((i) => i.tabGroupId).flatMap((g) => g.tabs.map((tab) => ({ key: tab.id, label: t('edit.tabTarget', { tab: tab.name }) }))),
])

function conditionsFor(blockId) {
  return filters.conditionsFor(blockId)
}

// ---- view mode actions ----

// "Open orders and purchasing · Asha · Public"
const pageMeta = computed(() =>
  [page.value?.description, page.value?.isMine ? t('pageList.mine') : page.value?.ownerName, t(`visibility.${page.value?.visibility}`)].filter(Boolean).join(' · '),
)

const canEditPage = computed(() => page.value?.canEdit && !smallScreen.value)

async function toggleFavourite() {
  const next = !page.value.isFavourite
  const result = await trySave(ctx, () => ctx.provider.setFavourite(page.value.id, next), { item: 'page' })
  if (result.ok) page.value = { ...page.value, isFavourite: next }
}

async function duplicate() {
  try {
    const { copy, failed } = await duplicatePage(ctx, page.value)
    dialogs.toast(failed ? t('duplicate.partial', { count: failed }) : t('duplicate.done'), { type: failed ? 'warning' : 'info' })
    emit('open-page', { id: copy.id })
  } catch (e) {
    dialogs.toast(t('error.saveFailed', { message: e.message }), { type: 'error' })
  }
}

async function remove() {
  const ok = await dialogs.confirm({ title: t('page.delete'), message: t('page.deleteConfirm', { name: page.value.name }), confirmLabel: t('common.delete'), danger: true })
  if (!ok) return
  const result = await trySave(ctx, () => ctx.provider.deletePage(page.value.id), { item: 'page' })
  if (result.ok) emit('page-deleted', { id: page.value.id })
}

async function showVersions() {
  const restored = await dialogs.open(VersionHistoryDialog, { kind: 'page', id: page.value.id, name: page.value.name }, { size: 'lg' })
  if (restored) await load()
}

async function editBlock(block) {
  const savedBlock = await dialogs.open(BlockForm, { blockId: block.id }, { size: 'lg', keepOpenOnOutside: true })
  if (savedBlock) await reloadBlock(savedBlock.id)
}

const pageMenu = computed(() => {
  const items = []
  if (ctx.can('pages', 'canCreate')) items.push({ label: t('page.duplicate'), onSelect: duplicate })
  if (page.value?.canEdit) items.push({ label: t('versions.title'), onSelect: showVersions })
  if (page.value?.canDelete) items.push({ separator: true }, { label: t('page.delete'), danger: true, onSelect: remove })
  return items
})

// ---- edit mode ----

async function cancelEdit() {
  if (editor.dirty.value) {
    const ok = await dialogs.confirm({ title: t('unsaved.title'), message: t('unsaved.discard'), confirmLabel: t('common.discard'), danger: true })
    if (!ok) return
  }
  editor.stop()
}

async function saveEdit() {
  const draft = editor.draft.value
  if (draft.visibility === 'public') {
    const privateCount = blockIdsOf(draft).filter((id) => blocks[id]?.visibility === 'private').length
    if (privateCount) {
      const ok = await dialogs.confirm({ title: t('page.privateBlocksTitle'), message: t('page.privateBlocks', { count: privateCount }), confirmLabel: t('common.save') })
      if (!ok) return
    }
  }
  const result = await trySave(ctx, () => ctx.provider.updatePage(clone(draft)), {
    item: 'page',
    onReload: async () => {
      editor.stop()
      await load()
    },
  })
  if (!result.ok) return
  page.value = result.value
  editor.stop()
  dialogs.toast(t('page.saved'))
  emit('page-saved', result.value)
}

// Where each block sits: "Page" or 'Tab "Purchasing"'.
function blockLocations(page) {
  const where = {}
  for (const item of page.layout) {
    if (!item.tabGroupId) where[item.blockId] = t('edit.pageGrid')
    else for (const tab of item.tabs) for (const p of tab.blocks) where[p.blockId] = t('edit.tabTarget', { tab: tab.name })
  }
  return where
}

function blocksForFilterSetup() {
  const where = blockLocations(editor.draft.value)
  return blockIdsOf(editor.draft.value)
    .filter((id) => blocks[id])
    .map((id) => ({ id, name: blocks[id].name, where: where[id], source: blocks[id].source, fields: fields[id] ?? [] }))
}

async function setupFilters(focusBlockId = null) {
  const result = await dialogs.open(FilterSetupDialog, { filters: editor.draft.value.filters, blocks: blocksForFilterSetup(), focusBlockId }, { size: 'lg' })
  if (result) editor.setFilters(result)
}

async function addBlock() {
  const choice = await dialogs.open(AddBlockDialog, { excludeIds: blockIdsOf(editor.draft.value), targets: gridTargets.value })
  if (!choice) return
  let blockId = choice.blockId
  if (choice.kind === 'new') {
    // Saved in the block form before it is placed; Cancel of the page edit keeps it in the library.
    const created = await dialogs.open(BlockForm, { blockId: null }, { size: 'lg', keepOpenOnOutside: true })
    if (!created) return
    blockId = created.id
  }
  await loadBlocks([blockId])
  editor.addBlock(blockId, choice.target)
  // Remind the builder to map existing filters to the new block.
  if (editor.draft.value.filters.length && blocks[blockId]?.source) {
    const map = await dialogs.confirm({
      title: t('edit.mapFiltersTitle'),
      message: t('edit.mapFilters', { count: editor.draft.value.filters.length }),
      confirmLabel: t('edit.mapNow'),
      cancelLabel: t('edit.later'),
    })
    if (map) await setupFilters(blockId)
  }
}

async function addTabGroup() {
  const name = await dialogs.prompt({ title: t('tabs.newGroup'), label: t('tabs.firstTabName'), value: t('tabs.defaultName') })
  if (name) editor.addTabGroup(name)
}

async function editTabGroup(group, event) {
  if (event.op === 'add-tab' || event.op === 'rename-tab') {
    const current = group.tabs.find((tab) => tab.id === event.tabId)
    const name = await dialogs.prompt({ title: t(event.op === 'add-tab' ? 'tabs.add' : 'tabs.rename'), label: t('tabs.name'), value: current?.name ?? '' })
    if (!name) return
    editor.editTabGroup(group.tabGroupId, { ...event, name })
    return
  }
  if (event.op === 'remove-group' || event.op === 'remove-tab') {
    const ok = await dialogs.confirm({ title: t(event.op === 'remove-group' ? 'tabs.removeGroup' : 'tabs.remove'), message: t('tabs.removeHint'), confirmLabel: t('common.remove'), danger: true })
    if (!ok) return
  }
  editor.editTabGroup(group.tabGroupId, event)
}

async function editSettings() {
  const draft = editor.draft.value
  const result = await dialogs.open(PageSettingsDialog, {
    title: t('page.settings'),
    partOfEdit: true,
    name: draft.name,
    description: draft.description,
    visibility: draft.visibility,
    canPublish: ctx.can('pages', 'canPublish'),
  })
  if (result) editor.setDetails(result)
}

function onKeydown(event) {
  if (!editing.value || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return
  const mod = event.ctrlKey || event.metaKey
  if (mod && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault()
    editor.undo()
  } else if (mod && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
    event.preventDefault()
    editor.redo()
  }
}

function onMediaChange() {
  smallScreen.value = media.matches
}

onMounted(() => {
  media = window.matchMedia(`(max-width: ${SMALL_SCREEN - 1}px)`)
  onMediaChange()
  media.addEventListener('change', onMediaChange)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  media?.removeEventListener('change', onMediaChange)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="db-root db-page" :class="{ 'db-page--panel-open': ctx.panel.openId }">
    <div v-if="loadState === 'loading'" class="db-page__state"><span class="db-spinner" /> {{ $dbt('common.loading') }}</div>
    <div v-else-if="loadState === 'not-found'" class="db-page__state">
      <slot name="page-not-available">{{ $dbt('page.notAvailable') }}</slot>
    </div>
    <div v-else-if="loadState === 'error'" class="db-page__state db-error">
      {{ $dbt('page.loadError', { message: loadError?.message ?? '' }) }}
      <button type="button" class="db-btn db-btn--small" @click="load">{{ $dbt('common.retry') }}</button>
    </div>

    <template v-else>
      <header v-if="!editing" class="db-page__header">
        <div class="db-page__title-wrap">
          <h2 class="db-page__title">{{ shown.name }}</h2>
          <p class="db-page__meta">{{ pageMeta }}</p>
        </div>
        <div class="db-toolbar">
          <button
            type="button"
            class="db-icon-btn db-star"
            :class="{ 'db-star--on': page.isFavourite }"
            :aria-pressed="page.isFavourite"
            :aria-label="$dbt(page.isFavourite ? 'page.unfavourite' : 'page.favourite')"
            :title="$dbt(page.isFavourite ? 'page.unfavourite' : 'page.favourite')"
            @click="toggleFavourite"
          >
            <DbIcon name="star" :size="18" :filled="page.isFavourite" />
          </button>
          <button v-if="canEditPage" type="button" class="db-btn" @click="editor.start()"><DbIcon name="pencil" :size="15" /> {{ $dbt('page.edit') }}</button>
          <DbMenu v-if="pageMenu.length" :items="pageMenu">
            <button type="button" class="db-icon-btn" :aria-label="$dbt('page.actions')" :title="$dbt('page.actions')"><DbIcon name="more" /></button>
          </DbMenu>
        </div>
      </header>

      <div v-else class="db-edit-bar" role="toolbar" :aria-label="$dbt('edit.toolbar')">
        <span class="db-edit-bar__mode">{{ $dbt('edit.editing') }}</span>
        <span class="db-edit-bar__name">{{ shown.name }}</span>
        <span v-if="editor.dirty.value" class="db-badge db-badge--danger">{{ $dbt('unsaved.badge') }}</span>
        <span class="db-spacer" />
        <button type="button" class="db-icon-btn" :disabled="!editor.canUndo.value" :title="$dbt('edit.undoKey')" :aria-label="$dbt('edit.undo')" @click="editor.undo()"><DbIcon name="undo" /></button>
        <button type="button" class="db-icon-btn" :disabled="!editor.canRedo.value" :title="$dbt('edit.redoKey')" :aria-label="$dbt('edit.redo')" @click="editor.redo()"><DbIcon name="redo" /></button>
        <span class="db-edit-bar__divider" aria-hidden="true" />
        <button type="button" class="db-btn" @click="addBlock">+ {{ $dbt('edit.addBlock') }}</button>
        <button type="button" class="db-btn" @click="addTabGroup">+ {{ $dbt('edit.addTabGroup') }}</button>
        <button type="button" class="db-btn" @click="setupFilters()">{{ $dbt('edit.filters') }}</button>
        <button type="button" class="db-btn" @click="editSettings">{{ $dbt('page.settings') }}</button>
        <span class="db-edit-bar__divider" aria-hidden="true" />
        <button type="button" class="db-btn" @click="cancelEdit">{{ $dbt('common.cancel') }}</button>
        <button type="button" class="db-btn db-btn--primary db-edit-bar__save" :disabled="!editor.dirty.value" @click="saveEdit">{{ $dbt('common.save') }}</button>
      </div>

      <div class="db-page__body" :class="{ 'db-page__body--editing': editing }">
      <FilterPanel
        v-if="shown.filters.length"
        v-model:collapsed="filtersCollapsed"
        :filters="shown.filters"
        :state="filters"
        :saved="editing ? null : saved"
        :panel-id="`filters:${page.id}`"
      />
      <div class="db-page__content">
      <p v-if="!shown.layout.length" class="db-page__empty">{{ $dbt(editing ? 'page.emptyEditing' : 'page.empty') }}</p>

      <PageGrid :items="pageItems" :editing="editing" handle="db-drag-handle--page" @layout-change="(layout) => editor.applyLayout('page', layout)">
        <template #item="{ item: gridItem }">
          <TabGroup
            v-if="gridItem.item.tabGroupId"
            :group="gridItem.item"
            :active-tab-id="activeTab(gridItem.item)"
            :editing="editing"
            @select-tab="(tabId) => selectTab(gridItem.item, tabId)"
            @layout-change="(tabId, layout) => editor.applyLayout(tabId, layout)"
            @edit="(event) => editTabGroup(gridItem.item, event)"
          >
            <template #block="{ placement, tabId }">
              <PageBlockCell
                :placement="placement"
                :block="blocks[placement.blockId] ?? null"
                :editing="editing"
                handle="db-drag-handle--tab"
                :grid-key="tabId"
                :move-targets="gridTargets"
                :page-conditions="conditionsFor(placement.blockId)"
                :filter-values="filters.applied"
                :reload-signal="reloadSignal"
                @remove="editor.removeBlock(placement.blockId)"
                @move="(target) => editor.moveBlock(placement.blockId, target)"
                @open-record="emit('open-record', $event)"
                @edit-block="editBlock"
              >
                <template v-for="(_, name) in $slots" #[name]="scope"><slot :name="name" v-bind="scope ?? {}" /></template>
              </PageBlockCell>
            </template>
          </TabGroup>
          <PageBlockCell
            v-else
            :placement="gridItem.item"
            :block="blocks[gridItem.item.blockId] ?? null"
            :editing="editing"
            handle="db-drag-handle--page"
            grid-key="page"
            :move-targets="gridTargets"
            :page-conditions="conditionsFor(gridItem.item.blockId)"
            :filter-values="filters.applied"
            :reload-signal="reloadSignal"
            @remove="editor.removeBlock(gridItem.item.blockId)"
            @move="(target) => editor.moveBlock(gridItem.item.blockId, target)"
            @open-record="emit('open-record', $event)"
            @edit-block="editBlock"
          >
            <template v-for="(_, name) in $slots" #[name]="scope"><slot :name="name" v-bind="scope ?? {}" /></template>
          </PageBlockCell>
        </template>
      </PageGrid>
      </div>
      </div>
    </template>
  </div>
</template>
