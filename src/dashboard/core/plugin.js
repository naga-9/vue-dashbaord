// createDashboard({ provider, … }) → Vue plugin. State lives here (no Pinia needed by the host);
// components and the host reach it through useDashboard().
import { inject, reactive, ref, shallowRef } from 'vue'
import { createI18n } from './i18n.js'
import { createDialogs } from './dialogs.js'
import { createDynamicValueRegistry } from './dynamicValues.js'
import { createWidgetRegistry } from '../widgets/registry.js'
import tableWidget from '../widgets/table/index.js'

const DASHBOARD_KEY = Symbol('dashboard')

// Screens below this width stack blocks in one column and have no edit mode.
export const SMALL_SCREEN = 768

export function createDashboard(options = {}) {
  if (!options.provider) throw new Error('createDashboard: a data provider is required')

  const i18n = createI18n({ locale: options.locale, messages: options.messages })
  const widgets = createWidgetRegistry([tableWidget, ...(options.widgets ?? [])])
  const dynamicValues = createDynamicValueRegistry(options.dynamicValues ?? [])
  const dialogs = createDialogs()
  const user = shallowRef(null)
  const userError = ref(null)

  // Loaded once at start (contracts.md → Current user).
  const ready = options.provider
    .getCurrentUser()
    .then((u) => {
      user.value = u
      return u
    })
    .catch((error) => {
      userError.value = error
      throw error
    })
  ready.catch(() => {})

  // Small caches shared by all components.
  const fieldsCache = new Map()
  let sourcesPromise = null

  const ctx = {
    provider: options.provider,
    options: { currency: 'USD', exportRowLimit: 10000, previewRowLimit: 10, ...options },
    user,
    userError,
    ready,
    i18n,
    t: i18n.t,
    widgets,
    dynamicValues,
    dialogs,

    // Unsaved changes of edit forms, kept while navigating within the app (overall.md 8).
    drafts: reactive(new Map()),

    // Bumped when a block is saved, so every page showing it reloads it.
    blockVersions: reactive({}),

    // The open side panel (only one at a time); the page makes room for it.
    panel: reactive({ openId: null }),

    listSources() {
      sourcesPromise ??= options.provider.listSources().catch((error) => {
        sourcesPromise = null
        throw error
      })
      return sourcesPromise
    },

    getFields(sourceId) {
      if (!sourceId) return Promise.resolve([])
      if (!fieldsCache.has(sourceId)) {
        fieldsCache.set(
          sourceId,
          options.provider.getSourceFields(sourceId).catch((error) => {
            fieldsCache.delete(sourceId)
            throw error
          }),
        )
      }
      return fieldsCache.get(sourceId)
    },

    // Formatting environment for values (locale/timezone from the user, browser as fallback).
    formatEnv() {
      return {
        locale: user.value?.locale || navigator.language,
        timezone: user.value?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        currency: ctx.options.currency,
        t: i18n.t,
      }
    },

    // Context passed to dynamic values' resolve().
    resolveContext(filterValues = {}) {
      const env = ctx.formatEnv()
      return { now: new Date(), timezone: env.timezone, locale: env.locale, user: user.value, filterValues }
    },

    can(type, flag) {
      return Boolean(user.value?.permissions?.[type]?.[flag])
    },
  }

  return {
    install(app) {
      dialogs.setAppContext(app._context)
      app.provide(DASHBOARD_KEY, ctx)
      // Translation helper for the package's own templates.
      app.config.globalProperties.$dbt = i18n.t
    },
    context: ctx,
    registerWidget: widgets.register,
    registerDynamicValue: dynamicValues.register,
  }
}

export function useDashboard() {
  const ctx = inject(DASHBOARD_KEY, null)
  if (!ctx) throw new Error('useDashboard(): install the plugin from createDashboard() first')
  return ctx
}
