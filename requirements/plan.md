# Build plan

Order of work. Each milestone ends with something visible. Specs: overall.md, contracts.md, tableWidget.md.

## Milestone 1: one table on screen, with real data flow
- [x] 1. Mock provider: `getCurrentUser`, `listSources`, `getSourceFields`, `getData` (conditions, sort, paging) with one sample source.
- [x] 2. Package setup: `createDashboard({ provider })` plugin + `useDashboard()` (no Pinia).
- [x] 3. Theme: CSS variables (colours, spacing, radius) + dark mode.
- [x] 4. Data path: `fetchData` wrapper (adds source + conditions, aborts older requests, tracks loading/error/empty).
- [x] 5. Widget registry + Table widget (Tabulator wrapper to the widget contract: `config`, `fetchData`, `reloadKey`, remote paging/sort).
- [x] 6. Block shell: header, loading/error/empty, Fullscreen, Refresh; renders one block loaded from the provider.

## Milestone 2: a page
- [x] 7. Page view (read-only): GridStack layout from `page.layout`, "not available" placeholder.
- [x] 8. Tab groups: tabs inside the page grid; blocks on closed tabs not loaded.

## Milestone 3: saved views
- [x] 9. Saved views: `v-model:state`, provider CRUD, defaults (my → public → built-in), view switcher, table settings panel.

## Milestone 4: filters
- [x] 10. Page filters: 5 types, mappings, Apply, translation to Conditions, select options + narrowing.
- [x] 11. Dynamic values: registry, built-ins, resolving.
- [x] 12. Saved filters + URL sync.

## Milestone 5: building
- [x] 13. Page edit mode: GridStack drag/drop, Save/Cancel, undo/redo, add/remove blocks and tab groups, filter setup.
- [x] 14. Create-block form (shared part + table config form + live preview), then block library.

## Milestone 6: rest of the core
- [x] 15. Conditional formatting: rule editor, `matchRule`, block + view rules.
- [x] 16. Export: CSV.
- [x] 17. Ownership/permissions UI, save conflicts, version history, duplicating.
- [x] 18. Translations.

## Milestone 7: providers and other widgets
- [ ] 19. LocalStorage provider, then REST provider.
- [ ] 20. Other widgets, each with its own doc first: KPI, Text, Chart, Gantt.

## Milestone 8: shipping
- [ ] 21. npm library build, then the starter template app.
