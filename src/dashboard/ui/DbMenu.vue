<script setup>
// Dropdown menu. items: [{ label, onSelect, disabled, danger, checked, hint, separator, heading }]
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuSeparator, DropdownMenuTrigger } from 'reka-ui'

defineProps({
  items: { type: Array, required: true },
  align: { type: String, default: 'end' },
})
</script>

<template>
  <DropdownMenuRoot :modal="false">
    <DropdownMenuTrigger as-child>
      <slot />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="db-root db-menu" :align="align" :side-offset="4">
        <template v-for="(item, index) in items" :key="index">
          <DropdownMenuSeparator v-if="item.separator" class="db-menu__separator" />
          <DropdownMenuLabel v-else-if="item.heading" class="db-menu__heading">{{ item.heading }}</DropdownMenuLabel>
          <DropdownMenuItem
            v-else
            class="db-menu__item"
            :class="{ 'db-menu__item--danger': item.danger }"
            :disabled="item.disabled"
            @select="item.onSelect?.()"
          >
            <span class="db-menu__check">{{ item.checked ? '✓' : '' }}</span>
            <span class="db-menu__label">{{ item.label }}</span>
            <span v-if="item.hint" class="db-menu__hint">{{ item.hint }}</span>
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
