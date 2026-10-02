// The data path of one block (plan step 4). Widgets call `fetchData(query)` with widget keys only;
// this adds source + conditions, resolves dynamic values, aborts older requests and tracks
// the block's loading / error / empty state.
import { onBeforeUnmount, ref } from 'vue'
import { resolveConditions } from '../core/dynamicValues.js'

const WIDGET_KEYS = ['fields', 'sort', 'offset', 'limit', 'groupBy', 'aggregates']

export function isAbortError(error) {
  return error?.name === 'AbortError'
}

// Builds the full provider request for a block (shared with export).
export async function buildRequest(ctx, { block, pageConditions = [], filterValues = {} }, query) {
  const conditions = await resolveConditions([...(block.fixedConditions ?? []), ...pageConditions], ctx.dynamicValues, ctx.resolveContext(filterValues))
  const request = { source: block.source, conditions }
  for (const key of WIDGET_KEYS) if (query?.[key] !== undefined) request[key] = query[key]
  return request
}

// getInputs() → { block, pageConditions, filterValues }
export function useBlockData(ctx, getInputs, { preview = false } = {}) {
  const status = ref('idle') // idle | loading | ready | empty | error
  const error = ref(null)
  const reloadKey = ref(0)
  let controller = null

  async function fetchData(query = {}) {
    controller?.abort()
    const mine = new AbortController()
    controller = mine
    status.value = 'loading'
    error.value = null

    try {
      const request = await buildRequest(ctx, getInputs(), query)
      if (preview) request.limit = Math.min(request.limit ?? ctx.options.previewRowLimit, ctx.options.previewRowLimit)
      const result = await ctx.provider.getData(request, { signal: mine.signal })
      if (mine !== controller) throw new DOMException('Superseded', 'AbortError')
      // In the preview everything fits on one page.
      if (preview) result.total = result.rows.length
      status.value = result.rows.length === 0 && !(query.offset > 0) ? 'empty' : 'ready'
      return result
    } catch (e) {
      if (!isAbortError(e) && mine === controller) {
        status.value = 'error'
        error.value = e
      }
      throw e
    }
  }

  function reload() {
    reloadKey.value++
  }

  onBeforeUnmount(() => controller?.abort())

  return { status, error, reloadKey, fetchData, reload }
}
