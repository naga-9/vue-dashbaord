<script setup>
// The block's side panel (gear): the saved view's edit form (overall.md 4 → Block UI, screen 3).
// Views (manage), the widget's view settings, the view's own formatting rules; unsaved-changes footer.
import { computed } from 'vue'
import SidePanel from '../ui/SidePanel.vue'
import RuleList from '../formatting/RuleList.vue'
import SavedItemsList from './SavedItemsList.vue'

const props = defineProps({
  panelId: { type: String, required: true },
  block: { type: Object, required: true },
  widget: { type: Object, required: true },
  fields: { type: Array, default: () => [] },
  views: { type: Object, required: true }, // useSavedViews
})

const selected = computed(() => props.views.selected)
// The panel always edits a full state: the view's, or the widget's built-in default.
const state = computed(() => props.views.content.state ?? props.widget.defaultState(props.block.widgetConfig ?? {}, props.fields))
</script>

<template>
  <SidePanel :id="panelId" :title="block.name">
    <section class="db-panel-section">
      <h3 class="db-panel-section__title">{{ $dbt('saved.view.title') }}</h3>
      <SavedItemsList :saved="views" />
    </section>

    <component
      :is="widget.viewSettings"
      v-if="widget.viewSettings"
      :state="state"
      :config="block.widgetConfig ?? {}"
      :fields="fields"
      @update:state="(next) => views.patchContent({ state: next })"
    />

    <section v-if="widget.formattingTargets?.length" class="db-panel-section">
      <h3 class="db-panel-section__title">{{ $dbt('rules.viewSection') }}</h3>
      <RuleList :model-value="views.content.formatting" :fields="fields" :targets="widget.formattingTargets" @update:model-value="(rules) => views.patchContent({ formatting: rules })" />
    </section>

    <template v-if="views.changed" #footer>
      <p class="db-panel__unsaved">{{ $dbt('saved.unsavedChangesTo') }} <strong>{{ selected?.name ?? $dbt('saved.view.none') }}</strong></p>
      <div class="db-panel__actions">
        <button type="button" class="db-btn" @click="views.reset()">{{ $dbt('common.discard') }}</button>
        <button v-if="views.canCreate" type="button" class="db-btn" @click="views.saveAs()">{{ $dbt('saved.saveAsNew') }}</button>
        <button v-if="selected?.canEdit" type="button" class="db-btn db-btn--primary" @click="views.saveChanges()">{{ $dbt('saved.update') }}</button>
      </div>
    </template>
  </SidePanel>
</template>
