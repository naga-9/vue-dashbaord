// Shared logic of saved views (per block) and saved filters (per page): list, open, defaults,
// save / save as / rename / delete (overall.md 6, contracts.md → Saved view / Saved filter).
//
// `content` is what the item stores: { state, formatting } for views, { values } for filters.
// It is temporary until saved; changing it never counts as "unsaved changes" (overall.md 8).
import { clone } from '../core/clone.js'
import { computed, reactive, ref } from 'vue'
import { trySave } from '../core/saving.js'
import SavedItemDialog from '../ui/SavedItemDialog.vue'

export function useSavedItems(ctx, { kind, permissionType, ownerField, getOwnerId, api, contentOf, emptyContent }) {
  const { t, dialogs } = ctx
  const items = ref([])
  const currentId = ref(null)
  const content = ref(emptyContent())
  const loaded = ref(false)
  const error = ref(null)

  const selected = computed(() => items.value.find((i) => i.id === currentId.value) ?? null)
  const baseline = computed(() => (selected.value ? contentOf(selected.value) : emptyContent()))
  const changed = computed(() => JSON.stringify(content.value) !== JSON.stringify(baseline.value))
  const canCreate = computed(() => ctx.can(permissionType, 'canCreate'))
  const canPublish = computed(() => ctx.can(permissionType, 'canPublish'))

  // My default → public default → built-in (null).
  function defaultId() {
    return items.value.find((i) => i.isMyDefault)?.id ?? items.value.find((i) => i.isPublicDefault)?.id ?? null
  }

  async function refresh() {
    items.value = await api.list(getOwnerId())
  }

  async function load({ applyDefault = true } = {}) {
    try {
      await refresh()
      error.value = null
    } catch (e) {
      error.value = e
      items.value = []
    }
    loaded.value = true
    if (applyDefault) select(defaultId())
  }

  function select(id) {
    currentId.value = id
    content.value = clone(id ? contentOf(items.value.find((i) => i.id === id)) : emptyContent())
  }

  // Changes part of the (unsaved) content, e.g. { state } from the side panel.
  function patchContent(patch) {
    content.value = { ...content.value, ...patch }
  }

  function reset() {
    content.value = clone(baseline.value)
  }

  async function reloadKeepingSelection() {
    const id = currentId.value
    await refresh()
    select(items.value.some((i) => i.id === id) ? id : defaultId())
  }

  function editDialog(title, item) {
    return dialogs.open(SavedItemDialog, {
      title,
      name: item?.name ?? '',
      visibility: item?.visibility ?? 'private',
      canPublish: canPublish.value || item?.visibility === 'public',
      // "Default for everyone" is offered when editing, with canPublish.
      canSetPublicDefault: Boolean(item) && canPublish.value,
      publicDefault: Boolean(item?.isPublicDefault),
      takenNames: items.value.filter((i) => i.id !== item?.id && i.isMine).map((i) => i.name),
    })
  }

  async function saveChanges() {
    if (!selected.value) return
    const result = await trySave(ctx, () => api.update({ ...selected.value, ...clone(content.value) }), {
      item: kind,
      onReload: reloadKeepingSelection,
    })
    if (result.ok) {
      await refresh()
      dialogs.toast(t('saved.saved'))
    }
  }

  async function saveAs() {
    const details = await editDialog(t(`saved.${kind}.saveAs`))
    if (!details) return
    const data = { name: details.name, visibility: details.visibility, [ownerField]: getOwnerId(), ...clone(content.value) }
    const result = await trySave(ctx, () => api.create(data), { item: kind })
    if (!result.ok) return
    await refresh()
    currentId.value = result.value.id
  }

  // The actions below work on a given item (side-panel rows) or, without one, on the selected item.
  async function editDetails(item = selected.value) {
    if (!item) return
    const details = await editDialog(t(`saved.${kind}.edit`), item)
    if (!details) return
    // Only name/visibility change here; the stored content stays as saved.
    const result = await trySave(ctx, () => api.update({ ...item, name: details.name, visibility: details.visibility }), {
      item: kind,
      onReload: reloadKeepingSelection,
    })
    if (!result.ok) return
    const wantDefault = details.publicDefault && details.visibility === 'public'
    if (canPublish.value && wantDefault !== Boolean(item.isPublicDefault)) {
      await trySave(ctx, () => api.setPublicDefault(getOwnerId(), wantDefault ? item.id : null), { item: kind })
    }
    await refresh()
  }

  async function remove(item = selected.value) {
    if (!item) return
    const ok = await dialogs.confirm({
      title: t(`saved.${kind}.delete`),
      message: t('saved.deleteConfirm', { name: item.name }),
      confirmLabel: t('common.delete'),
      danger: true,
    })
    if (!ok) return
    const result = await trySave(ctx, () => api.remove(item.id), { item: kind })
    if (!result.ok) return
    await refresh()
    if (item.id === currentId.value) select(defaultId())
  }

  async function setMyDefault(on, item = selected.value) {
    if (!item) return
    const result = await trySave(ctx, () => api.setMyDefault(getOwnerId(), on ? item.id : null), { item: kind })
    if (result.ok) await refresh()
  }

  async function setPublicDefault(on, item = selected.value) {
    if (!item) return
    const result = await trySave(ctx, () => api.setPublicDefault(getOwnerId(), on ? item.id : null), { item: kind })
    if (result.ok) await refresh()
  }

  return reactive({
    kind,
    items,
    currentId,
    content,
    loaded,
    error,
    selected,
    changed,
    canCreate,
    canPublish,
    load,
    select,
    patchContent,
    reset,
    saveChanges,
    saveAs,
    editDetails,
    remove,
    setMyDefault,
    setPublicDefault,
  })
}

export function useSavedViews(ctx, getBlockId) {
  const p = ctx.provider
  return useSavedItems(ctx, {
    kind: 'view',
    permissionType: 'savedViews',
    ownerField: 'blockId',
    getOwnerId: getBlockId,
    api: {
      list: (blockId) => p.listSavedViews(blockId),
      create: (data) => p.createSavedView(data),
      update: (item) => p.updateSavedView(item),
      remove: (id) => p.deleteSavedView(id),
      setMyDefault: (blockId, id) => p.setMyDefaultView(blockId, id),
      setPublicDefault: (blockId, id) => p.setPublicDefaultView(blockId, id),
    },
    contentOf: (view) => ({ state: view.state ?? null, formatting: view.formatting ?? [] }),
    emptyContent: () => ({ state: null, formatting: [] }),
  })
}

export function useSavedFilters(ctx, getPageId) {
  const p = ctx.provider
  return useSavedItems(ctx, {
    kind: 'filter',
    permissionType: 'savedFilters',
    ownerField: 'pageId',
    getOwnerId: getPageId,
    api: {
      list: (pageId) => p.listSavedFilters(pageId),
      create: (data) => p.createSavedFilter(data),
      update: (item) => p.updateSavedFilter(item),
      remove: (id) => p.deleteSavedFilter(id),
      setMyDefault: (pageId, id) => p.setMyDefaultFilter(pageId, id),
      setPublicDefault: (pageId, id) => p.setPublicDefaultFilter(pageId, id),
    },
    contentOf: (filter) => ({ values: filter.values ?? {} }),
    emptyContent: () => ({ values: {} }),
  })
}
