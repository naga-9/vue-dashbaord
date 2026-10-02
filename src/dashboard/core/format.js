// Display formatting of values (table cells, filter hints). Exports use raw values.

export const FORMATS = ['text', 'number', 'currency', 'percent', 'date', 'datetime', 'boolean']

export function defaultFormatFor(fieldType) {
  if (fieldType === 'number') return 'number'
  if (fieldType === 'date') return 'date'
  if (fieldType === 'datetime') return 'datetime'
  if (fieldType === 'boolean') return 'boolean'
  return 'text'
}

// options: { format, decimals, currency }, env: { locale, timezone, currency, t }
export function formatValue(value, options, env) {
  if (value === null || value === undefined || value === '') return ''
  const { format = 'text', decimals } = options
  const locale = env.locale
  const digits = decimals ?? undefined

  try {
    switch (format) {
      case 'number':
        return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits ?? 2 }).format(value)
      case 'currency':
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: options.currency || env.currency || 'USD',
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(value)
      case 'percent':
        return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits ?? 1 }).format(value)
      case 'date':
        // Date-only values are not shifted by timezone.
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`))
      case 'datetime':
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: env.timezone }).format(new Date(value))
      case 'boolean':
        return value ? env.t('common.yes') : env.t('common.no')
      default:
        return String(value)
    }
  } catch {
    return String(value)
  }
}

export function formatDateRange([from, to], env) {
  const f = (v) => (v ? formatValue(v, { format: 'date' }, env) : '…')
  return from === to ? f(from) : `${f(from)} – ${f(to)}`
}
