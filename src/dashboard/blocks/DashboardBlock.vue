<script setup>
// Block shell (overall.md 4 → Block UI): header, side panel, loading/error/empty states, fullscreen.
// Header: title left; widget icons (max 2, rest in "More") | views, refresh, settings, edit block, fullscreen.
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useDashboard } from '../core/plugin.js'
import { resolveRules } from '../core/dynamicValues.js'
import { exportCsv } from '../core/exportCsv.js'
import { isAbortError, useBlockData } from './useBlockData.js'
import { useSavedViews } from '../savedviews/useSavedItems.js'
import SavedItemsDropdown from '../savedviews/SavedItemsDropdown.vue'
import BlockViewsPanel from '../savedviews/BlockViewsPanel.vue'
import DbMenu from '../ui/DbMenu.vue'
import DbIcon from '../ui/DbIcon.js'

const MAX_WIDGET_ICONS = 2
const NARROW_HEADER = 440 // px; below this all widget icons go into "More"

const props = defineProps({
  block: { type: Object, required: true },
  pageConditions: { type: Array, default: () => [] }, // page filters, already translated for this block
  filterValues: { type: Object, default: () => ({}) }, // applied page filter values (dynamic value context)
  reloadSignal: { type: Number, default: 0 }, // bumped by the page on Apply
  preview: Boolean, // live preview in the block form (no header, few rows)
})
const emit = defineEmits(['open-record', 'edit-block'])

const ctx = useDashboard()
const { t } = ctx
const widget = computed(() => ctx.widgets.get(props.block.widgetType))
const widgetRef = ref(null)
const headerEl = ref(null)
const narrow = ref(false)
const fields = shallowRef([])
const fieldsState = ref('loading') // loading | ready | error
const fieldsError = ref(null)
const fullscreen = ref(false)
const rules = shallowRef([])
const exporting = ref(false)
let headerObserver = null

const data = useBlockData(ctx, () => ({ block: props.block, pageConditions: props.pageConditions, filterValues: props.filterValues }), {
  preview: props.preview,
})

const hasSource = computed(() => Boolean(props.block.source))
const views = widget.value?.savedViews && !props.preview ? useSavedViews(ctx, () => props.block.id) : null
const showViews = computed(() => Boolean(views) && hasSource.value)
const viewState = computed(() => (views ? views.content.state : null))
const panelId = computed(() => `block:${props.block.id}`)
const panelOpen = computed(() => ctx.panel.openId === panelId.value)

async function loadFields() {
  fieldsState.value = 'loading'
  try {
    fields.value = await ctx.getFields(props.block.source)
    fieldsState.value = 'ready'
  } catch (e) {
    fieldsError.value = e
    fieldsState.value = 'error'
  }
}

// Block rules first, then the view's own rules (later rules win). Dynamic values resolved here.
async function updateRules() {
  const all = [...(props.block.formatting ?? []), ...(views?.content.formatting ?? [])]
  try {
    rules.value = await resolveRules(all, ctx.dynamicValues, ctx.resolveContext(props.filterValues))
  } catch {
    rules.value = all.filter((r) => !r.when?.some((c) => c.value?.dynamic))
  }
}

onMounted(() => {
  loadFields()
  views?.load()
  if (headerEl.value) {
    headerObserver = new ResizeObserver(([entry]) => {
      narrow.value = entry.contentRect.width < NARROW_HEADER
    })
    headerObserver.observe(headerEl.value)
  }
})
onBeforeUnmount(() => headerObserver?.disconnect())

watch(() => props.block.source, loadFields)
watch(() => [props.block.formatting, views?.content.formatting], updateRules, { deep: true, immediate: true })
watch(
  () => [JSON.stringify(props.pageConditions), JSON.stringify(props.block.fixedConditions), props.reloadSignal],
  () => data.reload(),
)
watch(() => props.block.modified, () => data.reload())

async function exportData() {
  const source = widgetRef.value?.getExportData?.()
  if (!source) return
  exporting.value = true
  try {
    const result = await exportCsv(ctx, { block: props.block, exportData: source, pageConditions: props.pageConditions, filterValues: props.filterValues })
    if (result.cutOff) ctx.dialogs.toast(t('export.cutOff', { count: result.exported, total: result.total }), { type: 'warning', timeout: 8000 })
  } catch (e) {
    if (!isAbortError(e)) ctx.dialogs.toast(t('export.failed', { message: e.message }), { type: 'error' })
  } finally {
    exporting.value = false
  }
}

// The widget's own icons (left of the divider): Download for widgets that export, then its actions.
const widgetActions = computed(() => {
  const def = widget.value
  const list = []
  if (hasSource.value && def?.exports?.includes('data')) list.push({ id: 'export', icon: 'download', label: t('block.exportCsv'), disabled: exporting.value, run: exportData })
  for (const action of def?.actions ?? []) {
    list.push({ id: action.id, icon: action.icon ?? 'more', label: t(action.label), run: () => widgetRef.value?.runAction?.(action.id) })
  }
  return list
})
const shownActions = computed(() => (narrow.value ? [] : widgetActions.value.slice(0, MAX_WIDGET_ICONS)))
const moreActions = computed(() =>
  widgetActions.value.slice(shownActions.value.length).map((a) => ({ label: a.label, disabled: a.disabled, onSelect: a.run })),
)

function togglePanel() {
  ctx.panel.openId = panelOpen.value ? null : panelId.value
}

const showOverlay = computed(() => hasSource.value && ['loading', 'error', 'empty'].includes(data.status.value))

function onKeydown(event) {
  if (event.key === 'Escape' && fullscreen.value && !panelOpen.value) fullscreen.value = false
}
</script>

<template>
  <Teleport to="body" :disabled="!fullscreen">
    <section class="db-block" :class="{ 'db-block--fullscreen db-root': fullscreen, 'db-block--preview': preview }" @keydown="onKeydown">
      <header ref="headerEl" class="db-block__header">
        <slot name="header" :block="block">
          <h3 class="db-block__title" :title="block.description || block.name">{{ block.name }}</h3>
        </slot>

        <div v-if="!preview" class="db-block__icons">
          <button
            v-for="action in shownActions"
            :key="action.id"
            type="button"
            class="db-icon-btn"
            :disabled="action.disabled"
            :aria-label="action.label"
            :title="action.label"
            @click="action.run()"
          >
            <DbIcon :name="action.icon" />
          </button>
          <DbMenu v-if="moreActions.length" :items="moreActions">
            <button type="button" class="db-icon-btn" :aria-label="$dbt('block.more')" :title="$dbt('block.more')"><DbIcon name="more" /></button>
          </DbMenu>
          <span v-if="widgetActions.length" class="db-block__divider" aria-hidden="true" />

          <SavedItemsDropdown v-if="showViews && views.loaded" :saved="views" show-changed />
          <button v-if="hasSource" type="button" class="db-icon-btn" :aria-label="$dbt('block.refresh')" :title="$dbt('block.refresh')" @click="data.reload()">
            <DbIcon name="refresh" />
          </button>
          <button
            v-if="showViews"
            type="button"
            class="db-icon-btn"
            :class="{ 'db-icon-btn--active': panelOpen }"
            :aria-pressed="panelOpen"
            :aria-label="$dbt('block.settings')"
            :title="$dbt('block.settings')"
            @click="togglePanel"
          >
            <DbIcon name="settings" />
          </button>
          <button
            v-if="block.canEdit"
            type="button"
            class="db-icon-btn"
            :aria-label="$dbt('block.edit')"
            :title="$dbt('block.edit')"
            @click="emit('edit-block', block)"
          >
            <DbIcon name="sliders" />
          </button>
          <button
            type="button"
            class="db-icon-btn"
            :aria-label="$dbt(fullscreen ? 'block.exitFullscreen' : 'block.fullscreen')"
            :title="$dbt(fullscreen ? 'block.exitFullscreen' : 'block.fullscreen')"
            @click="fullscreen = !fullscreen"
          >
            <DbIcon :name="fullscreen ? 'minimize' : 'maximize'" />
          </button>
        </div>
      </header>

      <div class="db-block__body">
        <div v-if="!widget" class="db-block__state db-block__state--error">{{ $dbt('block.unknownWidget', { type: block.widgetType }) }}</div>
        <div v-else-if="fieldsState === 'error'" class="db-block__state db-block__state--error">
          <slot name="error" :error="fieldsError">{{ $dbt('block.error', { message: fieldsError?.message ?? '' }) }}</slot>
        </div>
        <template v-else-if="fieldsState === 'ready'">
          <component
            :is="widget.component"
            ref="widgetRef"
            :config="block.widgetConfig ?? {}"
            :formatting="rules"
            :fields="fields"
            :fetch-data="hasSource ? data.fetchData : undefined"
            :reload-key="data.reloadKey.value"
            :state="viewState"
            @open-record="(record) => emit('open-record', { source: block.source, ...record })"
          />
          <div v-if="showOverlay" class="db-block__state" :class="`db-block__state--${data.status.value}`">
            <slot v-if="data.status.value === 'loading'" name="loading"><span class="db-spinner" aria-hidden="true" /> {{ $dbt('common.loading') }}</slot>
            <slot v-else-if="data.status.value === 'error'" name="error" :error="data.error.value">
              {{ $dbt('block.error', { message: data.error.value?.message ?? '' }) }}
              <button type="button" class="db-btn db-btn--small" @click="data.reload()">{{ $dbt('common.retry') }}</button>
            </slot>
            <slot v-else name="empty">{{ $dbt('block.empty') }}</slot>
          </div>
        </template>
        <div v-else class="db-block__state db-block__state--loading"><span class="db-spinner" aria-hidden="true" /></div>
      </div>
    </section>
  </Teleport>

  <BlockViewsPanel v-if="showViews && views.loaded && fieldsState === 'ready'" :panel-id="panelId" :block="block" :widget="widget" :fields="fields" :views="views" />
</template>
