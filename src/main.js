// Dev host app: shows how a host app uses the dashboard package (mock provider, URL sync, theme, language).
import { createApp } from 'vue'
import { createDashboard, createMockProvider } from './dashboard/index.js'
import App from './App.vue'
import './app.css'

const settings = JSON.parse(localStorage.getItem('demo-settings') ?? '{}')
document.documentElement.dataset.dbTheme = settings.theme ?? 'light'

const dashboard = createDashboard({
  // Two browser tabs share the data (localStorage), so save conflicts can be tried.
  provider: createMockProvider({ userId: settings.userId ?? 'u_demo', persistKey: 'dashboard-demo-data' }),
  locale: settings.locale ?? 'en',
  currency: 'CAD',
  // Example of host-provided texts (a second language, partly translated).
  messages: {
    fr: {
      'common.save': 'Enregistrer',
      'common.cancel': 'Annuler',
      'common.loading': 'Chargement…',
      'filters.apply': 'Appliquer',
      'page.edit': 'Modifier',
      'block.refresh': 'Actualiser',
      'block.fullscreen': 'Plein écran',
      'block.exportCsv': 'Exporter en CSV',
      'block.empty': 'Aucune donnée',
    },
  },
  // Example of a host-registered dynamic value.
  dynamicValues: [
    {
      key: 'this_fiscal_year',
      label: 'This fiscal year',
      type: 'date',
      resolve: () => {
        const now = new Date()
        const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
        return [`${start}-04-01`, `${start + 1}-03-31`]
      },
    },
  ],
})

createApp(App, { settings }).use(dashboard).mount('#app')
