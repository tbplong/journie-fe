/** Rows to CSV text; every cell is quoted so commas, quotes and line breaks in names stay inside their cell. */
export function toCsv(columns: string[], rows: (string | number | undefined | null)[][]) {
  const cell = (value: string | number | undefined | null) => `"${String(value ?? '').replace(/"/g, '""')}"`
  return [columns.map(cell).join(','), ...rows.map((row) => row.map(cell).join(','))].join('\r\n')
}

/** Saves a file from the browser. The BOM lets Excel open Vietnamese text in a CSV correctly. */
export function downloadFile(name: string, content: string | Blob, type = 'text/csv;charset=utf-8') {
  const blob = typeof content === 'string' ? new Blob(['﻿', content], { type }) : content
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
