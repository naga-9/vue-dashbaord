<script setup>
// Dev host app. The host owns layout, navigation and URL sync; the package provides the components.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { DashboardBlockLibrary, DashboardFavourites, DashboardPage, DashboardPageList, useDashboard } from './dashboard/index.js'

const props = defineProps({ settings: { type: Object, required: true } })
const dashboard = useDashboard()

// ---- URL ⇄ state (?page=…&tabs=…&f_customer=… or ?view=library) ----
const view = ref('page')
const pageId = ref(null)
const filterValues = ref({})
const openTabs = ref([])
const pageList = ref(null)
const favourites = ref(null)
const lastRecord = ref(null)

function readUrl() {
  const params = new URLSearchParams(location.search)
  view.value = params.get('view') === 'library' ? 'library' : 'page'
  pageId.value = params.get('page') ?? 'pg_sales'
  openTabs.value = params.get('tabs')?.split(',').filter(Boolean) ?? []
  const values = {}
  for (const key of new Set(params.keys())) {
    if (!key.startsWith('f_')) continue
    const all = params.getAll(key)
    values[key] = all.length === 1 ? all[0] : all
  }
  filterValues.value = values
}

function writeUrl(push = false) {
  const params = new URLSearchParams()
  if (view.value === 'library') params.set('view', 'library')
  else {
    params.set('page', pageId.value)
    if (openTabs.value.length) params.set('tabs', openTabs.value.join(','))
    for (const [key, value] of Object.entries(filterValues.value)) {
      for (const v of Array.isArray(value) ? value : [value]) params.append(key, v)
    }
  }
  const url = `${location.pathname}?${params}`
  if (url !== `${location.pathname}${location.search}`) history[push ? 'pushState' : 'replaceState'](null, '', url)
}

function openPage({ id }) {
  view.value = 'page'
  pageId.value = id
  filterValues.value = {}
  openTabs.value = []
  writeUrl(true)
}

function openLibrary() {
  view.value = 'library'
  writeUrl(true)
}

watch([filterValues, openTabs], () => writeUrl(), { deep: true })

function onPopState() {
  readUrl()
}

onMounted(() => window.addEventListener('popstate', onPopState))
onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))
readUrl()

// ---- demo settings (stored in localStorage, applied on reload) ----
function saveSettings(patch) {
  localStorage.setItem('demo-settings', JSON.stringify({ ...props.settings, ...patch }))
  location.reload()
}

const theme = ref(props.settings.theme ?? 'light')
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.dbTheme = theme.value
  localStorage.setItem('demo-settings', JSON.stringify({ ...props.settings, theme: theme.value }))
}

function resetData() {
  dashboard.provider.reset()
  location.reload()
}

function refreshLists() {
  pageList.value?.reload()
  favourites.value?.reload()
}
</script>

<template>
  <div class="app">
    <header class="app__header">
      <strong>Dashboard package · dev host</strong>
      <span class="app__spacer" />
      <label>
        User
        <select :value="settings.userId ?? 'u_demo'" @change="saveSettings({ userId: $event.target.value })">
          <option value="u_demo">Demo User (admin)</option>
          <option value="u_asha">Asha</option>
          <option value="u_viewer">Viewer (no create/publish)</option>
        </select>
      </label>
      <label>
        Language
        <select :value="settings.locale ?? 'en'" @change="saveSettings({ locale: $event.target.value })">
          <option value="en">English</option>
          <option value="fr">Français (partial)</option>
        </select>
      </label>
      <button type="button" @click="toggleTheme">{{ theme === 'dark' ? 'Light' : 'Dark' }} mode</button>
      <button type="button" @click="resetData">Reset demo data</button>
    </header>

    <div class="app__body">
      <aside class="app__sidebar">
        <DashboardFavourites ref="favourites" :active-page-id="view === 'page' ? pageId : null" @open-page="openPage" />
        <DashboardPageList
          ref="pageList"
          :active-page-id="view === 'page' ? pageId : null"
          @open-page="openPage"
          @page-deleted="refreshLists"
          @favourites-changed="favourites?.reload()"
        />
        <button type="button" class="app__link" :class="{ 'app__link--active': view === 'library' }" @click="openLibrary">Block library</button>
      </aside>

      <main class="app__main">
        <DashboardBlockLibrary v-if="view === 'library'" />
        <DashboardPage
          v-else
          :key="pageId"
          v-model:filter-values="filterValues"
          v-model:open-tabs="openTabs"
          :page-id="pageId"
          @open-page="(e) => (openPage(e), refreshLists())"
          @page-saved="refreshLists"
          @page-deleted="() => (refreshLists(), openPage({ id: 'pg_sales' }))"
          @open-record="(record) => (lastRecord = record)"
        />
        <p v-if="lastRecord" class="app__record">
          open-record → source <code>{{ lastRecord.source }}</code>, id <code>{{ lastRecord.id }}</code> (the host decides what to do)
          <button type="button" @click="lastRecord = null">✕</button>
        </p>
      </main>
    </div>
  </div>
</template>
