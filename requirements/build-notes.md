# Build notes

What is built, how to try it, and the decisions made while coding that neither the specs nor the designs settle.
Each decision is open for review; say which ones to change. The UI itself follows the agreed screens (overall.md: Page UI, Filters UI, Block UI, Block library / page list / version history UI).

## How to try it
- `npm run dev`, open the app. The dev host (`src/App.vue`, `src/main.js`) uses the mock provider with sample data.
- Header: switch user (Demo User = admin, Asha, Viewer = no create/publish), language (English / partial French), dark mode, reset demo data.
- Data is kept in localStorage, so it survives reloads; two browser tabs share it (try a save conflict: edit the same page in both, save both).

## Where things are (`src/dashboard/`)
| Folder | What |
|---|---|
| `core/` | plugin + `useDashboard()`, i18n + English texts, dialogs/toasts, conditions, dynamic values, formatting, CSV export, saving/conflicts, duplicating |
| `providers/` | `ProviderError`, mock provider + sample data |
| `ui/` | package UI pieces on Reka UI: dialog host/frame, confirm, prompt, menu, side panel, icons, reorderable list, saved-item dialog |
| `blocks/` | block shell (header, states), data path (`useBlockData`), Edit block modal, condition editor, version history, block library |
| `widgets/` | registry; `table/` = Table widget, its config form (modal) and view settings (side panel) |
| `savedviews/` | saved views + saved filters (shared logic), dropdown, side-panel list, the block's side panel |
| `filters/` | filter types, URL form, filter state, filter panel and rail, field editors, saved filters panel |
| `page/` | page, grid (GridStack), tab groups, edit mode, edit dialogs (add block, filters, page settings), page list, favourites |
| `formatting/` | rule list, rule dialog, rule summaries |
| `theme/` | CSS variables, dark mode; `theme.css` base + `block.css`, `filters.css`, `page.css`, `lists.css` |

## Decisions made during the build

### Contracts / data
1. **Select values in the URL are strings**; for number fields the package turns them back into numbers.
2. **Dynamic date values resolve to `[from, to]`.** With `between`/`=` the range is used, with `>`/`>=` the start, with `<`/`<=` the end.
3. **Built-in "Last/Next N days"** are fixed: 7, 30 and 90 days (no free N).
4. **Currency:** `createDashboard({ currency: 'CAD' })` sets the default currency code; a column can override it with `currency`. (The specs have no currency code.)
5. **Mock provider extra:** `reset()` (not in the contract) for the demo's "Reset demo data". Error code `bad_request` for unknown fields/operators.

### Blocks & widgets
6. **Refresh and Apply reload the table from page 1.**
7. **Rows are clickable** (cursor + hover) because of click-through; the dev host shows the `open-record` event at the bottom left.
8. **The Edit block modal keeps no draft** while navigating: it is a modal, so you can't navigate away with it open. Page edit drafts *are* kept.
9. **Changing the data source in the Edit block modal** resets the widget config to the new source's defaults and clears fixed conditions and formatting rules.
10. **Table columns in the modal** show a decimals box only for number, currency and percent formats (not drawn in the design).
11. **Narrow block header:** below 440px of header width, all widget icons go into "More".
12. **"Default view" has no Update** in the side panel footer (the built-in view can't be overwritten); only Save as new.

### Pages, tabs, edit mode
13. **Moving a block between the page and a tab** is done with "Move to…" in the block's edit menu, not by dragging between grids (dragging works within one grid). Dragging across nested grids with Vue owning the DOM is fragile.
14. **Removing a tab or a tab group moves its blocks to the page grid** (they are not removed).
15. **Tabs stay loaded after their first opening** (switching back keeps the table's state).
16. **Small screens:** grids switch to 1 column below 768px of *grid* width, so a narrow tab group also stacks its blocks; the filter panel moves above the blocks.
17. **New page** (page list) uses the Page settings modal with a Create button, then opens the empty page. Duplicating a page opens the copy.

### Filters & saved items
18. **The filter panel's collapsed state is remembered per browser** (localStorage); it is a viewer convenience, not saved anywhere else.
19. **Clear all and ×** clear the field values in the panel; like any change, they apply only on Apply.
20. **The saved filters panel footer** ("Current filters differ from …") appears only while a saved filter is open; with "No saved filter" there is nothing to update.
21. **Saved-item names** must be unique among *your own* views/filters for that block/page.
22. **Pressing Enter** in a filter input applies the filters.
23. **"is not" select values are not auto-removed** when other filters change (they don't need to appear in the data).

### Lists and history
24. **Version history opens on the previous version** (the one you would restore), not on the current one.
25. **Page list rows have no "Open"** in their ⋯ menu; clicking the name opens the page.

## Not done / limits
- Milestone 7 (LocalStorage and REST providers; KPI, Text, Gantt widgets; Chart waits for a chart library) and milestone 8 (npm build, starter template).
- Table styling is still Tabulator's simple theme with the package colours (to be designed later).
- No automated test suite in the repo; changes are checked in a headless browser and with Node checks.
- The JS bundle is large in the dev build (Tabulator + GridStack + Reka); code-splitting belongs to the npm build step.
