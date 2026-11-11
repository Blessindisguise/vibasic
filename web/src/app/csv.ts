/**
 * Download rows as a CSV file that Excel opens correctly: UTF-8 with BOM (keeps Vietnamese diacritics), comma separators,
 * every text field quoted. Numbers are written plain so Excel can sum them.
 */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][], title?: string[]) {
  const cell = (v: string | number | null | undefined) =>
    v == null ? '' : typeof v === 'number' ? String(v) : `"${v.replace(/"/g, '""')}"`;
  const lines = [...(title ?? []).map(t => cell(t)), ...(title?.length ? [''] : []), header.map(cell).join(','), ...rows.map(r => r.map(cell).join(','))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
