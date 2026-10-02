# Table widget

Built on Tabulator. Follows the widget contract in contracts.md. Settings are split as in overall.md 4 (block config vs saved view).

## Definition
- `type: "table"`, saved views: yes, formatting targets: `cell`, `row`.
- Exports: `["data"]` (see Export in contracts.md). Shown as a Download icon on the widget side of the header.
- Without a data source the table shows nothing (no columns, no rows).

## Block config (`widgetConfig`, set by the builder)
Decides which columns exist and how they look, the same for everyone.

```js
{
  columns: [
    { field: "customer", label: "Customer" },
    { field: "amount", label: "Amount", format: "currency", decimals: 2 },
    { field: "delivery_date", label: "Delivery", format: "date" }
  ],
  pageSize: 50
}
```

| Field | Notes |
|---|---|
| `columns` | In default order. Only fields of the block's source. The table never filters them by user; the provider already only offers fields the user may use. |
| `columns[].label` | Optional; defaults to the source field's label. |
| `columns[].format` | Optional: `text`, `number`, `currency`, `percent`, `date`, `datetime`, `boolean`. Defaults from the field type. `decimals` for number/currency/percent. Dates use the user's locale/timezone. |
| `pageSize` | Default rows per page (e.g. 50). |

- New block (`defaultConfig`): all source fields as columns, in source order.

## View state (`state`, saved view)
How the viewer arranges the configured columns.

```js
{
  columns: [
    { field: "amount" },
    { field: "customer" },
    { field: "delivery_date", hidden: true }
  ],
  sort: [{ field: "amount", dir: "desc" }],
  groupRowsBy: "customer",
  pageSize: 100
}
```

| Field | Notes |
|---|---|
| `columns` | Order = array order. `hidden` optional. Column widths are not saved (automatic; resizing in the table is temporary). |
| `sort` | One or more levels (field + direction), set in the side panel. Remote (sent to the provider). |
| `groupRowsBy` | One field or `null`. Visual grouping of rows (not the data request's `groupBy`, which aggregates). |
| `pageSize` | Overrides the block's default. |

- Default state (no saved view applies): all columns shown, in config order, no sort, no grouping, the block's `pageSize`.
- Applying a state:
  - Fields no longer in `config.columns` are skipped.
  - Columns in `config.columns` but not in the state are **hidden** (the user shows them and updates the view). This differs from Tabulator's default.
- The table's section of the block's side panel (gear; overall.md 4 → Block UI) lists all configured columns: show/hide and drag to reorder, then sort (one or more levels: field + ascending/descending), group by and rows per page. Changes there apply live and mark the view as unsaved; sorting, resizing or moving columns in the table itself is temporary, never marks it, and is never saved into the view (overall.md 8).

## Data
- Remote paging and sorting through `fetchData`:
  `{ fields: <all configured columns>, sort, offset, limit: pageSize }`
- All configured columns are fetched (not only visible ones), so showing a hidden column needs no new request.
- Grouping (`groupRowsBy`) is done by Tabulator on the loaded page; the request never uses `groupBy`. To keep groups together across pages, the group field is sent as the first sort key (before the user's sort). A group can continue on the next page; group header counts are for the current page.

## Conditional formatting
- `target: "cell"` with `field`: styles that cell. `target: "row"`: styles the whole row.
- Rule conditions may use any configured column, including hidden ones (they are fetched anyway).

## Click-through
- Clicking a row emits `open-record { id }` (the row's `id`).

## Export
- `getExportData()` returns the current view: visible columns in their current order (with labels and formats), and the sort currently shown, including temporary sorting done in the table (with the group field first, if grouped): the export matches what the user sees.
- All matching rows are exported, not just the loaded page; fetching, limits and file formats are handled by the package.
