// Sample sources and items for the mock provider. Rows are generated from a fixed seed,
// so every reload gives the same data.

function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const customerNames = {
  'CUST-001': 'ACME Ltd',
  'CUST-002': 'Globex',
  'CUST-003': 'Initech',
  'CUST-004': 'Umbrella Corp',
  'CUST-005': 'Stark Industries',
  'CUST-006': 'Wayne Enterprises',
}
const supplierNames = { 'SUP-01': 'Northwind', 'SUP-02': 'Contoso', 'SUP-03': 'Fabrikam' }
const items = ['ITEM-A', 'ITEM-B', 'ITEM-C', 'ITEM-D', 'ITEM-E']
const statuses = ['Draft', 'Open', 'Pending', 'Closed', 'Cancelled']

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function generate(count, seed, makeRow) {
  const random = seededRandom(seed)
  const pick = (list) => list[Math.floor(random() * list.length)]
  // Dates spread around "now", so relative dynamic values (next month, …) find rows.
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - 180)
  const dayFrom = (offset) => {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + offset)
    return d
  }
  return Array.from({ length: count }, (_, i) => makeRow(i, { random, pick, dayFrom }))
}

const salesOrders = generate(250, 42, (i, { random, pick, dayFrom }) => {
  const orderOffset = Math.floor(random() * 300)
  return {
    id: `SO-${String(i + 1).padStart(4, '0')}`,
    customer: pick(Object.keys(customerNames)),
    item: pick(items),
    status: pick(statuses),
    qty: 1 + Math.floor(random() * 50),
    amount: Math.round(random() * 2000000) / 100,
    order_date: isoDate(dayFrom(orderOffset)),
    delivery_date: isoDate(dayFrom(orderOffset + 7 + Math.floor(random() * 60))),
    paid: random() > 0.5,
  }
})

const purchaseOrders = generate(120, 7, (i, { random, pick, dayFrom }) => ({
  id: `PO-${String(i + 1).padStart(4, '0')}`,
  supplier: pick(Object.keys(supplierNames)),
  item_code: pick(items),
  qty: 10 + Math.floor(random() * 200),
  cost: Math.round(random() * 800000) / 100,
  expected_date: isoDate(dayFrom(Math.floor(random() * 330))),
  received: random() > 0.6,
}))

export const sources = [
  {
    id: 'sales_orders',
    label: 'Sales Orders',
    fields: [
      { name: 'id', label: 'Order', type: 'text' },
      { name: 'customer', label: 'Customer', type: 'text', labels: customerNames },
      { name: 'item', label: 'Item', type: 'text' },
      { name: 'status', label: 'Status', type: 'text' },
      { name: 'qty', label: 'Qty', type: 'number' },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'order_date', label: 'Order date', type: 'date' },
      { name: 'delivery_date', label: 'Delivery date', type: 'date' },
      { name: 'paid', label: 'Paid', type: 'boolean' },
    ],
    rows: salesOrders,
  },
  {
    id: 'purchase_orders',
    label: 'Purchase Orders',
    fields: [
      { name: 'id', label: 'PO', type: 'text' },
      { name: 'supplier', label: 'Supplier', type: 'text', labels: supplierNames },
      { name: 'item_code', label: 'Item code', type: 'text' },
      { name: 'qty', label: 'Qty', type: 'number' },
      { name: 'cost', label: 'Cost', type: 'number' },
      { name: 'expected_date', label: 'Expected', type: 'date' },
      { name: 'received', label: 'Received', type: 'boolean' },
    ],
    rows: purchaseOrders,
  },
]

export const users = {
  u_demo: {
    id: 'u_demo',
    name: 'Demo User',
    admin: true,
    permissions: 'all',
  },
  u_asha: { id: 'u_asha', name: 'Asha', admin: false, permissions: 'all' },
  u_viewer: { id: 'u_viewer', name: 'Viewer', admin: false, permissions: 'none' },
}

// Items created on first use (owner/modified are filled in by the provider).
export function seedItems() {
  const col = (field, label, extra = {}) => ({ field, label, ...extra })
  return {
    blocks: [
      {
        id: 'blk_orders',
        owner: 'u_asha',
        name: 'Open sales orders',
        description: 'All sales orders except cancelled ones',
        visibility: 'public',
        widgetType: 'table',
        source: 'sales_orders',
        fixedConditions: [{ field: 'status', op: '!=', value: 'Cancelled' }],
        formatting: [
          { when: [{ field: 'amount', op: '>=', value: 15000 }], style: 'success', target: 'cell', field: 'amount' },
          { when: [{ field: 'status', op: '=', value: 'Draft' }], style: 'muted', target: 'row' },
        ],
        widgetConfig: {
          columns: [
            col('id', 'Order'),
            col('customer', 'Customer'),
            col('item', 'Item'),
            col('status', 'Status'),
            col('qty', 'Qty', { format: 'number', decimals: 0 }),
            col('amount', 'Amount', { format: 'currency', decimals: 2 }),
            col('order_date', 'Order date', { format: 'date' }),
            col('delivery_date', 'Delivery', { format: 'date' }),
            col('paid', 'Paid', { format: 'boolean' }),
          ],
          pageSize: 25,
        },
      },
      {
        id: 'blk_large',
        owner: 'u_demo',
        name: 'Large orders',
        description: 'Orders of 10,000 or more (private)',
        visibility: 'private',
        widgetType: 'table',
        source: 'sales_orders',
        fixedConditions: [{ field: 'amount', op: '>=', value: 10000 }],
        formatting: [],
        widgetConfig: {
          columns: [col('id', 'Order'), col('customer', 'Customer'), col('item', 'Item'), col('amount', 'Amount', { format: 'currency', decimals: 0 })],
          pageSize: 10,
        },
      },
      {
        id: 'blk_po',
        owner: 'u_asha',
        name: 'Purchase orders',
        visibility: 'public',
        widgetType: 'table',
        source: 'purchase_orders',
        fixedConditions: [],
        formatting: [{ when: [{ field: 'received', op: '=', value: false }], style: 'warning', target: 'cell', field: 'expected_date' }],
        widgetConfig: {
          columns: [
            col('id', 'PO'),
            col('supplier', 'Supplier'),
            col('item_code', 'Item'),
            col('qty', 'Qty', { format: 'number', decimals: 0 }),
            col('cost', 'Cost', { format: 'currency', decimals: 2 }),
            col('expected_date', 'Expected', { format: 'date' }),
            col('received', 'Received', { format: 'boolean' }),
          ],
          pageSize: 10,
        },
      },
    ],
    pages: [
      {
        id: 'pg_sales',
        owner: 'u_asha',
        name: 'Sales overview',
        description: 'Open orders and purchasing',
        visibility: 'public',
        layout: [
          { blockId: 'blk_orders', x: 0, y: 0, w: 12, h: 8 },
          {
            tabGroupId: 'tg_1',
            x: 0,
            y: 8,
            w: 12,
            h: 7,
            tabs: [
              { id: 't_purchasing', name: 'Purchasing', blocks: [{ blockId: 'blk_po', x: 0, y: 0, w: 12, h: 6 }] },
              { id: 't_large', name: 'Large orders', blocks: [{ blockId: 'blk_large', x: 0, y: 0, w: 12, h: 6 }] },
            ],
          },
        ],
        filters: [
          {
            id: 'f_customer',
            label: 'Customer',
            type: 'select',
            multiple: true,
            optionsFrom: 'mapped',
            mappings: [{ blockId: 'blk_orders', field: 'customer' }, { blockId: 'blk_large', field: 'customer' }],
          },
          {
            id: 'f_item',
            label: 'Item',
            type: 'select',
            multiple: true,
            optionsFrom: 'mapped',
            mappings: [
              { blockId: 'blk_orders', field: 'item' },
              { blockId: 'blk_large', field: 'item' },
              { blockId: 'blk_po', field: 'item_code' },
            ],
          },
          {
            id: 'f_status',
            label: 'Status',
            type: 'select',
            multiple: true,
            optionsFrom: 'custom',
            customOptions: [
              { value: 'Draft', label: 'Draft' },
              { value: 'Open', label: 'Open' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Closed', label: 'Closed' },
            ],
            mappings: [{ blockId: 'blk_orders', field: 'status' }],
          },
          {
            id: 'f_due',
            label: 'Due',
            type: 'date',
            mappings: [{ blockId: 'blk_orders', field: 'delivery_date' }, { blockId: 'blk_po', field: 'expected_date' }],
          },
          { id: 'f_amount', label: 'Amount', type: 'number', mappings: [{ blockId: 'blk_orders', field: 'amount' }] },
          { id: 'f_paid', label: 'Paid', type: 'boolean', mappings: [{ blockId: 'blk_orders', field: 'paid' }] },
        ],
      },
    ],
    savedViews: [
      {
        id: 'sv_by_customer',
        owner: 'u_asha',
        name: 'By customer',
        visibility: 'public',
        blockId: 'blk_orders',
        state: {
          columns: [
            { field: 'customer' },
            { field: 'id' },
            { field: 'item' },
            { field: 'status' },
            { field: 'amount' },
            { field: 'delivery_date' },
            { field: 'qty', hidden: true },
            { field: 'order_date', hidden: true },
            { field: 'paid', hidden: true },
          ],
          sort: [{ field: 'amount', dir: 'desc' }],
          groupRowsBy: 'customer',
          pageSize: 50,
        },
        formatting: [],
        isPublicDefault: false,
      },
    ],
    savedFilters: [
      {
        id: 'sf_acme_next_month',
        owner: 'u_demo',
        name: 'ACME, due next month',
        visibility: 'private',
        pageId: 'pg_sales',
        values: {
          f_customer: { op: 'is', value: ['CUST-001'] },
          f_due: { op: 'between', value: { dynamic: 'next_month' } },
        },
        isPublicDefault: false,
      },
    ],
  }
}
