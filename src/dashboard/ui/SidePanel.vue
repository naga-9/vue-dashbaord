<script setup>
// Panel that slides in from the right. Only one is open at a time (ctx.panel);
// the page makes room for it ("push" mode). Esc or ✕ closes it.
import { computed, onBeforeUnmount, watch } from 'vue'
import { useDashboard } from '../core/plugin.js'
import DbIcon from './DbIcon.js'

const props = defineProps({
  id: { type: String, required: true },
  title: { type: String, default: '' },
})

const ctx = useDashboard()
const open = computed(() => ctx.panel.openId === props.id)

function close() {
  if (open.value) ctx.panel.openId = null
}

function onKeydown(event) {
  if (event.key === 'Escape') close()
}

watch(
  open,
  (isOpen) => {
    if (isOpen) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  close()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="db-panel">
      <aside v-if="open" class="db-root db-panel" :aria-label="title">
        <header class="db-panel__header">
          <h2 class="db-panel__title">{{ title }}</h2>
          <button type="button" class="db-icon-btn" :aria-label="$dbt('common.close')" :title="$dbt('common.close')" @click="close">
            <DbIcon name="x" />
          </button>
        </header>
        <div class="db-panel__body"><slot /></div>
        <footer v-if="$slots.footer" class="db-panel__footer"><slot name="footer" /></footer>
      </aside>
    </Transition>
  </Teleport>
</template>
