// Duplicating pages and blocks (overall.md 8 → Duplicating). Done by the package with the
// provider's create calls. Not atomic: failed saved view/filter copies are reported, not undone.

function copyVisibility(ctx, type, visibility) {
  return visibility === 'public' && ctx.can(type, 'canPublish') ? 'public' : 'private'
}

async function copyChildren(ctx, items, create) {
  let failed = 0
  for (const item of items) {
    try {
      await create(item)
    } catch {
      failed++
    }
  }
  return failed
}

export async function duplicatePage(ctx, page) {
  const { t } = ctx
  const copy = await ctx.provider.createPage({
    name: t('common.copyOf', { name: page.name }),
    description: page.description ?? '',
    visibility: copyVisibility(ctx, 'pages', page.visibility),
    layout: page.layout,
    filters: page.filters,
  })
  // Only saved filters the user can see are listed (their own + public).
  const filters = await ctx.provider.listSavedFilters(page.id).catch(() => [])
  const failed = await copyChildren(ctx, filters, (f) =>
    ctx.provider.createSavedFilter({ name: f.name, visibility: copyVisibility(ctx, 'savedFilters', f.visibility), pageId: copy.id, values: f.values }),
  )
  return { copy, failed }
}

export async function duplicateBlock(ctx, block) {
  const { t } = ctx
  const copy = await ctx.provider.createBlock({
    name: t('common.copyOf', { name: block.name }),
    description: block.description ?? '',
    visibility: copyVisibility(ctx, 'blocks', block.visibility),
    widgetType: block.widgetType,
    source: block.source,
    fixedConditions: block.fixedConditions,
    formatting: block.formatting,
    widgetConfig: block.widgetConfig,
  })
  const views = await ctx.provider.listSavedViews(block.id).catch(() => [])
  const failed = await copyChildren(ctx, views, (v) =>
    ctx.provider.createSavedView({
      name: v.name,
      visibility: copyVisibility(ctx, 'savedViews', v.visibility),
      blockId: copy.id,
      state: v.state,
      formatting: v.formatting ?? [],
    }),
  )
  return { copy, failed }
}
