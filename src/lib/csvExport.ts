// Generic client-side CSV export — builds a CSV string from whatever rows
// + field getters the caller passes and triggers a browser download. No
// backend involved; used by ExportCsvModal (the field picker UI) so a
// page just needs to describe its own exportable fields once.

export interface CsvField<T> {
  key: string;
  label: string;
  getValue: (row: T) => string | number | null | undefined;
}

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportToCsv<T>(filename: string, rows: T[], fields: CsvField<T>[]): void {
  const header = fields.map((f) => escapeCsvCell(f.label)).join(',');
  const lines = rows.map((row) =>
    fields.map((f) => escapeCsvCell(String(f.getValue(row) ?? ''))).join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
