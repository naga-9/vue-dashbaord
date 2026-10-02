// Package-wide dialogs and toasts (confirm, prompt, custom dialogs, conflict messages).
// One DialogHost is mounted on <body> with the app's context, the first time it's needed.
import { h, markRaw, reactive, render } from 'vue'
import DialogHost from '../ui/DialogHost.vue'

export function createDialogs() {
  const state = reactive({ dialogs: [], toasts: [] })
  let mounted = false
  let appContext = null
  let seq = 0

  function ensureHost() {
    if (mounted || !appContext) return
    const container = document.createElement('div')
    container.className = 'db-root db-dialog-root'
    document.body.appendChild(container)
    const vnode = h(DialogHost, { state })
    vnode.appContext = appContext
    render(vnode, container)
    mounted = true
  }

  // Opens any component as a dialog. It gets `props` plus an `onClose(result)` callback.
  function open(component, props = {}, options = {}) {
    ensureHost()
    return new Promise((resolve) => {
      const id = ++seq
      state.dialogs.push({
        id,
        component: component ? markRaw(component) : null,
        props,
        options,
        close(result) {
          state.dialogs = state.dialogs.filter((d) => d.id !== id)
          resolve(result)
        },
      })
    })
  }

  function confirm({ title, message, confirmLabel, cancelLabel, danger = false, hideCancel = false }) {
    ensureHost()
    return open(null, { kind: 'confirm', title, message, confirmLabel, cancelLabel, danger, hideCancel }).then(Boolean)
  }

  function prompt({ title, label, value = '', confirmLabel, validate }) {
    ensureHost()
    return open(null, { kind: 'prompt', title, label, value, confirmLabel, validate }).then((result) => result ?? null)
  }

  function toast(message, { type = 'info', timeout = 4000 } = {}) {
    ensureHost()
    const id = ++seq
    state.toasts.push({ id, message, type })
    setTimeout(() => {
      state.toasts = state.toasts.filter((t) => t.id !== id)
    }, timeout)
  }

  return {
    state,
    open,
    confirm,
    prompt,
    toast,
    setAppContext(context) {
      appContext = context
    },
  }
}
