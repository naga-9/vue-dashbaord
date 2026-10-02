// Table widget definition (contracts.md → Widget, tableWidget.md).
import TableWidget from './TableWidget.vue'
import TableConfigForm from './TableConfigForm.vue'
import TableViewSettings from './TableViewSettings.vue'
import { defaultState } from './tableState.js'

export default {
  type: 'table',
  label: 'widgets.table',
  icon: 'table',
  savedViews: true,
  formattingTargets: ['cell', 'row'],
  exports: ['data'],
  actions: [],
  component: TableWidget,
  configForm: TableConfigForm,
  viewSettings: TableViewSettings,
  defaultState,
  defaultConfig: (fields) => ({
    columns: fields.map((f) => ({ field: f.name, label: f.label })),
    pageSize: 25,
  }),
}
