<script setup>
// List of saved views / saved filters in a side panel: "None", Private, Public.
// Each row: open it; star (my default), pencil (rename, visibility, default for everyone), trash.
import { computed } from 'vue'
import { useDashboard } from '../core/plugin.js'
import DbIcon from '../ui/DbIcon.js'
import { groupSaved } from './groupSaved.js'

const props = defineProps({
  saved: { type: Object, required: true },
  noneIcon: { type: String, default: 'grid' },
})

const { t } = useDashboard()
const groups = computed(() => groupSaved(props.saved.items))
const kind = computed(() => props.saved.kind)

function meta(item) {
  if (item.visibility !== 'public') return ''
  return [item.isMine ? t('pageList.mine') : item.ownerName, item.isPublicDefault ? t('saved.defaultForEveryone') : ''].filter(Boolean).join(' · ')
}
</script>

<template>
  <button type="button" class="db-view-row db-view-row--default" :class="{ 'db-view-row--active': !saved.currentId }" @click="saved.select(null)">
    <DbIcon :name="noneIcon" />
    <span class="db-view-row__name">{{ $dbt(`saved.${kind}.none`) }}</span>
  </button>

  <template v-for="group in ['private', 'public']" :key="group">
    <template v-if="groups[group].length">
      <h4 class="db-panel-section__group">{{ $dbt(`visibility.${group}`) }}</h4>
      <div v-for="item in groups[group]" :key="item.id" class="db-view-row" :class="{ 'db-view-row--active': item.id === saved.currentId }">
        <button type="button" class="db-view-row__open" @click="saved.select(item.id)">
          <DbIcon name="bookmark" />
          <span class="db-view-row__text">
            <span class="db-view-row__name">{{ item.name }}</span>
            <span v-if="meta(item)" class="db-view-row__meta">{{ meta(item) }}</span>
          </span>
        </button>
        <button
          type="button"
          class="db-icon-btn db-star"
          :class="{ 'db-star--on': item.isMyDefault }"
          :aria-pressed="item.isMyDefault"
          :aria-label="$dbt(item.isMyDefault ? 'saved.clearMyDefault' : 'saved.setMyDefault')"
          :title="$dbt(item.isMyDefault ? 'saved.clearMyDefault' : 'saved.setMyDefault')"
          @click="saved.setMyDefault(!item.isMyDefault, item)"
        >
          <DbIcon name="star" :size="15" :filled="item.isMyDefault" />
        </button>
        <button v-if="item.canEdit" type="button" class="db-icon-btn" :aria-label="$dbt(`saved.${kind}.edit`)" :title="$dbt(`saved.${kind}.edit`)" @click="saved.editDetails(item)">
          <DbIcon name="pencil" :size="15" />
        </button>
        <button v-if="item.canDelete" type="button" class="db-icon-btn" :aria-label="$dbt('common.delete')" :title="$dbt('common.delete')" @click="saved.remove(item)">
          <DbIcon name="trash" :size="15" />
        </button>
      </div>
    </template>
  </template>

  <button v-if="saved.canCreate" type="button" class="db-btn db-btn--block" @click="saved.saveAs()">
    <DbIcon name="plus" :size="15" /> {{ $dbt(`saved.${kind}.saveCurrent`) }}
  </button>
</template>
