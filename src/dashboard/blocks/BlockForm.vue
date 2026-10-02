<script setup>
// Edit block modal (overall.md 4 → Block UI, screen 4): form on the left, live preview on the right.
// Same modal for the Edit block icon, "Add block → New" and the block library.
import { computed, onMounted, ref, shallowRef } from 'vue'
import { clone } from '../core/clone.js'
import { useDashboard } from '../core/plugin.js'
import { trySave } from '../core/saving.js'
import DialogFrame from '../ui/DialogFrame.vue'
import RuleList from '../formatting/RuleList.vue'
import ConditionEditor from './ConditionEditor.vue'
import DashboardBlock from './DashboardBlock.vue'
import VersionHistoryDialog from './VersionHistoryDialog.vue'

const props = defineProps({
  blockId: { type: String, default: null }, // null = new block
})
const emit = defineEmits(['close'])

const ctx = useDashboard()
const { t, dialogs } = ctx
const original = ref(null)
const draft = ref(null)
const loadError = ref(null)
const sources = ref([])
const fields = shallowRef([])
const usage = ref(0)
const saving = ref(false)

const isNew = computed(() => !props.blockId)
const widget = computed(() => (draft.value ? ctx.widgets.get(draft.value.widgetType) : null))
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(original.value))
const canPublish = computed(() => ctx.can('blocks', 'canPublish') || original.value?.visibility === 'public')
const previewBlock = computed(() => (draft.value ? { ...draft.value, id: draft.value.id ?? '__preview', name: draft.value.name || t('blockForm.untitled') } : null))

function blank() {
  const first = ctx.widgets.all()[0]
  return { name: '', description: '', visibility: 'private', widgetType: first.type, source: null, fixedConditions: [], formatting: [], widgetConfig: first.defaultConfig([]) }
}

async function load() {
  loadError.value = null
  try {
    sources.value = await ctx.listSources()
    if (isNew.value) {
      original.value = blank()
    } else {
      const [block] = await ctx.provider.getBlocks([props.blockId])
      if (!block) throw new Error(t('error.notFound'))
      original.value = block
      usage.value = (await ctx.provider.getBlockUsage(props.blockId)).pageCount
    }
    draft.value = clone(original.value)
    fields.value = await ctx.getFields(draft.value.source)
  } catch (e) {
    loadError.value = e
  }
}

onMounted(load)

// A different source: start the widget config again from its defaults, drop fixed conditions and rules.
async function setSource(sourceId) {
  const source = sourceId || null
  fields.value = await ctx.getFields(source)
  draft.value = { ...draft.value, source, fixedConditions: [], formatting: [], widgetConfig: widget.value.defaultConfig(fields.value) }
}

function setWidgetType(type) {
  const def = ctx.widgets.get(type)
  draft.value = { ...draft.value, widgetType: type, formatting: [], widgetConfig: def.defaultConfig(fields.value) }
}

async function save() {
  if (!draft.value.name.trim()) return
  saving.value = true
  const data = { ...clone(draft.value), name: draft.value.name.trim() }
  const result = await trySave(ctx, () => (isNew.value ? ctx.provider.createBlock(data) : ctx.provider.updateBlock(data)), {
    item: 'block',
    onReload: load,
  })
  saving.value = false
  if (!result.ok) return
  ctx.blockVersions[result.value.id] = (ctx.blockVersions[result.value.id] ?? 0) + 1
  dialogs.toast(t('blockForm.saved'))
  emit('close', result.value)
}

async function close() {
  if (dirty.value) {
    const ok = await dialogs.confirm({ title: t('unsaved.title'), message: t('unsaved.discard'), confirmLabel: t('common.discard'), danger: true })
    if (!ok) return
  }
  emit('close', null)
}

async function showVersions() {
  const restored = await dialogs.open(VersionHistoryDialog, { kind: 'block', id: props.blockId, name: original.value.name }, { size: 'lg' })
  if (restored) await load()
}
</script>

<template>
  <DialogFrame :title="isNew ? $dbt('blockForm.newTitle') : $dbt('blockForm.editTitle')" @close="close">
    <template #title-extra>
      <span v-if="dirty" class="db-badge db-badge--danger">{{ $dbt('unsaved.badge') }}</span>
    </template>

    <p v-if="loadError" class="db-error">{{ $dbt('block.error', { message: loadError.message }) }}</p>
    <div v-else-if="!draft" class="db-muted"><span class="db-spinner" /> {{ $dbt('common.loading') }}</div>

    <div v-else class="db-block-form">
      <div class="db-block-form__settings">
        <p v-if="usage > 1" class="db-note">{{ $dbt('blockForm.usedOnPages', { count: usage }) }}</p>

        <div class="db-form-grid">
          <label class="db-field db-form-grid__wide">
            <span class="db-field__label">{{ $dbt('common.name') }} *</span>
            <input v-model="draft.name" class="db-input" autofocus />
          </label>
          <label class="db-field db-form-grid__wide">
            <span class="db-field__label">{{ $dbt('common.description') }}</span>
            <input v-model="draft.description" class="db-input" />
          </label>
          <label v-if="isNew" class="db-field db-form-grid__wide">
            <span class="db-field__label">{{ $dbt('blockForm.widget') }}</span>
            <select class="db-input" :value="draft.widgetType" @change="setWidgetType($event.target.value)">
              <option v-for="w in ctx.widgets.all()" :key="w.type" :value="w.type">{{ $dbt(w.label) }}</option>
            </select>
          </label>
          <label class="db-field">
            <span class="db-field__label">{{ $dbt('blockForm.source') }}</span>
            <select class="db-input" :value="draft.source ?? ''" @change="setSource($event.target.value)">
              <option value="">{{ $dbt('blockForm.noSource') }}</option>
              <option v-for="s in sources" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
          </label>
          <label class="db-field">
            <span class="db-field__label">{{ $dbt('common.visibility') }}</span>
            <select v-model="draft.visibility" class="db-input">
              <option value="private">{{ $dbt('visibility.private') }}</option>
              <option value="public" :disabled="!canPublish">{{ $dbt('visibility.public') }}</option>
            </select>
          </label>
        </div>

        <section v-if="draft.source" class="db-form-section">
          <h3 class="db-panel-section__title">{{ $dbt('blockForm.fixedConditions') }}</h3>
          <ConditionEditor v-model="draft.fixedConditions" :fields="fields" />
        </section>

        <component :is="widget.configForm" v-if="widget" v-model="draft.widgetConfig" :fields="fields" />

        <section v-if="widget?.formattingTargets?.length && draft.source" class="db-form-section">
          <h3 class="db-panel-section__title">{{ $dbt('blockForm.formatting') }}</h3>
          <RuleList v-model="draft.formatting" :fields="fields" :targets="widget.formattingTargets" />
        </section>
      </div>

      <div class="db-block-form__preview">
        <h3 class="db-panel-section__title">{{ $dbt('blockForm.preview', { count: ctx.options.previewRowLimit }) }}</h3>
        <div class="db-block-form__preview-box">
          <DashboardBlock :key="`${draft.widgetType}:${draft.source}`" :block="previewBlock" preview />
        </div>
      </div>
    </div>

    <template #footer>
      <button v-if="!isNew && original?.canEdit" type="button" class="db-btn db-btn--ghost db-btn--link" @click="showVersions">{{ $dbt('versions.title') }}</button>
      <span class="db-spacer" />
      <button type="button" class="db-btn" @click="close">{{ $dbt('common.cancel') }}</button>
      <button type="button" class="db-btn db-btn--primary" :disabled="!draft || !draft.name.trim() || saving || (!dirty && !isNew)" @click="save">
        {{ $dbt('common.save') }}
      </button>
    </template>
  </DialogFrame>
</template>
