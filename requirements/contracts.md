# Dashboard package — contracts (draft)

The shapes of the core items, as exchanged with the data provider. Requirements behind them live in overall.md.
Widget-specific parts (`widgetConfig`, saved view `state`) are opaque here; each widget's doc defines them.

## Common item fields
Shared by pages, blocks, saved views and saved filters.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable, set by the backend. |
| `name` | string | Display name. |
| `visibility` | `"private"` \| `"public"` | |
| `owner` | string (user id) | Set by the backend to the creator; never sent by the frontend. |
| `ownerName` | string | Optional, for display. |
| `isMine` | boolean | Sent by the backend. |
| `modified` | ISO datetime | Used for the save conflict check. |
| `modifiedBy` | string | Display name of the last editor. |
| `canEdit`, `canDelete` | boolean | Per-item flags (UI hints; the backend still enforces). |

## Condition
Used by fixed conditions, and by page filters after they are translated through their mappings.

```js
{ field: "status", op: "in", value: ["Open", "Pending"] }
{ field: "due", op: "between", value: { dynamic: "next_month" } }   // dynamic value, stored by key
```

- `field`: a field name of the block's data source.
- `op`: `=`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `not in`, `between`, `contains`, `not contains`, `is set`, `is not set`.
- `value`: a plain value, or `{ dynamic: "<key>" }`. The package resolves dynamic values before calling the provider.
- Several conditions are combined with AND.

## Block

| Field | Type | Notes |
|---|---|---|
| *(common fields)* | | |
| `description` | string | Optional. Shown e.g. in the block library and as a tooltip. |
| `widgetType` | string | e.g. `"table"`, `"chart"`, or a host-registered type. Fixed after creation; a different widget type means a new block. |
| `source` | string \| null | Data source id. `null` = no data source. |
| `fixedConditions` | Condition[] | Empty when `source` is `null`. Viewers cannot change them. |
| `formatting` | Rule[] | Conditional formatting rules (package-defined format). Empty if the widget doesn't support it. |
| `widgetConfig` | object | Presentation config, defined by the widget (e.g. Table: columns, labels, formats). |

Example:

```js
{
  id: "blk_42",
  name: "Open sales orders",
  visibility: "public",
  owner: "u_7", ownerName: "Asha", isMine: false,
  modified: "2026-10-02T09:15:00Z", modifiedBy: "Asha",
  canEdit: true, canDelete: false,

  widgetType: "table",
  source: "sales_orders",
  fixedConditions: [{ field: "status", op: "!=", value: "Cancelled" }],
  formatting: [],
  widgetConfig: { /* defined in tableWidget.md */ }
}
```

## Saved view

| Field | Type | Notes |
|---|---|---|
| *(common fields)* | | |
| `blockId` | string | The block it belongs to. Shared across all pages that use the block. |
| `state` | object | View state, defined by the widget (e.g. Table: column order, hidden columns, sorting). Never rows. |
| `formatting` | Rule[] | The view's own conditional formatting rules, added on top of the block's. Package-owned (not part of `state`). Empty if the widget doesn't support rules. |
| `isPublicDefault` | boolean | At most one per block. Only a public view can be the public default. |
| `isMyDefault` | boolean | Computed per user, like `isMine`. At most one per block per user. |

Defaults:
- Two kinds: the **public default** (one per block, for everyone) and **my default** (a per-user choice).
- My default can be any view the user can see: their own, or a public one.
- Which view opens: my default → public default → the widget's built-in default state (derived from the block config).
- Setting the public default requires `savedViews.canPublish` (not `canEdit` on the block). Deleting the public default view, or making it private, clears it.
- Setting my default needs no permission flag; it changes nothing for anyone else.
- Both are set through their own provider calls, not by editing the view (they are not covered by the view's conflict check).

Example (as seen by the current user, who is not the owner):

```js
{
  id: "sv_9",
  name: "By customer",
  visibility: "public",
  owner: "u_7", ownerName: "Asha", isMine: false,
  modified: "2026-10-02T10:00:00Z", modifiedBy: "Asha",
  canEdit: false, canDelete: false,

  blockId: "blk_42",
  state: { /* defined in tableWidget.md */ },
  formatting: [{ when: [{ field: "customer", op: "in", value: ["CUST-001"] }], style: "success", target: "row" }],
  isPublicDefault: true,
  isMyDefault: false
}
```

## Saved filter

| Field | Type | Notes |
|---|---|---|
| *(common fields)* | | |
| `pageId` | string | The page it belongs to. |
| `values` | object | Filter values keyed by the page filter's `id`: `{ <filterId>: { op, value } }`. Filters left out have no value. |
| `isPublicDefault` | boolean | At most one per page. Only a public saved filter can be the public default. |
| `isMyDefault` | boolean | Computed per user. At most one per page per user. |

- `op` is one of the filter type's operators (e.g. Text: contains / does not contain; Select: is / is not).
- `value` is a plain value or `{ dynamic: "<key>" }` (stored by key, never resolved).
- Values for filters no longer on the page are ignored.
- Defaults work as for saved views (my default → public default → no filter values; public default needs `savedFilters.canPublish`; both set through their own provider calls). Filter values in the URL take priority over any default.

Example:

```js
{
  id: "sf_3",
  name: "ACME, due next month",
  visibility: "private",
  owner: "u_8", isMine: true,
  modified: "2026-10-02T11:00:00Z", modifiedBy: "Ravi",
  canEdit: true, canDelete: true,

  pageId: "pg_1",
  values: {
    f_customer: { op: "is", value: ["CUST-001"] },
    f_due:      { op: "between", value: { dynamic: "next_month" } }   // see Filter operators
  },
  isPublicDefault: false,
  isMyDefault: true
}
```

## Page

| Field | Type | Notes |
|---|---|---|
| *(common fields)* | | |
| `description` | string | Optional. |
| `isFavourite` | boolean | Computed per user, like `isMine`. |
| `layout` | (Placement \| TabGroup)[] | The page grid: blocks and tab groups. |
| `filters` | PageFilter[] | In display order. Apply to the whole page, including all tabs. |

### Placement
A block reference plus its position (GridStack grid units). The block config is not stored here.

| Field | Type | Notes |
|---|---|---|
| `blockId` | string | Unique across the whole page, including inside tab groups (a block appears once per page). |
| `x`, `y`, `w`, `h` | number | Grid position and size, relative to the grid it sits in. The small-screen single-column layout is derived, not stored. |

### TabGroup
A set of tabs placed on the page grid like a block. Each tab has its own grid of blocks.

| Field | Type | Notes |
|---|---|---|
| `tabGroupId` | string | Unique within the page. |
| `x`, `y`, `w`, `h` | number | Position and size on the page grid. |
| `tabs` | Tab[] | At least one. In display order. The first tab opens by default. |

- One level only: a tab can hold blocks, not another tab group.
- A page that wants full-page tabs uses one full-width tab group.

### Tab

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique within the whole page (not just the group), so the URL and events can name a tab on its own. |
| `name` | string | Tab label. |
| `blocks` | Placement[] | The blocks on this tab, positioned on the tab's own grid. |

### PageFilter

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable within the page. Saved filters and the URL refer to it (URL form: overall.md 3). |
| `label` | string | Shown above the input. |
| `type` | `"text"` \| `"number"` \| `"date"` \| `"select"` \| `"boolean"` | Fixed list (see overall.md 3). |
| `multiple` | boolean | Select only: multi-select. |
| `optionsFrom` | `"mapped"` \| `"custom"` | Select only. Default `"mapped"`. |
| `customOptions` | `{ value, label }[]` | Select only, when `optionsFrom` is `"custom"`. |
| `mappings` | FilterMapping[] | The blocks this filter applies to. Blocks not listed are not affected. |

### FilterMapping

| Field | Type | Notes |
|---|---|---|
| `blockId` | string | Must be on this page and have a data source. |
| `field` | string | A field of that block's data source, of a matching type (below). |

Matching field types:

| Filter type | Source field types offered |
|---|---|
| `text` | `text` |
| `number` | `number` |
| `date` | `date`, `datetime` |
| `select` | `text`, `number` |
| `boolean` | `boolean` |

- Mappings to a field that no longer exists are kept but stop applying; page edit mode marks them as broken (computed, not stored).
- Mappings to a block removed from the page are removed with it.

### Filter operators
Operators the viewer can pick per filter type, the stored value, and the Condition each becomes for a mapped block.

| Filter type | `op` (saved filter) | `value` | Becomes Condition |
|---|---|---|---|
| `text` | `contains` / `not contains` | string | same op |
| `number` | `between` | `[from, to]`, either may be `null` | `between`; `>=` / `<=` if one end is `null` |
| `date` | `between` | `[from, to]` (either may be `null`) or `{ dynamic }` | as number; a dynamic range resolves to `[from, to]` |
| `select` | `is` / `is not` | array of option values (one item for single select) | `in` / `not in` |
| `boolean` | `is` | `true` / `false` | `=` |

Example:

```js
{
  id: "pg_1",
  name: "Sales overview",
  description: "Open orders and purchasing",
  visibility: "public",
  owner: "u_7", ownerName: "Asha", isMine: false,
  modified: "2026-10-02T12:00:00Z", modifiedBy: "Asha",
  canEdit: true, canDelete: false,

  layout: [
    { blockId: "blk_42", x: 0, y: 0, w: 12, h: 4 },                // a table
    { tabGroupId: "tg_1", x: 0, y: 4, w: 12, h: 6, tabs: [          // 2 tabs
      { id: "t_orders", name: "Orders", blocks: [
        { blockId: "blk_50", x: 0, y: 0, w: 6, h: 4 },
        { blockId: "blk_51", x: 6, y: 0, w: 6, h: 4 }
      ]},
      { id: "t_lines", name: "Lines", blocks: [
        { blockId: "blk_61", x: 0, y: 0, w: 12, h: 6 }
      ]}
    ]},
    { blockId: "blk_70", x: 0, y: 10, w: 12, h: 4 },               // a chart
    { tabGroupId: "tg_2", x: 0, y: 14, w: 12, h: 6, tabs: [         // 3 tabs
      { id: "t_q1", name: "Q1", blocks: [{ blockId: "blk_81", x: 0, y: 0, w: 12, h: 4 }] },
      { id: "t_q2", name: "Q2", blocks: [{ blockId: "blk_82", x: 0, y: 0, w: 12, h: 4 }] },
      { id: "t_q3", name: "Q3", blocks: [{ blockId: "blk_83", x: 0, y: 0, w: 12, h: 4 }] }
    ]}
  ],

  filters: [
    { id: "f_customer", label: "Customer", type: "select", multiple: true, optionsFrom: "mapped",
      mappings: [{ blockId: "blk_42", field: "customer" }] },
    { id: "f_item", label: "Item", type: "select", multiple: true, optionsFrom: "mapped",
      mappings: [{ blockId: "blk_42", field: "item" }, { blockId: "blk_61", field: "item_code" }] },   // blk_61 is inside a tab
    { id: "f_due", label: "Due", type: "date",
      mappings: [{ blockId: "blk_42", field: "delivery_date" }] }
  ]
}
```

## Data provider
The only way the package talks to the backend. Every method is async (returns a Promise), even in the LocalStorage provider.
Lists only contain what the current user may see; the package never filters by user.

### Current user

| Method | Returns |
|---|---|
| `getCurrentUser()` | User. Called once at start. Required. |

```js
{
  id: "u_8", name: "Ravi",
  locale: "en-CA", timezone: "America/Toronto",   // optional, fall back to the browser's
  permissions: {
    pages:        { canCreate: true, canPublish: false },
    blocks:       { canCreate: true, canPublish: false },
    savedViews:   { canCreate: true, canPublish: true },
    savedFilters: { canCreate: true, canPublish: true }
  },
  attributes: { defaultCompany: "MEC-CA" }        // free-form, host-defined (used by dynamic values)
}
```

### Items (pages, blocks, saved views, saved filters)
Same pattern for each item type.

| Method | Notes |
|---|---|
| `listPages()` | |
| `getPage(id)` | |
| `createPage(data)` | `data` without the backend-set fields (`id`, `owner`, `isMine`, `modified`, …). Returns the created item. |
| `updatePage(item)` | `item.modified` must be the value as loaded; if it differs on the backend, throws a conflict error (see Errors). Returns the saved item. |
| `deletePage(id)` | |
| `setFavourite(pageId, isFavourite)` | |
| `listBlocks()`, `getBlocks(ids)` | `getBlocks` loads several at once (all blocks of a page). Missing ids are left out (→ "not available" placeholder). |
| `createBlock(data)`, `updateBlock(item)`, `deleteBlock(id)` | |
| `getBlockUsage(id)` | `{ pageCount }` |
| `listSavedViews(blockId)` | |
| `createSavedView(data)`, `updateSavedView(item)`, `deleteSavedView(id)` | |
| `setPublicDefaultView(blockId, viewId \| null)` | Needs `savedViews.canPublish`. |
| `setMyDefaultView(blockId, viewId \| null)` | |
| `listSavedFilters(pageId)` | |
| `createSavedFilter(data)`, `updateSavedFilter(item)`, `deleteSavedFilter(id)` | |
| `setPublicDefaultFilter(pageId, filterId \| null)` | Needs `savedFilters.canPublish`. |
| `setMyDefaultFilter(pageId, filterId \| null)` | |

There is no duplicate method: the package duplicates pages and blocks with the create calls above (overall.md 8).

### Version history (pages and blocks)

| Method | Notes |
|---|---|
| `listVersions(kind, id)` | `kind`: `"page"` \| `"block"`. Returns `[{ versionId, modified, modifiedBy }]`, newest first. |
| `getVersion(kind, id, versionId)` | The item as it was at that version (for viewing). |
| `restoreVersion(kind, id, versionId)` | Creates a new version from the old one. Returns the saved item. |

### Data sources

| Method | Notes |
|---|---|
| `listSources()` | `[{ id, label }]`, only sources the user may use. |
| `getSourceFields(sourceId)` | `[{ name, label, type }]`. `type`: `"text"` \| `"number"` \| `"date"` \| `"datetime"` \| `"boolean"`. |

### Data

| Method | Notes |
|---|---|
| `getData(request, { signal })` | Returns `{ rows, total? }`. `total` = row count before paging (needed for remote paging). Every row includes `id` (the record's id in its source, used for click-through), except rows of a `groupBy` request (aggregates have no single record). |
| `getDistinctValues(request, { signal })` | Returns `[{ value, label }]`. For Select filter options. |

The provider must understand every request, so requests use a fixed vocabulary (not widget-defined):

```js
// getData
{
  source: "sales_orders",
  conditions: [ /* Condition[]: fixed conditions + translated page filters, dynamic values already resolved */ ],
  fields: ["customer", "amount", "delivery_date"],     // omit = all fields
  sort: [{ field: "amount", dir: "desc" }],
  offset: 0, limit: 50,                                 // paging
  groupBy: ["customer"],                                // aggregation (Chart, KPI)
  aggregates: [{ field: "amount", fn: "sum", as: "total" }]   // fn: count | sum | avg | min | max
}

// getDistinctValues
{ source: "sales_orders", field: "customer", conditions: [ … ], search: "ac", limit: 50 }
```

- Each widget builds its request from these keys only (Table: fields, sort, offset/limit; Chart: groupBy, aggregates; …).
- `signal` is an AbortSignal: when a newer request for the same block starts, the package aborts the older one.

### Errors
Methods throw an error with a `code`:

| `code` | When | Extra |
|---|---|---|
| `"conflict"` | Update of an item changed by someone else since it was loaded. | `modified`, `modifiedBy` |
| `"not_found"` | Item deleted (or no longer visible). | |
| `"forbidden"` | Action not allowed. | |
| anything else | Network/server errors. | `message` |

## Widget
Built-in and custom widgets follow the same contract. The host registers a custom one with `registerWidget(definition)`.

### Definition

```js
{
  type: "table",                       // stored in block.widgetType
  label: "Table",                      // shown in the create-block form (translatable)
  icon: "table",
  savedViews: true,                    // supports saved views
  formattingTargets: ["cell", "row"],  // what rules can style; [] = no conditional formatting
  exports: ["data"],                   // what the Export menu offers (see Export); [] = no export
  actions: [],                         // extra widget-specific block actions (optional), e.g. [{ id: "expand_all", label: "Expand all" }]

  component: TableWidget,              // renders the block (see Component)
  configForm: TableConfigForm,         // widget part of the create-block form (see Config form)
  viewSettings: TableViewSettings,     // widget's section of the block's side panel (see View settings); required if savedViews
  defaultConfig: (fields) => ({ … }),  // widgetConfig for a new block; fields = source fields, or [] without a source
}
```

### Component
Rendered inside the block. It never calls the data provider; it asks the package through `fetchData`.

Props:

| Prop | Type | Notes |
|---|---|---|
| `config` | object | The block's `widgetConfig`. |
| `formatting` | Rule[] | The block's rules followed by the current view's rules (empty if none). Later rules win when they style the same thing. |
| `fields` | Field[] | The source's fields (`[]` without a source). |
| `fetchData` | `(query) => Promise<{ rows, total? }>` | `undefined` without a source. `query` uses only the widget keys (`fields, sort, offset, limit, groupBy, aggregates`); the package adds source + conditions, resolves dynamic values, aborts older requests, and tracks loading/error/empty. |
| `reloadKey` | number | Changes when the widget must fetch again (filters applied, Refresh clicked). |
| `state` | object \| null | View state to show (the saved view, plus unsaved side-panel changes). `null` = the widget's built-in default, derived from `config`. Read-only for the component. |

Events:

| Event | Payload | Notes |
|---|---|---|
| `open-record` | `{ id }` | Click-through; the package adds `source` and re-emits to the host. |

Exposed:

| Method | Notes |
|---|---|
| `runAction(id)` | Runs one of the widget's own actions. |
| `getExportData()` | Required if `exports` includes `"data"`. See Export. |

Rules for every widget:
- Changes the user makes directly in the widget (e.g. sorting or resizing table columns) are temporary: the widget keeps them itself, never emits them as view state, and drops them when `state` changes.
- Ignore anything that refers to a missing field (in `config`, `state`, `formatting`); never throw because of it.
- Loading, error and empty states are shown by the package (block), not the widget.
- Fit the block's size and follow resizes (grid resize, fullscreen).
- Style only with the package's CSS variables.

### View settings
The widget's section of the block's side panel (gear), between the Views and Formatting sections. It edits the view state; changes apply live to the block and mark the view as unsaved.

| Prop / event | Notes |
|---|---|
| `v-model:state` | The current view state (never `null` here: the package passes the built-in default instead). |
| `config` | The block's `widgetConfig`. |
| `fields` | The source's fields. |

The widget also exports `defaultState(config, fields)` so the package can give the panel the built-in default.

### Config form
The widget part of the create-block form. The package renders the shared part (name, description, visibility, source, fixed conditions, conditional formatting rules) and the live preview (the package caps `limit` in the preview's `fetchData` calls, e.g. 10 rows).

| Prop / event | Notes |
|---|---|
| `v-model` | The `widgetConfig` being edited. |
| `fields` | The chosen source's fields (`[]` without a source); updates when the source changes. |

### Rule (conditional formatting)
Format owned by the package; the shared rule editor produces it.

```js
{ when: [{ field: "amount", op: ">", value: 10000 }], style: "danger", target: "cell", field: "amount" }
```

- `when`: Condition[] (AND), evaluated per row by the package helper `matchRule(rule, row)`.
- `style`: `"danger"` \| `"warning"` \| `"success"` \| `"muted"` (theme CSS variables).
- `target`: one of the widget's `formattingTargets`. `field`: the styled field, where the target needs one (e.g. Table cell).
- Rules live in `block.formatting` (builder, everyone) and `savedView.formatting` (that view only). The widget doesn't know which is which.

## Export
Owned by the package, not by widgets. Widgets describe **what** to export; the package's export module does **how** (file format, formatting, file name, row limit, translations).

- Every block whose widget declares `exports` gets the same **Export** menu.
- Export kinds a widget can declare:
  - `"data"`: rows and columns (Table, Gantt, Chart's underlying data, …).
  - `"image"`: later (e.g. Chart as PNG; widget exposes `getExportImage() → Promise<Blob>`).

`getExportData()` returns:

```js
{
  columns: [{ field: "amount", label: "Amount", format: "currency", decimals: 2 }],   // in export order
  query: { fields: ["customer", "amount"], sort: [{ field: "amount", dir: "desc" }] } // widget keys; no offset/limit
}
```

- The package fetches all matching rows through the same path as `fetchData` (source, fixed conditions and applied page filters added), in batches, up to a limit (e.g. 10,000 rows). If the limit is hit, the file is cut off and the user is told.
- File name: block name + date (e.g. `Open sales orders 2026-10-02.csv`).

Formats:
- v1: **CSV**, raw values (numbers and ISO dates, not formatted), column labels as headers, UTF-8.
- Later: formatted CSV option, XLSX (raw values with Excel display formats; library loaded only when used), PDF per block, image export.
