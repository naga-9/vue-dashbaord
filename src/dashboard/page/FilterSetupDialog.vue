<script setup>
// Page filter setup in edit mode (overall.md 2 → Page UI, screen 4): the filters in panel order on the
// left; the selected filter's settings and its filter mappings (block → field) on the right.
// Part of the page draft (Save / Cancel, undo/redo).
import { computed, ref } from 'vue'
import { clone } from '../core/clone.js'
import { useDashboard } from '../core/plugin.js'
import DialogFrame from '../ui/DialogFrame.vue'
import ReorderList from '../ui/ReorderList.vue'
import { FILTER_TYPES, mappableFields } from '../filters/filterTypes.js'
import { newId } from './usePageEditor.js'

const props = defineProps({
  filters: { type: Array, required: true },
  blocks: { type: Array, required: true }, // [{ id, name, where, source, fields }] blocks on the page the user can see
  focusBlockId: { type: String, default: null }, // a newly added block to map
})
const emit = defineEmits(['close'])

const { t } = useDashboard()
const list = ref(clone(props.filters))
const selectedId = ref(list.value[0]?.id ?? null)
const selected = computed(() => list.value.find((f) => f.id === selectedId.value) ?? null)
const mappable = computed(() => props.blocks.filter((b) => b.source))

function add() {
  const filter = { id: newId('f'), label: '', type: 'select', multiple: true, optionsFrom: 'mapped', mappings: [] }
  list.value.push(filter)
  selectedId.value = filter.id
}

function remove() {
  const index = list.value.findIndex((f) => f.id === selectedId.value)
  list.value.splice(index, 1)
  selectedId.value = list.value[Math.min(index, list.value.length - 1)]?.id ?? null
}

function setType(type) {
  const f = selected.value
  f.type = type
  // Mappings to fields of a non-matching type are dropped.
  f.mappings = f.mappings.filter((m) => {
    const block = props.blocks.find((b) => b.id === m.blockId)
    return block && mappableFields(type, block.fields).some((field) => field.name === m.field)
  })
  if (type === 'select') {
    f.multiple ??= true
    f.optionsFrom ??= 'mapped'
  } else {
    delete f.multiple
    delete f.optionsFrom
    delete f.customOptions
  }
}

const mappingOf = (blockId) => selected.value.mappings.find((m) => m.blockId === blockId)?.field ?? ''

function setMapping(blockId, field) {
  const f = selected.value
  f.mappings = f.mappings.filter((m) => m.blockId !== blockId)
  if (field) f.mappings.push({ blockId, field })
}

// A mapping to a field the block's source no longer has: shown as broken so it can be re-mapped.
function isBroken(mapping) {
  const block = props.blocks.find((b) => b.id === mapping.blockId)
  return Boolean(block) && !block.fields.some((f) => f.name === mapping.field)
}

// "Select · 3 blocks"
const metaOf = (filter) => `${t(`filterType.${filter.type}`)} · ${t(filter.mappings.length === 1 ? 'filterSetup.blockCountOne' : 'filterSetup.blockCount', { count: filter.mappings.length })}`

const customText = computed({
  get: () => (selected.value?.customOptions ?? []).map((o) => (o.label && o.label !== o.value ? `${o.value} = ${o.label}` : o.value)).join('\n'),
  set: (text) => {
    selected.value.customOptions = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [value, label] = line.split('=').map((s) => s.trim())
        return { value, label: label || value }
      })
  },
})

const valid = computed(() => list.value.every((f) => f.label.trim()))
</script>

<template>
  <DialogFrame :title="$dbt('filterSetup.title')" @close="emit('close', null)">
    <div class="db-filter-setup">
      <div class="db-filter-setup__list">
        <h3 class="db-panel-section__title">{{ $dbt('filterSetup.inPanelOrder') }}</h3>
        <ReorderList :items="list" :item-key="(f) => f.id" @update:items="(items) => (list = items)">
          <template #default="{ item }">
            <button type="button" class="db-setup-row" :class="{ 'db-setup-row--active': item.id === selectedId }" @click="selectedId = item.id">
              <span class="db-setup-row__text">
                <span class="db-setup-row__name">{{ item.label || $dbt('filterSetup.untitled') }}</span>
                <span class="db-setup-row__meta">{{ metaOf(item) }}</span>
              </span>
              <span v-if="item.mappings.some(isBroken)" class="db-tag db-tag--danger" :title="$dbt('filterSetup.brokenHint')">{{ $dbt('filterSetup.broken') }}</span>
            </button>
          </template>
        </ReorderList>
        <button type="button" class="db-link db-small-link" @click="add">+ {{ $dbt('filterSetup.add') }}</button>
      </div>

      <div v-if="selected" class="db-filter-setup__detail">
        <div class="db-form-grid">
          <label class="db-field">
            <span class="db-field__label">{{ $dbt('filterSetup.label') }} *</span>
            <input v-model="selected.label" class="db-input" />
          </label>
          <label class="db-field">
            <span class="db-field__label">{{ $dbt('filterSetup.type') }}</span>
            <select class="db-input" :value="selected.type" @change="setType($event.target.value)">
              <option v-for="type in Object.keys(FILTER_TYPES)" :key="type" :value="type">{{ $dbt(`filterType.${type}`) }}</option>
            </select>
          </label>
        </div>

        <div v-if="selected.type === 'select'" class="db-filter-setup__options">
          <label class="db-check"><input v-model="selected.multiple" type="checkbox" /> {{ $dbt('filterSetup.multiple') }}</label>
          <span class="db-muted">{{ $dbt('filterSetup.valuesFrom') }}</span>
          <label class="db-check"><input v-model="selected.optionsFrom" type="radio" value="mapped" /> {{ $dbt('filterSetup.mappedFields') }}</label>
          <label class="db-check"><input v-model="selected.optionsFrom" type="radio" value="custom" /> {{ $dbt('filterSetup.customList') }}</label>
        </div>
        <label v-if="selected.type === 'select' && selected.optionsFrom === 'custom'" class="db-field">
          <span class="db-field__label">{{ $dbt('filterSetup.customHint') }}</span>
          <textarea v-model.lazy="customText" class="db-input" rows="4" />
        </label>

        <section class="db-form-section">
          <h3 class="db-panel-section__title">{{ $dbt('filterSetup.appliesTo') }}</h3>
          <p v-if="!mappable.length" class="db-muted">{{ $dbt('filterSetup.noBlocks') }}</p>
          <div v-else class="db-mapping-list">
            <div
              v-for="block in mappable"
              :key="block.id"
              class="db-mapping-row"
              :class="{
                'db-mapping-row--broken': mappingOf(block.id) && isBroken({ blockId: block.id, field: mappingOf(block.id) }),
                'db-mapping-row--focus': block.id === focusBlockId,
              }"
            >
              <span class="db-mapping-row__text">
                <strong>{{ block.name }}</strong>
                <span class="db-muted db-small">{{ block.where }}</span>
              </span>
              <select
                class="db-input db-mapping-row__select"
                :class="{ 'db-input--active': mappingOf(block.id) }"
                :aria-label="$dbt('filterSetup.fieldIn', { block: block.name })"
                :value="mappingOf(block.id)"
                @change="setMapping(block.id, $event.target.value)"
              >
                <option value="">{{ $dbt('filterSetup.notApplied') }}</option>
                <option v-if="mappingOf(block.id) && !block.fields.some((f) => f.name === mappingOf(block.id))" :value="mappingOf(block.id)">
                  {{ mappingOf(block.id) }} ({{ $dbt('common.missingField') }})
                </option>
                <option v-for="field in mappableFields(selected.type, block.fields)" :key="field.name" :value="field.name">{{ field.label }}</option>
              </select>
            </div>
          </div>
          <p class="db-muted db-small">{{ $dbt(`filterSetup.typesHint.${selected.type}`) }}</p>
        </section>

        <button type="button" class="db-link db-small-link db-danger-link" @click="remove">{{ $dbt('filterSetup.remove') }}</button>
      </div>
      <p v-else class="db-muted db-filter-setup__detail">{{ $dbt('filterSetup.empty') }}</p>
    </div>

    <template #footer>
      <button type="button" class="db-btn" @click="emit('close', null)">{{ $dbt('common.cancel') }}</button>
      <button type="button" class="db-btn db-btn--primary" :disabled="!valid" @click="emit('close', list)">{{ $dbt('common.apply') }}</button>
    </template>
  </DialogFrame>
</template>
