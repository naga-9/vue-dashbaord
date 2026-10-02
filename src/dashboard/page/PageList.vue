<script setup>
// Page list component (overall.md 2 → Block library, page list and version history UI, screen 2):
// the user's own pages plus public pages, with favourites. The host places it (e.g. in its sidebar)
// and handles open-page.
import { computed, onMounted, ref } from 'vue'
import { useDashboard } from '../core/plugin.js'
import { trySave } from '../core/saving.js'
import { duplicatePage } from '../core/duplicate.js'
import DbMenu from '../ui/DbMenu.vue'
import DbIcon from '../ui/DbIcon.js'
import PageSettingsDialog from './PageSettingsDialog.vue'

defineProps({ activePageId: { type: String, default: null } })
const emit = defineEmits(['open-page', 'page-created', 'page-deleted', 'favourites-changed'])

const ctx = useDashboard()
const { t, dialogs } = ctx
const pages = ref([])
const loading = ref(true)
const error = ref(null)
const search = ref('')

const visible = computed(() => {
  const term = search.value.toLowerCase()
  return pages.value.filter((p) => !term || p.name.toLowerCase().includes(term)).sort((a, b) => a.name.localeCompare(b.name))
})

async function load() {
  loading.value = true
  try {
    await ctx.ready
    pages.value = await ctx.provider.listPages()
    error.value = null
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function create() {
  const details = await dialogs.open(PageSettingsDialog, { title: t('page.new'), confirmLabel: t('common.create'), canPublish: ctx.can('pages', 'canPublish') })
  if (!details) return
  const result = await trySave(ctx, () => ctx.provider.createPage({ ...details, layout: [], filters: [] }), { item: 'page' })
  if (!result.ok) return
  await load()
  emit('page-created', { id: result.value.id })
  emit('open-page', { id: result.value.id })
}

async function toggleFavourite(page) {
  const result = await trySave(ctx, () => ctx.provider.setFavourite(page.id, !page.isFavourite), { item: 'page' })
  if (!result.ok) return
  page.isFavourite = !page.isFavourite
  emit('favourites-changed')
}

async function duplicate(page) {
  try {
    const { copy, failed } = await duplicatePage(ctx, page)
    dialogs.toast(failed ? t('duplicate.partial', { count: failed }) : t('duplicate.done'), { type: failed ? 'warning' : 'info' })
    await load()
    emit('open-page', { id: copy.id })
  } catch (e) {
    dialogs.toast(t('error.saveFailed', { message: e.message }), { type: 'error' })
  }
}

async function remove(page) {
  const ok = await dialogs.confirm({ title: t('page.delete'), message: t('page.deleteConfirm', { name: page.name }), confirmLabel: t('common.delete'), danger: true })
  if (!ok) return
  const result = await trySave(ctx, () => ctx.provider.deletePage(page.id), { item: 'page' })
  if (!result.ok) return
  await load()
  emit('page-deleted', { id: page.id })
}

function menuFor(page) {
  const items = []
  if (ctx.can('pages', 'canCreate')) items.push({ label: t('page.duplicate'), onSelect: () => duplicate(page) })
  if (page.canDelete) items.push({ separator: true }, { label: t('page.delete'), danger: true, onSelect: () => remove(page) })
  return items
}

defineExpose({ reload: load })
</script>

<template>
  <nav class="db-root db-nav-card" :aria-label="$dbt('pageList.title')">
    <div class="db-nav-card__head">
      <h3 class="db-nav-card__title">{{ $dbt('pageList.title') }}</h3>
      <button v-if="ctx.can('pages', 'canCreate')" type="button" class="db-icon-btn db-icon-btn--small db-nav-card__add" :aria-label="$dbt('page.new')" :title="$dbt('page.new')" @click="create">
        <DbIcon name="plus" :size="15" />
      </button>
    </div>
    <label class="db-search db-search--small">
      <DbIcon name="search" :size="13" />
      <input v-model="search" :aria-label="$dbt('pageList.search')" :placeholder="$dbt('pageList.search')" />
    </label>
    <p v-if="loading" class="db-muted">{{ $dbt('common.loading') }}</p>
    <p v-else-if="error" class="db-error">{{ error.message }}</p>
    <ul v-else class="db-nav-list">
      <li v-for="page in visible" :key="page.id" class="db-nav-list__row" :class="{ 'db-nav-list__row--active': page.id === activePageId }">
        <a href="#" class="db-nav-list__link" :aria-current="page.id === activePageId ? 'page' : undefined" @click.prevent="emit('open-page', { id: page.id })">
          <span class="db-ellipsis">{{ page.name }}</span>
          <template v-if="page.visibility === 'private'"><DbIcon name="lock" :size="12" /><span class="db-visually-hidden">{{ $dbt('visibility.private') }}</span></template>
        </a>
        <span class="db-nav-list__owner">{{ page.isMine ? $dbt('pageList.mine') : page.ownerName }}</span>
        <button
          type="button"
          class="db-icon-btn db-icon-btn--small db-star"
          :class="{ 'db-star--on': page.isFavourite }"
          :aria-pressed="page.isFavourite"
          :aria-label="$dbt(page.isFavourite ? 'page.unfavourite' : 'page.favourite')"
          :title="$dbt(page.isFavourite ? 'page.unfavourite' : 'page.favourite')"
          @click="toggleFavourite(page)"
        >
          <DbIcon name="star" :size="14" :filled="page.isFavourite" />
        </button>
        <DbMenu v-if="menuFor(page).length" :items="menuFor(page)">
          <button type="button" class="db-icon-btn db-icon-btn--small" :aria-label="$dbt('page.actions')" :title="$dbt('page.actions')"><DbIcon name="more" :size="14" /></button>
        </DbMenu>
      </li>
      <li v-if="!visible.length" class="db-muted db-nav-list__empty">{{ $dbt('pageList.empty') }}</li>
    </ul>
  </nav>
</template>
