<script setup>
// Version history of a page or block (overall.md 2 → screen 3, overall.md 8): versions on the left;
// the selected one on the right, with the rows that differ from the current version highlighted.
// Restoring creates a new version, so nothing is lost.
import { computed, onMounted, ref } from 'vue'
import { useDashboard } from '../core/plugin.js'
import { trySave } from '../core/saving.js'
import DialogFrame from '../ui/DialogFrame.vue'

const props = defineProps({
  kind: { type: String, required: true }, // 'page' | 'block'
  id: { type: String, required: true },
  name: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const ctx = useDashboard()
const { t, dialogs } = ctx
const versions = ref([])
const items = ref({}) // versionId → item as it was
const selectedId = ref(null)
const error = ref(null)
const restoring = ref(false)
const sources = ref([])

const formatTime = (iso) => new Intl.DateTimeFormat(ctx.formatEnv().locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
const currentId = computed(() => versions.value[0]?.versionId)
const selected = computed(() => versions.value.find((v) => v.versionId === selectedId.value))

async function loadItem(versionId) {
  if (items.value[versionId]) return
  // Await first, then merge: two loads run at the same time and must not overwrite each other.
  const item = await ctx.provider.getVersion(props.kind, props.id, versionId)
  items.value = { ...items.value, [versionId]: item }
}

async function select(versionId) {
  selectedId.value = versionId
  try {
    await Promise.all([loadItem(versionId), loadItem(currentId.value)])
  } catch (e) {
    dialogs.toast(e.message, { type: 'error' })
  }
}

onMounted(async () => {
  try {
    ;[versions.value, sources.value] = await Promise.all([ctx.provider.listVersions(props.kind, props.id), ctx.listSources().catch(() => [])])
    if (versions.value.length) await select(versions.value[Math.min(1, versions.value.length - 1)].versionId)
  } catch (e) {
    error.value = e
  }
})

// A short, readable summary of an item: [{ label, value }].
function summary(item) {
  const base = [
    { label: t('common.name'), value: item.name },
    { label: t('common.visibility'), value: t(`visibility.${item.visibility}`) },
    { label: t('common.description'), value: item.description || '—' },
  ]
  if (props.kind === 'page') {
    const blocks = item.layout.reduce((n, i) => n + (i.tabGroupId ? i.tabs.reduce((m, tab) => m + tab.blocks.length, 0) : 1), 0)
    const groups = item.layout.filter((i) => i.tabGroupId).length
    return [
      ...base,
      { label: t('versions.layout'), value: t('versions.layoutValue', { blocks, groups }) },
      { label: t('filterSetup.title'), value: item.filters.map((f) => f.label).join(', ') || '—' },
    ]
  }
  return [
    ...base,
    { label: t('blockForm.source'), value: item.source ? (sources.value.find((s) => s.id === item.source)?.label ?? item.source) : t('blockForm.noSourceShort') },
    { label: t('blockForm.fixedConditions'), value: String(item.fixedConditions?.length ?? 0) },
    { label: t('table.columns'), value: (item.widgetConfig?.columns ?? []).map((c) => c.label || c.field).join(', ') || '—' },
    { label: t('versions.rules'), value: String(item.formatting?.length ?? 0) },
  ]
}

// Rows of the selected version, flagged where they differ from the current version.
const rows = computed(() => {
  const item = items.value[selectedId.value]
  const current = items.value[currentId.value]
  if (!item) return []
  const now = current ? summary(current) : []
  return summary(item).map((row, i) => ({ ...row, now: now[i]?.value, changed: Boolean(current) && now[i]?.value !== row.value }))
})

async function restore() {
  restoring.value = true
  const result = await trySave(ctx, () => ctx.provider.restoreVersion(props.kind, props.id, selectedId.value), { item: props.kind })
  restoring.value = false
  if (!result.ok) return
  dialogs.toast(t('versions.restored'))
  emit('close', result.value)
}
</script>

<template>
  <DialogFrame :title="`${$dbt('versions.title')} · ${name}`" @close="emit('close', null)">
    <p v-if="error" class="db-error">{{ error.message }}</p>
    <div v-else class="db-versions">
      <div class="db-versions__list" role="listbox" :aria-label="$dbt('versions.title')">
        <button
          v-for="version in versions"
          :key="version.versionId"
          type="button"
          role="option"
          class="db-versions__item"
          :aria-selected="version.versionId === selectedId"
          @click="select(version.versionId)"
        >
          <span class="db-versions__time">
            {{ formatTime(version.modified) }}
            <span v-if="version.versionId === currentId" class="db-tag db-tag--success">{{ $dbt('versions.current') }}</span>
          </span>
          <span class="db-muted">{{ version.modifiedBy }}</span>
        </button>
      </div>

      <div v-if="selected" class="db-versions__detail">
        <div class="db-versions__head">
          <h3 class="db-versions__title">{{ formatTime(selected.modified) }} · {{ selected.modifiedBy }}</h3>
          <button v-if="selected.versionId !== currentId" type="button" class="db-btn db-btn--primary" :disabled="restoring" @click="restore">
            {{ $dbt('versions.restoreThis') }}
          </button>
        </div>
        <p class="db-muted">{{ selected.versionId === currentId ? $dbt('versions.isCurrent') : $dbt('versions.restoreNote') }}</p>
        <div class="db-versions__rows">
          <div v-for="row in rows" :key="row.label" class="db-versions__row" :class="{ 'db-versions__row--changed': row.changed }">
            <span class="db-versions__label">{{ row.label }}</span>
            <span class="db-versions__value">
              {{ row.value }}
              <span v-if="row.changed" class="db-versions__now">({{ $dbt('versions.now', { value: row.now }) }})</span>
            </span>
          </div>
        </div>
        <p v-if="rows.some((r) => r.changed)" class="db-muted db-small">{{ $dbt('versions.changedNote') }}</p>
      </div>
    </div>
  </DialogFrame>
</template>
