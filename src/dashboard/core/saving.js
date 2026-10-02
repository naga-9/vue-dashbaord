// Shared handling of failed saves/deletes (overall.md 8 → Saving conflicts).
// - conflict: "This <item> was changed by <name> at <time>", the only option is Reload
// - anything else: nothing is discarded, the user sees an error and can retry

export async function handleSaveError(ctx, error, { item, onReload } = {}) {
  const { t, dialogs } = ctx
  if (error?.code === 'conflict') {
    const time = error.modified ? new Intl.DateTimeFormat(ctx.formatEnv().locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(error.modified)) : ''
    await dialogs.confirm({
      title: t('conflict.title'),
      message: t('conflict.message', { item: t(`item.${item}`), name: error.modifiedBy ?? '?', time }),
      confirmLabel: t('conflict.reload'),
      hideCancel: true,
    })
    await onReload?.()
    return
  }
  if (error?.code === 'not_found') {
    dialogs.toast(t('error.notFound'), { type: 'error' })
    return
  }
  if (error?.code === 'forbidden') {
    dialogs.toast(t('error.forbidden'), { type: 'error' })
    return
  }
  dialogs.toast(t('error.saveFailed', { message: error?.message ?? '' }), { type: 'error', timeout: 6000 })
}

// Runs a provider call; on failure shows the right message and returns undefined.
export async function trySave(ctx, fn, options) {
  try {
    return { ok: true, value: await fn() }
  } catch (error) {
    await handleSaveError(ctx, error, options)
    return { ok: false, error }
  }
}
