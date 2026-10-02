<script setup>
// One block placement on a page grid: the block itself, or the "not available" placeholder.
// In edit mode it adds a drag handle and Move / Remove.
import { computed } from 'vue'
import { useDashboard } from '../core/plugin.js'
import DashboardBlock from '../blocks/DashboardBlock.vue'
import DbMenu from '../ui/DbMenu.vue'
import DbIcon from '../ui/DbIcon.js'

const props = defineProps({
  placement: { type: Object, required: true },
  block: { type: Object, default: null }, // null = not available (deleted or not visible)
  editing: Boolean,
  handle: { type: String, required: true },
  gridKey: { type: String, required: true },
  moveTargets: { type: Array, default: () => [] }, // [{ key, label }]
  pageConditions: { type: Array, default: () => [] },
  filterValues: { type: Object, default: () => ({}) },
  reloadSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['remove', 'move', 'open-record', 'edit-block'])

const { t } = useDashboard()
const editItems = computed(() => [
  ...props.moveTargets.filter((m) => m.key !== props.gridKey).map((m) => ({ label: t('edit.moveTo', { target: m.label }), onSelect: () => emit('move', m.key) })),
  { separator: true },
  { label: t('edit.removeFromPage'), danger: true, onSelect: () => emit('remove') },
])
</script>

<template>
  <div class="db-cell" :class="{ 'db-cell--editing': editing }">
    <div v-if="editing" class="db-cell__edit-bar">
      <span class="db-drag-handle" :class="handle" :title="$dbt('edit.drag')"><DbIcon name="grip" :size="14" /></span>
      <span class="db-cell__name">{{ block?.name ?? $dbt('block.notAvailable') }}</span>
      <span class="db-spacer" />
      <DbMenu :items="editItems">
        <button type="button" class="db-icon-btn db-icon-btn--small" :aria-label="$dbt('edit.blockOptions')" :title="$dbt('edit.blockOptions')"><DbIcon name="more" :size="14" /></button>
      </DbMenu>
    </div>

    <DashboardBlock
      v-if="block"
      :block="block"
      :page-conditions="pageConditions"
      :filter-values="filterValues"
      :reload-signal="reloadSignal"
      @open-record="emit('open-record', $event)"
      @edit-block="emit('edit-block', $event)"
    >
      <template v-if="$slots['block-header']" #header="scope"><slot name="block-header" v-bind="scope" /></template>
      <template v-if="$slots['block-loading']" #loading><slot name="block-loading" /></template>
      <template v-if="$slots['block-error']" #error="scope"><slot name="block-error" v-bind="scope" /></template>
      <template v-if="$slots['block-empty']" #empty><slot name="block-empty" /></template>
    </DashboardBlock>

    <div v-else class="db-block db-block--unavailable">
      <slot name="not-available" :block-id="placement.blockId">
        <div class="db-block__state">{{ $dbt('block.notAvailableHint') }}</div>
      </slot>
    </div>
  </div>
</template>
