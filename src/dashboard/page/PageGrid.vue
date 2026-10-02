<script setup>
// One GridStack grid (the page grid, or a tab's grid). Vue renders the items; GridStack positions
// them. Items: [{ key, x, y, w, h }]. In edit mode, drag/resize changes are emitted as a new layout.
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { GridStack } from 'gridstack'
import 'gridstack/dist/gridstack.min.css'
import { SMALL_SCREEN } from '../core/plugin.js'

const props = defineProps({
  items: { type: Array, required: true },
  editing: Boolean,
  handle: { type: String, required: true }, // class of the drag handle inside each item
})
const emit = defineEmits(['layout-change'])

const gridEl = ref(null)
let grid = null
let syncing = false

function itemEl(key) {
  return gridEl.value?.querySelector(`:scope > .grid-stack-item[gs-id="${CSS.escape(key)}"]`)
}

onMounted(() => {
  grid = GridStack.init(
    {
      column: 12,
      cellHeight: 56,
      margin: 6,
      float: false,
      staticGrid: !props.editing,
      animate: false,
      // Below this width blocks stack in one column (overall.md 2).
      columnOpts: { breakpoints: [{ w: SMALL_SCREEN, c: 1 }] },
      draggable: { handle: `.${props.handle}` },
      resizable: { handles: 'se' },
    },
    gridEl.value,
  )
  grid.on('change', () => {
    if (syncing || !props.editing || grid.getColumn() !== 12) return
    emit(
      'layout-change',
      grid.engine.nodes.map((n) => ({ key: n.id, x: n.x, y: n.y, w: n.w, h: n.h })),
    )
  })
})

// Items added/removed/moved by the model (add block, undo/redo, …) → update GridStack.
watch(
  () => props.items.map((i) => `${i.key}:${i.x},${i.y},${i.w},${i.h}`).join('|'),
  async () => {
    await nextTick()
    if (!grid) return
    syncing = true
    grid.batchUpdate()
    const keys = new Set(props.items.map((i) => i.key))
    // copy: removeWidget changes the list while we loop
    for (const node of grid.engine.nodes.slice()) {
      if (!keys.has(node.id)) grid.removeWidget(node.el, false, false)
    }
    for (const item of props.items) {
      const el = itemEl(item.key)
      if (!el) continue
      if (!el.gridstackNode) grid.makeWidget(el)
      const n = el.gridstackNode
      if (n && grid.getColumn() === 12 && (n.x !== item.x || n.y !== item.y || n.w !== item.w || n.h !== item.h)) {
        grid.update(el, { x: item.x, y: item.y, w: item.w, h: item.h })
      }
    }
    grid.batchUpdate(false)
    syncing = false
  },
  { flush: 'post' },
)

watch(
  () => props.editing,
  (editing) => grid?.setStatic(!editing),
)

// onUnmounted (not before): nested grids (tabs) are then destroyed before the page grid.
onUnmounted(() => {
  try {
    grid?.destroy(false)
  } catch {
    // the DOM is already gone; nothing left to clean up
  }
  grid = null
})
</script>

<template>
  <div ref="gridEl" class="grid-stack db-grid">
    <div v-for="item in items" :key="item.key" class="grid-stack-item" :gs-id="item.key" :gs-x="item.x" :gs-y="item.y" :gs-w="item.w" :gs-h="item.h">
      <div class="grid-stack-item-content">
        <slot name="item" :item="item" />
      </div>
    </div>
  </div>
</template>
