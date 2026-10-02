// Public entry of the dashboard package (overall.md 12).
import './theme/theme.css'
import './theme/block.css'
import './theme/filters.css'
import './theme/page.css'
import './theme/lists.css'

export { createDashboard, useDashboard } from './core/plugin.js'

// Components for the host
export { default as DashboardPage } from './page/DashboardPage.vue'
export { default as DashboardPageList } from './page/PageList.vue'
export { default as DashboardFavourites } from './page/FavouritePages.vue'
export { default as DashboardBlockLibrary } from './blocks/BlockLibrary.vue'

// Providers
export { createMockProvider } from './providers/mock/mockProvider.js'
export { ProviderError } from './providers/errors.js'

// Helpers for custom widgets and hosts
export { matchRule, matchCondition } from './core/conditions.js'
export { formatValue } from './core/format.js'
export { filterValuesToUrl, filterValuesFromUrl } from './filters/urlFilters.js'
