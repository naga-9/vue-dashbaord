<script setup>
// Favourite pages component (screen 2): the user's favourites; the host places it anywhere.
import { onMounted, ref } from 'vue'
import { useDashboard } from '../core/plugin.js'
import DbIcon from '../ui/DbIcon.js'

defineProps({ activePageId: { type: String, default: null } })
const emit = defineEmits(['open-page'])

const ctx = useDashboard()
const pages = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    await ctx.ready
    pages.value = (await ctx.provider.listPages()).filter((p) => p.isFavourite).sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    pages.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
defineExpose({ reload: load })
</script>

<template>
  <nav class="db-root db-nav-card" :aria-label="$dbt('favourites.title')">
    <div class="db-nav-card__head">
      <h3 class="db-nav-card__title">{{ $dbt('favourites.heading') }}</h3>
    </div>
    <p v-if="loading" class="db-muted">{{ $dbt('common.loading') }}</p>
    <ul v-else class="db-nav-list">
      <li v-for="page in pages" :key="page.id" class="db-nav-list__row" :class="{ 'db-nav-list__row--active': page.id === activePageId }">
        <a href="#" class="db-nav-list__link" :aria-current="page.id === activePageId ? 'page' : undefined" @click.prevent="emit('open-page', { id: page.id })">
          <span class="db-star db-star--on"><DbIcon name="star" :size="14" :filled="true" /></span>
          <span class="db-ellipsis">{{ page.name }}</span>
        </a>
      </li>
      <li v-if="!pages.length" class="db-muted db-nav-list__empty">{{ $dbt('favourites.empty') }}</li>
    </ul>
  </nav>
</template>
