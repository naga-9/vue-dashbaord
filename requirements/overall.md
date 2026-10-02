# Dashboard package — overall requirements

## 1. Scope & structure
- This is for the frontend only. The backend (storage, users, permission rules) is out of scope; the frontend talks to it only through a data provider (see 9).
- Structure: **Page (+ Page filters) > Blocks and Tab groups > Blocks > Widgets**
  - **Page**: a dashboard built from blocks and tab groups on a grid, with page filters on top.
  - **Tab group**: a set of tabs placed on the page like a block; each tab holds its own blocks. Page layout only, not reusable.
  - **Block**: a widget + config (optionally a data source). Reusable across pages.
  - **Widget**: the shell that renders a block (Table, Chart, …). Holds no data.
  - **Saved view** (per block) / **saved filter** (per page): named, saved state.
- Roles (not fixed per person; the same user can be a viewer of one page and a builder of another):
  - **Viewer**: uses pages: opens them, applies filters, switches saved views/filters.
  - **Builder**: creates or edits pages, blocks, saved views or saved filters (needs canCreate / canEdit, see 7).
  - **Host**: the app that embeds the package; owns layout, routing, login, URL sync and registers custom widgets/dynamic values.
- "User" means whoever is logged in, in any role.

## 2. Pages

### Page UI
The screens are the reference for the page's UI: view-mode header (favourite, Edit page, ⋯ menu), edit mode (edit bar instead of the header, editable blocks and tab groups), Add block, filter setup and page settings dialogs. Live canvas: [Dashboard page design](https://claude.ai/artifact/MiUnuX5ms4wfj79hA8yJH2) (private until shared). Agreed screens, 2026-10-02:

| Screen | Image |
|---|---|
| 1 · Page (view mode) | [page-1-view.png](designs/page-1-view.png) |
| 2 · Page (edit mode) | [page-2-edit.png](designs/page-2-edit.png) |
| 3 · Edit mode → Add block | [page-3-add-block.png](designs/page-3-add-block.png) |
| 4 · Edit mode → Filters (setup and mapping) | [page-4-filter-setup.png](designs/page-4-filter-setup.png) |
| 5 · Edit mode → Page settings | [page-5-page-settings.png](designs/page-5-page-settings.png) |

When the screens change, update the images here.

### Block library, page list and version history UI
The screens are the reference for the block library (full page), the page list and favourite pages components (the host places them; the sidebar itself is the host's), and the version history dialog (pages and blocks). Live canvas: [Dashboard library and lists design](https://claude.ai/artifact/NxsUigGWSL2WVySfmCHuPP) (private until shared). Agreed screens, 2026-10-02:

| Screen | Image |
|---|---|
| 1 · Block library | [library-1-block-library.png](designs/library-1-block-library.png) |
| 2 · Page list and favourites | [library-2-page-list.png](designs/library-2-page-list.png) |
| 3 · Version history | [library-3-version-history.png](designs/library-3-version-history.png) |

When the screens change, update the images here.

### Page editor & edit mode
- Drag/drop block-based page editor (GridStack.js). The page toggles between view and edit mode.
- Edit mode has Save / Cancel. Changes (layout, added/removed blocks, filters, tab groups and tabs) stay local until Save; Cancel discards them and leaves edit mode. Viewers never see a page mid-edit.
- Block configs are not part of page edits: a block is created or edited in its own form and saved there (with its own version and conflict check). Page Save / Cancel and undo/redo cover only the page (placement, layout, filters, tab groups and tabs), never block configs.
- Undo/redo in edit mode for page changes (layout, added/removed blocks, filters, tab groups and tabs). Save or Cancel clears the history.
- On small screens (e.g. below 768px), blocks stack in a single column (GridStack columnOpts breakpoints; not automatic, the package configures it).
- Edit mode is not available on small screens (view only).

### Tab groups
- A page can have any number of tab groups, placed on the page grid between blocks (e.g. a table, then a tab group with 2 tabs, then a chart, then a tab group with 3 tabs).
- Each tab (e.g. "Overview | Details") holds its own set of blocks in its own grid. The first tab opens by default.
- One level only: a tab cannot contain another tab group.
- Full-page tabs = one full-width tab group.
- A tab group's height is set by the builder like a block's; content taller than that scrolls inside it.
- Page filters apply to the whole page (all tabs of all groups).
- A block can appear only once per page, across all tabs (v1).
- Blocks on tabs that are not open are not loaded until the tab is opened.
- The open tab of each group can be kept in the URL (prop + event, like filter values). Tab ids are unique across the page, so the URL lists open tabs by id (e.g. `?tabs=t_lines,t_q3`).
- On small screens, a tab group stacks in the single column like a block; the blocks inside its tabs stack too.

### Managing pages
- Pages are identified by a stable id. Renaming changes only the display name; URLs/slugs are the host's concern.
- A page can be renamed, duplicated (see 8) and deleted.
- Deleting a page never deletes its blocks.
- Blocks the user cannot see (e.g. a private block on a public page) show a "not available" placeholder.
- Saving a public page that contains private blocks (when publishing it, or after adding a private block to it) shows a warning first (e.g. "2 blocks are private and won't be visible to others").

### Page list & favourites
- The page list component shows the user's own pages plus public pages.
- Users can mark pages as favourites (per user). A separate "Favourite pages" component lists them and can be placed anywhere by the host (e.g. sidebar, home page).

## 3. Page filters

### Filters UI
The screens are the reference for the filters' UI: a vertical filter panel on the left of the page (collapsible to a rail), field editors that open from the panel, Apply/Reset at the bottom, and saved filters (list-only dropdown + gear → side panel, like saved views). Live canvas: [Dashboard filters design](https://claude.ai/artifact/6v4435xfyvey4FanAiq8f1) (private until shared). Agreed screens, 2026-10-02:

| Screen | Image |
|---|---|
| 1 · Filter panel | [filters-1-panel.png](designs/filters-1-panel.png) |
| 1b · Filter panel collapsed | [filters-1b-panel-collapsed.png](designs/filters-1b-panel-collapsed.png) |
| 2 · Select filter open | [filters-2-select.png](designs/filters-2-select.png) |
| 3 · Date filter open | [filters-3-date.png](designs/filters-3-date.png) |
| 4 · Gear → saved filters panel | [filters-4-saved-filters-panel.png](designs/filters-4-saved-filters-panel.png) |

When the screens change, update the images here. Filter setup in page edit mode is designed with the page.

### Setting up filters (edit mode)
- Filters are added, edited and removed in page edit mode (covered by Save / Cancel).
- When adding a filter, the builder chooses which blocks it applies to. Blocks not chosen are not affected.
- For each chosen block, the builder maps the filter field to a block field (names may differ, e.g. customer ↔ party). Only fields of a matching type are offered (see contracts.md, FilterMapping). Each such link (filter → block → field) is a **filter mapping**.
- Filter mappings belong to the page, not the block: the same block on two pages can be mapped differently. They are saved with the page (page edit mode, undo/redo, page version history).
- When a block is added to a page that already has filters, the builder is reminded to map the existing filters to it (otherwise they don't apply to that block).
- Blocks without a data source are not offered in filter mapping.

### Filter types
- Fixed list: Text, Number (range), Date range, Select (single/multi), Yes/No.
- Each type has a small fixed set of operators, including exclude:
  - Text: contains / does not contain
  - Number: between (either end may be left empty, e.g. "≥ 100")
  - Date: between (either end may be left empty), or a dynamic value (e.g. Next month)
  - Select: is / is not (e.g. Customer is not "Customer 3")
  - Yes/No: is
- The package translates them into conditions on each mapped block's field (see contracts.md, Filter operators).
- Filter inputs are the package's own components (see 10). The filter logic (mapping, Apply, URL, saved filters) is the package's own.

### Applying filters
- Filter changes are not applied until the user clicks Apply. Changed-but-not-applied filters are shown as such.
- When several filters apply to the same block, they are combined with AND (OR between filters is not in v1; a multi-select already gives OR within one field).
- Page filters are combined with a block's fixed conditions (AND).

### Select options & filter dependencies
- Options are `{ value, label }` (e.g. value `CUST-001`, label "ACME Ltd"): filtering uses the value, the UI shows the label. Searchable.
- "Values from" setting per Select filter:
  - Mapped fields (default): the union of distinct values from every block the filter is mapped to.
  - Custom list: fixed values entered by the builder (e.g. Open / Pending / Closed).
- Rule: a filter's options are the values that appear in at least one mapped block's data, given the other filters' current values ("what you can pick is what you can see").
  - For each mapped block, the package requests distinct values of the mapped field, with that block's fixed conditions and the other filters mapped to that same block. Requests run in parallel; results are merged and de-duplicated by value. Identical requests are sent once.
- Narrowing happens immediately, using the other filters' current values, even before Apply. Blocks still update only on Apply.
- Example: Item is mapped to SO Lines.item and PO Lines.item; Customer to SO Lines.customer; Supplier to PO Lines.supplier.
  - Item = X → Customer shows customers in SO lines with X; Supplier shows suppliers in PO lines with X.
  - Customer = C1 → Item shows SO items for C1 plus all PO items (Customer is not mapped to PO, so the PO table still shows all its items).
- Selected values that no longer match are removed automatically (checked with the provider, not just against the options currently loaded).

### Filter values in the URL
- Filter values can be put in the URL (e.g. `?f_customer=CUST-001`) so a filtered page can be bookmarked or shared. The page component accepts filter values as a prop and emits changes (on Apply), both already in URL form; the host copies them to/from its query string as-is.
- URL form (keys are filter ids):
  - Multiple values: repeated keys (`?f_customer=CUST-001&f_customer=CUST-002`).
  - Exclude ("is not" / "does not contain"): `!` prefix (`?f_customer=!CUST-003`).
  - Ranges: `from..to`, either end optional (`?f_amount=100..500`, `?f_amount=100..`).
  - Dynamic values: `@` + key (`?f_due=@next_month`).
- Filter values in the URL take priority over the default saved filter.
- Filter values that are changed but not saved (and not in the URL) reset on reload (see 8).

### Dynamic values
Named values that are stored by name and resolved to a real value only when data is requested (e.g. "Next month", "Current user", "This fiscal year").
- Definition: `{ key, label, type, resolve(context) → value }`. `type` is a filter type; a dynamic value is only offered where the type matches. `resolve` may be async.
- Context passed to `resolve`: now + timezone/locale, the user (from the provider, including host-defined attributes such as default company), and the page's current filter values.
- Registry: the package registers built-ins (relative dates: Today, Yesterday, Tomorrow, This/Last/Next week/month/quarter/year, Last/Next N days, Year to date; Current user). The host can register more or replace built-ins (e.g. "This fiscal year" resolved from the selected company, or the user's default company).
- Usable anywhere a value is entered: filter values, saved filters, the URL (e.g. `?f_due=@next_month`) and fixed conditions.
- Stored as the key, never the resolved value, so saved filters and URLs stay current.
- Resolved just before each data request; re-resolved when the context changes (e.g. the company filter changes). Blocks update on Apply.
- Shown as the label plus a hint of the resolved value (e.g. "This fiscal year · Apr 1 2026 – Mar 31 2027").
- If `resolve` fails, the filter shows an error and the affected blocks show their error state; the page never breaks.
- Providers always receive plain resolved values.

## 4. Blocks

### Basics
- A block is a widget + config. Rows are sent by the source; the block does not store them.
- The builder decides whether the block uses a data source (what to fetch); widgets do not enforce it (e.g. a Text box can be static or show data; a Chart without a source simply shows nothing).
- A block's data source can be added, changed or removed later; the consequences are the builder's responsibility. The platform only guarantees that nothing breaks:
  - Page filter mappings to fields that no longer exist stop applying to that block; in page edit mode they are marked as broken so the builder can re-map them.
  - Fixed conditions on missing fields put the block in an error state (they are not silently dropped, so the block never shows more data than intended).
  - Widget config, conditional formatting and saved views referring to missing fields are ignored for those fields.
- A block's widget type is fixed after creation; a different widget type means a new block.
- A block can have fixed conditions set by the builder (e.g. status in (Open, Pending)), using the full operator set (=, !=, <, >, in, between, …). Viewers cannot change them.
- Large data is paged/sorted remotely through the data provider (e.g. the Table widget uses Tabulator's remote paging/sorting).

### Block config vs saved view
A block's settings fall into three layers:

| Layer | Stored in | Set by | Examples (Table) |
|---|---|---|---|
| Data | Block config (shared part) | Builder | data source, fixed conditions |
| Presentation | Block config (widget part + formatting rules) | Builder | which columns exist, labels, number/date formats, conditional formatting rules for everyone |
| View state | Saved view | Anyone (saving needs permissions, see 7) | column order, hidden columns, sorting, grouping, own conditional formatting rules |

- Rule of thumb: block config decides **what** the block shows and **how it looks**, the same for everyone; a saved view only **arranges** what the block config allows.
- A saved view can never add anything the block config does not have (e.g. it can hide a column, but not add a field that is not one of the block's columns).
- Changing block config needs canEdit on the block and is versioned (see 8); changing view state is temporary until saved as a saved view (see 6).
- When no saved view applies, the widget derives its default view state from the block config (e.g. columns in configured order, no sorting).
- Each widget's requirements doc lists which of its settings are presentation (block config) and which are view state (saved view).

### Blocks across pages
- Any block can be placed on any page, but only once per page (v1).
- Saved views belong to the block. The same block on different pages shares the same saved views.
- Removing a block from a page only takes it off that page. Deleting a block (from the block library) removes it everywhere.
- Deleting a block used on other pages shows a warning first (e.g. "Used on 3 pages. Delete anyway?"); those pages then show the "not available" placeholder. The data provider reports how many pages use a block.
- Editing a block shows a note when it is used on other pages (e.g. "Used on 3 pages. Changes apply everywhere.").
- A block can be duplicated (e.g. to change its config without affecting other pages; see 8).

### States & actions
- Each block with a data source shows its own loading, error and empty states. Blocks without a data source have none of these.
- A failing block (any kind) never breaks the page or other blocks.
- Every block has a Fullscreen action. Blocks with a data source also have a Refresh action (manual only; auto-refresh is out of scope for now).
- Export: blocks whose widget supports it get an Export action. Widgets only describe what to export; the package does the export itself, the same way for every widget. v1: CSV (raw values, all matching rows up to a limit). Widgets can also add their own actions to the block.
- Where these actions sit in the block: see Block UI below.
- Click-through: clicking a record in a block (e.g. a table row) emits an event (e.g. `open-record { source, id }`). The host decides what happens (e.g. open the record in another app).

### Block UI
The screens are the reference for the block's UI (layout, icons, order, dropdown, side panel, Edit block modal). Live canvas: [Dashboard block design](https://claude.ai/artifact/M4jRffFFC25LzAjvxzzNU5) (private until shared). Agreed screens, 2026-10-02:

| Screen | Image |
|---|---|
| 1 · Block header | [block-1-header.png](designs/block-1-header.png) |
| 1b · Header on a narrow block | [block-1b-narrow-header.png](designs/block-1b-narrow-header.png) |
| 2 · Saved views dropdown | [block-2-views-dropdown.png](designs/block-2-views-dropdown.png) |
| 3 · Gear → side panel | [block-3-side-panel.png](designs/block-3-side-panel.png) |
| 4 · Edit block → modal | [block-4-edit-modal.png](designs/block-4-edit-modal.png) |

When the screens change, update the images here.

### Creating a block
- Blocks can be created from two places:
  - Page edit mode: "Add block" offers New (create and place on this page) or Pick existing (choose from blocks the user can see). A new block is saved in the create-block form before it is placed; if the page edit is then cancelled, the block stays in the block library (only its placement is discarded).
  - Block library: lists all blocks the user can see, for creating and managing them (rename, duplicate, delete) without opening a page.
- The create-block form has a shared part (Name, Description, Visibility, Data source, Fixed conditions, Conditional formatting rules if the widget supports them) provided by the package, and a widget-specific part provided by each widget (e.g. columns for Table, axes/aggregate for Chart).
- Data source is optional for every widget. Fixed conditions are shown only once a data source is chosen.
- The widget part receives the chosen source's fields from the package; widgets never call the data provider directly.
- The form shows a live preview of the block while it is being configured, with a limited number of rows (e.g. first 10): the package caps `limit` in the preview's data requests, so widgets need nothing special.

## 5. Widgets
- Widgets are shells (e.g. Table widget). They hold no data.
- Built-in widgets (v1): Table, Chart, KPI / Number card, Gantt, Text / Markdown box (static text, or a row template like `{{name}} | {{customer}}` when linked to a data source, with a row limit).
- Each widget type has its own requirements doc (e.g. tableWidget.md).
- Saved views are optional per widget (e.g. a Text box has none). Widgets that support them can save and restore their own state (see 6).
- Conditional formatting:
  - The package provides the rule format (condition → style), a shared rule editor, and semantic styles (danger, warning, success, muted) mapped to theme CSS variables.
  - Each widget declares if it supports rules and decides what gets styled (e.g. Table: cell/row; KPI: the number; Chart: bar/point; Gantt: task bar).
  - Rules can be set in two places: the block config (by the builder; everyone sees them) and a saved view (by anyone, for that view only). Both use the same rule editor.
  - The widget gets block rules followed by the current view's rules; when two rules style the same thing, the view's rule wins.
  - View rules are view state: temporary until saved as a saved view, and shared with others only if the view is made public.
- Custom widgets: host apps can register their own widget types. A custom widget follows the same contract as built-in ones (create-block form, optional save/restore state, optional conditional formatting, optional export).
- The widget part of the block form is a hand-written component per widget (not generated from a schema). So that custom widgets look the same as built-in ones, the package exports the form components its own widgets use, styled only with the package's CSS variables (theme and dark mode apply): basics (field with label and error, text input, select, checkbox, radio group) and dashboard-specific ones (source field picker filtered by type, condition rows, a reorderable list with remove).

## 6. Saved views & saved filters
- Saved view: a named view state of a block (e.g. column order, sorting, own conditional formatting rules), never rows. Column widths are not part of it.
- Saved filter: a named set of filter values for a page (per page).
- Both have an owner + visibility (see 7).
- Default: the user's own default wins over the public default.
- There is always a public default. Until one is set (and again if it is deleted or made private), the fallback acts as it: the widget's built-in default state for saved views, "no filter values" for saved filters.
- Widgets must tolerate saved views that no longer match the block config (e.g. a removed column): unknown fields are ignored.

## 7. Ownership, visibility & permissions
- Pages, blocks, saved views and saved filters have an owner (set by the backend to the creator, never sent by the frontend) and a visibility: Private or Public.
- Private items are visible only to their owner; public items to everyone.
- The backend only sends what the user may see; the frontend never filters by user.
- For actions on visible items (edit, delete, publish), the UI shows or hides them based on flags from the backend. The backend still enforces them.
  - User-level flags (sent once): canCreate and canPublish for pages, blocks, saved views and saved filters (e.g. `pages.canPublish`). Without canPublish, "Public" is not offered.
  - Per-item flags (sent with each item): canEdit, canDelete.
- Setting the public default requires canPublish for that item type (savedViews.canPublish / savedFilters.canPublish), since it changes what everyone sees. It does not require canEdit on the block or page: saved views and filters are managed independently of the item they belong to.

## 8. Editing, saving & history
Applies to pages, blocks, saved views and saved filters unless stated otherwise.

### Unsaved changes
- Only changes made in an edit form count as unsaved changes: page edit mode, the block form (Edit block modal), and the edit form of a saved view (the block's side panel, see 4 → Block UI) or saved filter.
- Everything else is temporary and never "unsaved" (e.g. applying filter values, sorting or resizing columns directly in a table, even while a saved view/filter is open). Temporary changes made directly in a block are never stored in a saved view: saving a view stores only what was set in its side panel. Temporary state resets on reload; it can be kept by saving it as a saved view/filter.
- Unsaved changes are kept while navigating within the app; navigating away does not discard them.
- They are discarded only by Discard/Cancel or by reloading the browser page.
- Unsaved changes are shown with a red "Unsaved" badge (theme danger colour).

### Saving conflicts
- If someone else saved the same item after it was loaded, Save shows "This <item> was changed by <name> at <time>" (e.g. "This page was changed…") instead of overwriting silently.
- The only option is Reload: the user's unsaved changes are discarded and the latest version is loaded. No overwrite.
- Items include modified time and modified by, so the frontend can detect this.
- If a save or delete fails (e.g. network or server error), nothing is discarded: the user stays where they were, sees an error, and can retry.

### Version history (pages and blocks)
- The backend creates a version on each save (who, when). The frontend lists them through the data provider.
- Users with canEdit can view and restore earlier versions. Restoring creates a new version (nothing is lost).
- A page version stores block references, not block configs. Restoring shows each block's current config; blocks deleted since then show the "not available" placeholder, which the builder can remove in edit mode.

### Duplicating
- Duplicating a page copies its layout and filters; the copy points to the same blocks (blocks are not copied). Its saved filters are copied too.
- Duplicating a block copies its saved views.
- Only saved views / saved filters the user can see are copied (their own + public).
- The copies are owned by the user who duplicated. Public copies stay public only if the user has canPublish; otherwise they become private.
- Duplicating is done by the package through the provider's normal create calls (no duplicate method in the provider), so the copy rules live in one place. It is not atomic: if a saved view/filter copy fails, the copied page/block is kept, the user is told which copies failed, and can recreate them.

## 9. Data provider
- The frontend talks to the backend only through a data provider interface: pages, blocks, saved views, saved filters, favourite pages, versions (list/view/restore), data sources (+ their fields), distinct field values as `{ value, label }` (for Select filters; one request per mapped block, with its fixed conditions and the other filters' current values; searchable), block usage count, data, current user.
- Current user (required; every provider must implement it, loaded once at start):
  - `id`, `name`
  - `locale`, `timezone` (optional; fall back to the browser's)
  - User-level flags: canCreate and canPublish for pages, blocks, saved views and saved filters (see 7)
  - `attributes`: free-form, host-defined values (e.g. default company, team), used by dynamic values (see 3)
- Exposes available data sources and their fields (name, label, type), filtered to what the user may use.
- A data request has a shared part added by the package (source, fixed conditions, and page filters already translated through their filter mappings into conditions on the block's own fields; the provider never sees page filters or mappings) and a widget part (e.g. fields, paging, sorting for Table; grouping/aggregation for Chart).
- All methods are async (even LocalStorage), so remote backends fit the same interface.
- When new data is requested for a block, any older request still in progress for that block is cancelled; late responses are ignored. Data requests accept an abort signal.
- Lists returned by the provider are already filtered to what the current user may see.
- Each item includes owner, isMine, modified, modifiedBy and per-item permission flags. Optional: ownerName for display.
- The browser never connects to a database directly; database access goes through the backend's API.
- Ships with a LocalStorage provider (default; acts as a single local user), a generic REST provider, and a mock provider (sample sources and data, in memory) for tests and demos.
- Other providers (e.g. Frappe, Supabase) can be plugged in without changing page, block or widget code.

## 10. Styling & UI components
- All visual values (colours, spacing, radius, fonts) come from CSS variables. A default theme is included; users override the variables to theme it.
- Dark mode is supported via a dark set of the same CSS variables.
- CSS is prefixed and does not affect the host. The host app must not need Tailwind (the package ships compiled CSS).
- The package's UI components (filter inputs, dialogs, menus, tabs, tooltips, popovers, toggles) are its own, built on Reka UI (headless, MIT) for keyboard, accessibility and positioning, and styled only with the package's CSS variables. No styled UI library (e.g. PrimeVue, Element Plus, frappe-ui) and no licence-key dependencies.
- Template overrides via Vue slots for: block header, empty/error/loading states and the "not available" placeholder. Replacing a whole widget is done by registering a custom widget.
- Full restyling (replacing component markup/classes) is not a goal.

## 11. Translations
- All UI text in the package (buttons, messages, e.g. "Save", "Used on 3 pages…") is translatable. English is included; the host can supply other languages or override texts.

## 12. Distribution & host integration
- Shipped as an npm package for Vue 3 apps.
- The package provides dashboard components only (page view, page list, favourite pages, page editor, block library). The host app owns layout (menu, header, footer), routing and login.
- Works inside an existing Vue 3 project: no own router (pages are selected by prop, navigation via events).
- Events for the host: components emit events for things the host may want to react to (e.g. page saved, page deleted, open page, open record, filter values changed (on Apply), tab changed), for navigation, analytics etc.
- State is kept internal to the package (no Pinia or other state library required by the host). The host accesses it through exported composables (e.g. `useDashboard()`).
- A starter template is provided for people starting from scratch: a separate, ready-to-run Vue 3 + Vite app (e.g. `npm create <package-name>@latest`) with routing (home, page view, block library), event handling (open-page, open-record), filter/tab sync with the URL, provider choice (LocalStorage by default, REST via config), theme overrides, dark mode and a second language as examples.

## 13. Later
Not in v1, but planned.
- Cross-filtering / drill-down: clicking a value in one block (e.g. a chart bar) filters the other blocks on the page.
- Host-registered custom filter types.
- OR between page filters.
- Per-page "auto-apply" option for filters (no Apply button).
- Page templates: "start from a template" when creating a page.
- Import / export (JSON), e.g. to move dashboards between installations. Notes so far:
  - Modular: pages, blocks, saved views and saved filters exported separately, referring to each other (possibly via a portable key, since import creates new ids).
  - Importing creates new items owned by the importer (visibility Private); users with canPublish can choose "Keep public visibility".
  - Missing items in the target (data source, fields, dynamic values, custom widgets) show clear states, never a broken page.
- TypeScript types for the data provider and widget contracts (the package itself may stay JavaScript).
- Export: formatted CSV, XLSX (with Excel display formats), PDF per block, chart as image.
- Print page: browser print (user can "Save as PDF") with a print-friendly layout (blocks in normal flow, buttons hidden). Tables print only the loaded rows. True PDF generation is not planned.
