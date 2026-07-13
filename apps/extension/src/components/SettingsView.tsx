import { useCallback, useRef, useState } from 'react';
import { UploadCloud, Loader2, Info, Trash2, CheckCircle2 } from 'lucide-react';
import type { Customer } from '@spoke/shared';
import type { ImportConfig, Settings } from '../types';
import { importCsv, CSV_COLUMNS } from '../importCsv';
import { saveMasterList, clearMasterList, saveSettings } from '../storage';

interface Props {
  customers: Customer[];
  importConfig: ImportConfig | null;
  settings: Settings;
  onFileReady: (customers: Customer[], config: ImportConfig) => void;
  onCleared: () => void;
  onSettingsChange: (patch: Partial<Settings>) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="text-xs text-gray-500">{label}</span>
      {children}
    </div>
  );
}

export default function SettingsView({
  customers,
  importConfig,
  settings,
  onFileReady,
  onCleared,
  onSettingsChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function processFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const parsed = await importCsv(file);
      const config: ImportConfig = {
        fileName: file.name,
        lastUpdated: new Date().toISOString(),
        count: parsed.length,
      };
      await saveMasterList(parsed, config);
      onFileReady(parsed, config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file.');
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    await clearMasterList();
    onCleared();
  }

  async function patch(p: Partial<Settings>) {
    const next = { ...settings, ...p };
    await saveSettings(next);
    onSettingsChange(p);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const previewRows = customers.slice(0, 3);

  return (
    <div className="space-y-4 p-3">
      {/* CSV info callout */}
      <div className="flex gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Expected columns: {CSV_COLUMNS.join(', ')}</span>
      </div>

      {/* File section */}
      {importConfig ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span className="font-medium text-green-700">
                {importConfig.count.toLocaleString()} locations
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">
                {new Date(importConfig.lastUpdated).toLocaleDateString()}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <UploadCloud className="h-3 w-3" />
                )}
                Update
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 rounded border border-red-100 bg-white px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
              e.target.value = '';
            }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Preview table */}
          {previewRows.length > 0 && (
            <div className="overflow-hidden rounded border border-gray-100 text-xs">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    <th className="px-2 py-1">Company</th>
                    <th className="px-2 py-1">City</th>
                    <th className="px-2 py-1">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-2 py-1 font-medium">{c.name}</td>
                      <td className="px-2 py-1 text-gray-500">{c.city || '—'}</td>
                      <td className="px-2 py-1 text-gray-500">{c.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length > 3 && (
                <p className="border-t border-gray-100 py-1 text-center text-[10px] text-gray-400">
                  + {(customers.length - 3).toLocaleString()} more
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragging ? 'border-[#1D9E75] bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          ) : (
            <UploadCloud className="h-6 w-6 text-gray-400" />
          )}
          <p className="text-xs text-gray-500">Drop a Spoke/Circuit .csv or click to browse</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </label>
      )}

      {/* Matching settings */}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Matching
        </p>
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100">
          <Row label="Match sensitivity">
            <select
              value={settings.matchSensitivity}
              onChange={(e) => patch({ matchSensitivity: e.target.value as Settings['matchSensitivity'] })}
              className="rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none"
            >
              <option value="strict">Strict</option>
              <option value="normal">Normal</option>
              <option value="loose">Loose</option>
            </select>
          </Row>
          <Row label="Strip SRL, SA, S.C. from names">
            <input
              type="checkbox"
              checked={settings.stripCompanySuffixes}
              onChange={(e) => patch({ stripCompanySuffixes: e.target.checked })}
              className="h-3.5 w-3.5 accent-[#1D9E75]"
            />
          </Row>
        </div>
      </div>

      {/* Export settings */}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Export
        </p>
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <Row label="Include all columns">
            <input
              type="checkbox"
              checked={settings.includeAllColumns}
              onChange={(e) => patch({ includeAllColumns: e.target.checked })}
              className="h-3.5 w-3.5 accent-[#1D9E75]"
            />
          </Row>
        </div>
      </div>
    </div>
  );
}
