<script setup>
// "Add block" in page edit mode (overall.md 2 → Page UI, screen 3): place a new block, or pick an
// existing one. Blocks already on the page aren't listed (a block appears once per page).
import { computed, onMounted, ref } from 'vue'
import { useDashboard } from '../core/plugin.js'
import DialogFrame from '../ui/DialogFrame.vue'
import DbIcon from '../ui/DbIcon.js'

const props = defineProps({
  excludeIds: { type: Array, default: () => [] },
  targets: { type: Array, required: true }, // [{ key, label }] grids a block can be placed on
})
const emit = defineEmits(['close'])

const ctx = useDashboard()
const { t } = ctx
const blocks = ref([])
const sources = ref([])
const loading = ref(true)
const error = ref(null)
const search = ref('')
const target = ref(props.targets[0].key)
const canCreate = computed(() => ctx.can('blocks', 'canCreate'))

const available = computed(() => {
  const term = search.value.toLowerCase()
  return blocks.value.filter((b) => !props.excludeIds.includes(b.id) && (!term || b.name.toLowerCase().includes(term)))
})

// "Table · Sales Orders · Private (mine)"
function meta(block) {
  const widget = ctx.widgets.get(block.widgetType)
  const source = block.source ? (sources.value.find((s) => s.id === block.source)?.label ?? block.source) : t('blockForm.noSourceShort')
  const owner = block.isMine ? t('pageList.mine') : block.ownerName
  return [t(widget?.label ?? block.widgetType), source, block.visibility === 'private' ? `${t('visibility.private')} (${owner})` : owner].join(' · ')
}

onMounted(async () => {
  try {
    ;[blocks.value, sources.value] = await Promise.all([ctx.provider.listBlocks(), ctx.listSources()])
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DialogFrame :title="$dbt('edit.addBlock')" @close="emit('close', null)">
    <div class="db-add-block">
      <div class="db-add-block__top">
        <label class="db-field db-field--grow">
          <span class="db-field__label">{{ $dbt('edit.placeOn') }}</span>
          <select v-model="target" class="db-input">
            <option v-for="option in targets" :key="option.key" :value="option.key">{{ option.label }}</option>
          </select>
        </label>
        <button v-if="canCreate" type="button" class="db-btn db-btn--primary" @click="emit('close', { kind: 'new', target })">
          <DbIcon name="plus" :size="15" /> {{ $dbt('edit.newBlock') }}
        </button>
      </div>

      <div class="db-or">{{ $dbt('edit.orPickExisting') }}</div>

      <label class="db-search">
        <DbIcon name="search" :size="14" />
        <input v-model="search" :aria-label="$dbt('edit.searchBlocks')" :placeholder="$dbt('edit.searchBlocks')" />
      </label>

      <p v-if="error" class="db-error">{{ error.message }}</p>
      <p v-else-if="loading" class="db-muted">{{ $dbt('common.loading') }}</p>
      <ul v-else class="db-pick-list">
        <li v-for="block in available" :key="block.id" class="db-pick-list__row">
          <div class="db-pick-list__text">
            <strong>{{ block.name }}</strong>
            <span class="db-muted">{{ meta(block) }}</span>
          </div>
          <button type="button" class="db-btn" @click="emit('close', { kind: 'existing', blockId: block.id, target })">{{ $dbt('edit.place') }}</button>
        </li>
        <li v-if="!available.length" class="db-pick-list__row db-muted">{{ $dbt('edit.noBlocksToPick') }}</li>
      </ul>
      <p class="db-muted db-small">{{ $dbt('edit.oncePerPage') }}</p>
    </div>
  </DialogFrame>
</template>
