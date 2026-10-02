// Widget registry (contracts.md → Widget). Built-in and host widgets register the same way.
import { markRaw, reactive } from 'vue'

const REQUIRED = ['type', 'label', 'component', 'configForm', 'defaultConfig']

export function createWidgetRegistry(initial = []) {
  const widgets = reactive(new Map())

  function register(definition) {
    for (const key of REQUIRED) {
      if (!definition[key]) throw new Error(`registerWidget: "${key}" is required`)
    }
    widgets.set(definition.type, {
      savedViews: false,
      formattingTargets: [],
      exports: [],
      actions: [],
      defaultState: () => null,
      ...definition,
      component: markRaw(definition.component),
      configForm: markRaw(definition.configForm),
      viewSettings: definition.viewSettings ? markRaw(definition.viewSettings) : null,
    })
  }

  initial.forEach(register)

  return {
    register,
    get: (type) => widgets.get(type),
    all: () => [...widgets.values()],
  }
}
