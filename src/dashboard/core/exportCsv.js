// Export module (contracts.md → Export). Widgets describe what to export; this does the how.
// v1: CSV with raw values, all matching rows up to a limit, column labels as headers, UTF-8.
import { buildRequest } from '../blocks/useBlockData.js'

const BATCH = 1000

function csvCell(value) {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function download(filename, text) {
  // BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportCsv(ctx, { block, exportData, pageConditions, filterValues }) {
  const limit = ctx.options.exportRowLimit
  const rows = []
  let total = 0
  for (let offset = 0; offset < limit; offset += BATCH) {
    const request = await buildRequest(ctx, { block, pageConditions, filterValues }, { ...exportData.query, offset, limit: Math.min(BATCH, limit - offset) })
    const result = await ctx.provider.getData(request)
    rows.push(...result.rows)
    total = result.total ?? rows.length
    if (result.rows.length < BATCH || rows.length >= total) break
  }

  const header = exportData.columns.map((c) => csvCell(c.label)).join(',')
  const lines = rows.map((row) => exportData.columns.map((c) => csvCell(row[c.field])).join(','))
  const date = new Date().toISOString().slice(0, 10)
  download(`${block.name} ${date}.csv`, [header, ...lines].join('\r\n'))

  return { exported: rows.length, total, cutOff: total > rows.length }
}
