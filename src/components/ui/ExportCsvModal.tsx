import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';
import Modal from './Modal';
import { CsvField, exportToCsv } from '../../lib/csvExport';

interface ExportCsvModalProps<T> {
  open: boolean;
  onClose: () => void;
  /** Filename without extension — .csv is appended automatically. */
  filename: string;
  /** The rows to export (already filtered/searched — export respects whatever the page is currently showing). */
  rows: T[];
  /** Every field the user could choose to include, in display order. */
  fields: CsvField<T>[];
  /** Field keys checked by default when the modal first opens. Defaults to all fields. */
  defaultSelected?: string[];
}

// Asks which columns to include before exporting — shared by Leads and
// Pipeline (and anywhere else that wants a CSV export with a field
// picker instead of always dumping every column).
export default function ExportCsvModal<T>({
  open, onClose, filename, rows, fields, defaultSelected,
}: ExportCsvModalProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelected ?? fields.map((f) => f.key))
  );

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allSelected = selected.size === fields.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(fields.map((f) => f.key)));

  const handleExport = () => {
    const chosenFields = fields.filter((f) => selected.has(f.key));
    if (chosenFields.length === 0) return;
    exportToCsv(filename, rows, chosenFields);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Export to CSV" subtitle={`${rows.length} row${rows.length === 1 ? '' : 's'} will be exported — choose which columns to include.`} maxWidth="max-w-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Columns</span>
          <button onClick={toggleAll} className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer">
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
          {fields.map((f) => {
            const checked = selected.has(f.key);
            return (
              <label
                key={f.key}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <span
                  className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                    checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                  }`}
                >
                  {checked && <Check className="h-3 w-3 text-white" />}
                </span>
                <input type="checkbox" checked={checked} onChange={() => toggle(f.key)} className="sr-only" />
                <span className="text-sm text-slate-700">{f.label}</span>
              </label>
            );
          })}
        </div>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleExport}
            disabled={selected.size === 0 || rows.length === 0}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-all cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4" /> Export {selected.size} Column{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
