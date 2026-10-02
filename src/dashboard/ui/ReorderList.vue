<script setup>
// List whose rows can be reordered by dragging the grip (and with Alt+↑/↓ on the grip for keyboard users).
// One of the form components the package exports for widget forms (overall.md 5).
import { ref } from 'vue'
import DbIcon from './DbIcon.js'

const props = defineProps({
  items: { type: Array, required: true },
  itemKey: { type: Function, required: true }, // (item, index) → unique key
})
const emit = defineEmits(['update:items'])

const dragging = ref(null)
const over = ref(null)

function move(from, to) {
  if (to < 0 || to >= props.items.length || from === to) return
  const next = [...props.items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  emit('update:items', next)
}

function onDragStart(event, index) {
  dragging.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(index))
}

function onDrop(index) {
  if (dragging.value !== null) move(dragging.value, index)
  dragging.value = null
  over.value = null
}

function onKeydown(event, index) {
  if (!event.altKey) return
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(index, index - 1)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(index, index + 1)
  }
}
</script>

<template>
  <ul class="db-reorder">
    <li
      v-for="(item, index) in items"
      :key="itemKey(item, index)"
      class="db-reorder__row"
      :class="{ 'db-reorder__row--over': over === index && dragging !== index, 'db-reorder__row--dragging': dragging === index }"
      @dragover.prevent="over = index"
      @dragleave="over === index && (over = null)"
      @drop.prevent="onDrop(index)"
    >
      <span
        class="db-reorder__grip"
        draggable="true"
        tabindex="0"
        role="button"
        :aria-label="$dbt('common.reorderHint')"
        :title="$dbt('common.reorderHint')"
        @dragstart="onDragStart($event, index)"
        @dragend="dragging = null; over = null"
        @keydown="onKeydown($event, index)"
      >
        <DbIcon name="grip" :size="14" />
      </span>
      <slot :item="item" :index="index" />
    </li>
  </ul>
</template>
