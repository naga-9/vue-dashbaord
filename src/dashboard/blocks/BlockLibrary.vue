<script setup>
// Block library (overall.md 2 → Block library UI, screen 1): all blocks the user can see;
// create, edit, duplicate, delete without opening a page.
import { computed, onMounted, ref } from 'vue'
import { useDashboard } from '../core/plugin.js'
import { trySave } from '../core/saving.js'
import { duplicateBlock } from '../core/duplicate.js'
import DbMenu from '../ui/DbMenu.vue'
import DbIcon from '../ui/DbIcon.js'
import BlockForm from './BlockForm.vue'
import VersionHistoryDialog from './VersionHistoryDialog.vue'

const ctx = useDashboard()
const { t, dialogs } = ctx
const blocks = ref([])
const sources = ref([])
const loading = ref(true)
const error = ref(null)
const search = ref('')

const visible = computed(() => {
  const term = search.value.toLowerCase()
  return blocks.value
    .filter((b) => !term || b.name.toLowerCase().includes(term) || b.description?.toLowerCase().includes(term))
    .sort((a, b) => a.name.localeCompare(b.name))
})
const sourceLabel = (id) => (id ? (sources.value.find((s) => s.id === id)?.label ?? id) : t('blockForm.noSourceShort'))

async function load() {
  loading.value = true
  try {
    await ctx.ready
    ;[blocks.value, sources.value] = await Promise.all([ctx.provider.listBlocks(), ctx.listSources()])
    error.value = null
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function openForm(blockId = null) {
  const saved = await dialogs.open(BlockForm, { blockId }, { size: 'lg', keepOpenOnOutside: true })
  if (saved) await load()
}

async function duplicate(block) {
  try {
    const { failed } = await duplicateBlock(ctx, block)
    dialogs.toast(failed ? t('duplicate.partial', { count: failed }) : t('duplicate.done'), { type: failed ? 'warning' : 'info' })
    await load()
  } catch (e) {
    dialogs.toast(t('error.saveFailed', { message: e.message }), { type: 'error' })
  }
}

async function remove(block) {
  let message = t('library.deleteConfirm', { name: block.name })
  try {
    const { pageCount } = await ctx.provider.getBlockUsage(block.id)
    if (pageCount) message = t('library.deleteUsed', { name: block.name, count: pageCount })
  } catch {
    // usage unknown; ask anyway
  }
  const ok = await dialogs.confirm({ title: t('library.delete'), message, confirmLabel: t('common.delete'), danger: true })
  if (!ok) return
  const result = await trySave(ctx, () => ctx.provider.deleteBlock(block.id), { item: 'block' })
  if (!result.ok) return
  ctx.blockVersions[block.id] = (ctx.blockVersions[block.id] ?? 0) + 1
  await load()
}

async function versions(block) {
  const restored = await dialogs.open(VersionHistoryDialog, { kind: 'block', id: block.id, name: block.name }, { size: 'lg' })
  if (restored) {
    ctx.blockVersions[block.id] = (ctx.blockVersions[block.id] ?? 0) + 1
    await load()
  }
}

function menuFor(block) {
  const items = []
  if (ctx.can('blocks', 'canCreate')) items.push({ label: t('library.duplicate'), onSelect: () => duplicate(block) })
  if (block.canEdit) items.push({ label: t('versions.title'), onSelect: () => versions(block) })
  if (block.canDelete) items.push({ separator: true }, { label: t('library.deleteMenu'), danger: true, onSelect: () => remove(block) })
  return items
}
</script>

<template>
  <section class="db-root db-library">
    <header class="db-page__header">
      <div class="db-page__title-wrap">
        <h2 class="db-page__title">{{ $dbt('library.title') }}</h2>
        <p class="db-page__meta">{{ $dbt('library.subtitle') }}</p>
      </div>
      <div class="db-toolbar">
        <label class="db-search db-library__search">
          <DbIcon name="search" :size="14" />
          <input v-model="search" :aria-label="$dbt('edit.searchBlocks')" :placeholder="$dbt('edit.searchBlocks')" />
        </label>
        <button v-if="ctx.can('blocks', 'canCreate')" type="button" class="db-btn db-btn--primary db-library__new" @click="openForm()">
          <DbIcon name="plus" :size="15" /> {{ $dbt('library.new') }}
        </button>
      </div>
    </header>

    <p v-if="loading" class="db-muted">{{ $dbt('common.loading') }}</p>
    <p v-else-if="error" class="db-error">{{ error.message }}</p>
    <div v-else class="db-list-table" role="table" :aria-label="$dbt('library.title')">
      <div class="db-list-table__head" role="row">
        <span role="columnheader">{{ $dbt('common.name') }}</span>
        <span role="columnheader">{{ $dbt('blockForm.widget') }}</span>
        <span role="columnheader">{{ $dbt('blockForm.source') }}</span>
        <span role="columnheader">{{ $dbt('library.owner') }}</span>
        <span role="columnheader">{{ $dbt('common.visibility') }}</span>
        <span role="columnheader"><span class="db-visually-hidden">{{ $dbt('block.actions') }}</span></span>
      </div>
      <div v-for="block in visible" :key="block.id" class="db-list-table__row" role="row">
        <span class="db-list-table__name" role="cell">
          <button v-if="block.canEdit" type="button" class="db-link" @click="openForm(block.id)">{{ block.name }}</button>
          <strong v-else>{{ block.name }}</strong>
          <span v-if="block.description" class="db-muted db-ellipsis">{{ block.description }}</span>
        </span>
        <span role="cell">{{ $dbt(ctx.widgets.get(block.widgetType)?.label ?? block.widgetType) }}</span>
        <span role="cell">{{ sourceLabel(block.source) }}</span>
        <span role="cell">{{ block.isMine ? $dbt('pageList.mine') : block.ownerName }}</span>
        <span class="db-list-table__visibility" role="cell">
          <DbIcon v-if="block.visibility === 'private'" name="lock" :size="13" />
          {{ $dbt(`visibility.${block.visibility}`) }}
        </span>
        <span class="db-list-table__actions" role="cell">
          <button v-if="block.canEdit" type="button" class="db-icon-btn" :aria-label="$dbt('block.edit')" :title="$dbt('block.edit')" @click="openForm(block.id)">
            <DbIcon name="sliders" />
          </button>
          <DbMenu v-if="menuFor(block).length" :items="menuFor(block)">
            <button type="button" class="db-icon-btn" :aria-label="$dbt('block.actions')" :title="$dbt('block.actions')"><DbIcon name="more" /></button>
          </DbMenu>
        </span>
      </div>
      <p v-if="!visible.length" class="db-list-table__empty db-muted">{{ $dbt('library.empty') }}</p>
    </div>
  </section>
</template>
