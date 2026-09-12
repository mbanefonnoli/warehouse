import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, Loader2, Info, Trash2, CheckCircle2, Plus, X, Pencil, Check, Lock } from 'lucide-react';
import type { Customer } from '@spoke/shared';
import type { CustomZone, ImportConfig, License, Settings } from '../types';
import { importCsv, CSV_COLUMNS } from '../importCsv';
import { saveMasterList, clearMasterList, saveSettings, loadCustomZones, saveCustomZones, loadAvailableCities, saveAvailableCities } from '../storage';
import { normCity } from '../zones';
import { track } from '../analytics';
import LicenseSection from './LicenseSection';

interface Props {
  customers: Customer[];
  importConfig: ImportConfig | null;
  settings: Settings;
  license: License | null;
  onFileReady: (customers: Customer[], config: ImportConfig) => void;
  onCleared: () => void;
  onSettingsChange: (patch: Partial<Settings>) => void;
  onLicenseChange: (license: License | null) => void;
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div>
        <span className="text-xs text-gray-500">{label}</span>
        {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

type Draft = { mode: 'add' | 'edit'; id?: string; name: string; cities: string[] };

function ZonesSection() {
  const [zones, setZones] = useState<CustomZone[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [cityInput, setCityInput] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([loadCustomZones(), loadAvailableCities()]).then(([z, c]) => {
      setZones(z);
      setAvailableCities(c);
    });
  }, []);

  async function persistZones(updated: CustomZone[]) {
    await saveCustomZones(updated);
    setZones(updated);
  }

  // Cities already assigned to zones other than the one being edited
  const usedElsewhere = new Set(
    zones
      .filter((z) => z.id !== draft?.id)
      .flatMap((z) => z.cities.map((c) => normCity(c))),
  );
  const draftCitySet = new Set(draft?.cities.map((c) => normCity(c)) ?? []);
  const selectableCities = availableCities.filter(
    (c) => !usedElsewhere.has(normCity(c)) && !draftCitySet.has(normCity(c)),
  );

  function addCityToDraft() {
    const city = cityInput.trim();
    if (!city || !draft) return;
    if (draftCitySet.has(normCity(city))) { setCityInput(''); return; }
    setDraft({ ...draft, cities: [...draft.cities, city] });
    setCityInput('');
    cityInputRef.current?.focus();
  }

  async function saveDraft() {
    if (!draft || !draft.name.trim()) return;
    if (draft.mode === 'add') {
      const newZone: CustomZone = { id: `zone_${Date.now()}`, name: draft.name.trim(), cities: draft.cities };
      await persistZones([...zones, newZone]);
    } else {
      await persistZones(zones.map((z) => (z.id === draft.id ? { ...z, name: draft.name.trim(), cities: draft.cities } : z)));
    }
    setDraft(null);
    setCityInput('');
  }

  async function removeCityFromZone(zoneId: string, city: string) {
    await persistZones(zones.map((z) => (z.id === zoneId ? { ...z, cities: z.cities.filter((c) => c !== city) } : z)));
  }

  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        Custom delivery zones
      </p>
      <p className="mb-2 text-[10px] text-gray-400">
        Group cities into zones. Stops are auto-sorted on match. Cities not assigned appear under their own name.
      </p>

      <div className="space-y-2">
        {zones.map((zone) => (
          <div key={zone.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-gray-700">{zone.name}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => { setDraft({ mode: 'edit', id: zone.id, name: zone.name, cities: [...zone.cities] }); setCityInput(''); }}
                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-gray-200"
                >
                  <Pencil className="h-2.5 w-2.5" /> Edit
                </button>
                {deleteConfirmId === zone.id ? (
                  <>
                    <button
                      onClick={() => persistZones(zones.filter((z) => z.id !== zone.id)).then(() => setDeleteConfirmId(null))}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-red-500 hover:bg-red-50"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(zone.id)}
                    className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-50"
                  >
                    <Trash2 className="h-2.5 w-2.5" /> Delete
                  </button>
                )}
              </div>
            </div>
            {/* City pills */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {zone.cities.length === 0 && (
                <span className="text-[10px] text-gray-400 italic">No cities assigned</span>
              )}
              {zone.cities.map((city) => (
                <span key={city} className="flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[10px] text-gray-600">
                  {city}
                  <button onClick={() => removeCityFromZone(zone.id, city)} className="text-gray-300 hover:text-red-400">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>

            {/* Inline edit form */}
            {draft?.id === zone.id && (
              <div className="mt-2 space-y-1.5 border-t border-gray-200 pt-2">
                <input
                  className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                  placeholder="Zone name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
                <div className="flex gap-1">
                  <input
                    ref={cityInputRef}
                    list="city-options"
                    className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                    placeholder="Add city…"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCityToDraft(); } }}
                  />
                  <datalist id="city-options">
                    {selectableCities.map((c) => <option key={c} value={c} />)}
                  </datalist>
                  <button
                    onClick={addCityToDraft}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50"
                  >
                    Add
                  </button>
                </div>
                {draft.cities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {draft.cities.map((city) => (
                      <span key={city} className="flex items-center gap-1 rounded-full bg-[#1D9E75]/10 px-2 py-0.5 text-[10px] text-[#1D9E75]">
                        {city}
                        <button onClick={() => setDraft({ ...draft, cities: draft.cities.filter((c) => c !== city) })} className="hover:text-red-400">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-1">
                  <button onClick={saveDraft} className="flex items-center gap-1 rounded bg-[#1D9E75] px-2 py-1 text-[10px] font-medium text-white hover:opacity-90">
                    <Check className="h-2.5 w-2.5" /> Save
                  </button>
                  <button onClick={() => { setDraft(null); setCityInput(''); }} className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add new zone form */}
        {draft?.mode === 'add' ? (
          <div className="rounded-lg border border-[#1D9E75]/30 bg-emerald-50 p-2 space-y-1.5">
            <input
              autoFocus
              className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
              placeholder="Zone name (e.g. Mamaia route)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <div className="flex gap-1">
              <input
                ref={cityInputRef}
                list="city-options-add"
                className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                placeholder="Add city…"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCityToDraft(); } }}
              />
              <datalist id="city-options-add">
                {selectableCities.map((c) => <option key={c} value={c} />)}
              </datalist>
              <button onClick={addCityToDraft} className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">
                Add
              </button>
            </div>
            {draft.cities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {draft.cities.map((city) => (
                  <span key={city} className="flex items-center gap-1 rounded-full bg-[#1D9E75]/10 px-2 py-0.5 text-[10px] text-[#1D9E75]">
                    {city}
                    <button onClick={() => setDraft({ ...draft, cities: draft.cities.filter((c) => c !== city) })} className="hover:text-red-400">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <button onClick={saveDraft} disabled={!draft.name.trim()} className="flex items-center gap-1 rounded bg-[#1D9E75] px-2 py-1 text-[10px] font-medium text-white hover:opacity-90 disabled:opacity-40">
                <Check className="h-2.5 w-2.5" /> Save zone
              </button>
              <button onClick={() => { setDraft(null); setCityInput(''); }} className="rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setDraft({ mode: 'add', name: '', cities: [] }); setCityInput(''); }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 py-2 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500"
          >
            <Plus className="h-3.5 w-3.5" /> Add new zone
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsView({
  customers,
  importConfig,
  settings,
  license,
  onFileReady,
  onCleared,
  onSettingsChange,
  onLicenseChange,
}: Props) {
  const isPro = license?.status === 'active';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [pendingXlsx, setPendingXlsx] = useState<{ file: File; sheets: string[] } | null>(null);

  async function finishImport(parsed: Customer[], fileName: string) {
    const config: ImportConfig = {
      fileName,
      lastUpdated: new Date().toISOString(),
      count: parsed.length,
    };
    await saveMasterList(parsed, config);

    // Extract unique non-empty cities for zone configuration — dedupe
    // case/diacritics-insensitively so "Constanta" and "CONSTANȚA" collapse
    // into a single selectable entry, keeping the first-seen spelling.
    const seen = new Map<string, string>();
    for (const c of parsed) {
      const raw = c.city?.trim();
      if (!raw) continue;
      const key = normCity(raw);
      if (!seen.has(key)) seen.set(key, raw);
    }
    const cities = [...seen.values()].sort();
    await saveAvailableCities(cities);

    track('database_uploaded', { location_count: parsed.length });
    onFileReady(parsed, config);
  }

  async function processFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      if (/\.xlsx?$/i.test(file.name)) {
        const { listXlsxSheets, importXlsx } = await import('../importXlsx');
        const sheets = await listXlsxSheets(file);
        if (sheets.length > 1) {
          setPendingXlsx({ file, sheets });
          setLoading(false);
          return;
        }
        const parsed = await importXlsx(file, sheets[0]);
        await finishImport(parsed, file.name);
      } else {
        const parsed = await importCsv(file);
        await finishImport(parsed, file.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file.');
    } finally {
      setLoading(false);
    }
  }

  async function chooseXlsxSheet(sheetName: string) {
    if (!pendingXlsx) return;
    const { file } = pendingXlsx;
    setLoading(true);
    setError(null);
    try {
      const { importXlsx } = await import('../importXlsx');
      const parsed = await importXlsx(file, sheetName);
      await finishImport(parsed, file.name);
      setPendingXlsx(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file.');
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    await clearMasterList();
    setConfirmingClear(false);
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

  const previewRows = customers.slice(0, 5);

  return (
    <div className="max-h-[560px] space-y-4 overflow-y-auto p-3">
      {/* License */}
      <LicenseSection license={license} onLicenseChange={onLicenseChange} />

      {/* File format info callout */}
      <div className="flex gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Expected columns: {CSV_COLUMNS.join(', ')}</span>
      </div>

      {/* Multi-sheet picker */}
      {pendingXlsx && (
        <div className="space-y-2 rounded-lg border border-[#1D9E75]/30 bg-emerald-50 p-3">
          <p className="text-xs font-medium text-gray-700">
            "{pendingXlsx.file.name}" has {pendingXlsx.sheets.length} sheets — which one has your locations?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pendingXlsx.sheets.map((sheet) => (
              <button
                key={sheet}
                disabled={loading}
                onClick={() => chooseXlsxSheet(sheet)}
                className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {sheet}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPendingXlsx(null)}
            className="text-[10px] text-gray-400 underline hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* File section */}
      {importConfig ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span className="font-medium text-green-700">{importConfig.count.toLocaleString()} locations</span>
              <span className="text-gray-400">·</span>
              {(() => {
                const gps = customers.filter((c) => c.lat != null && c.lng != null).length;
                return gps === 0
                  ? <span className="font-medium text-red-500">0 with GPS — re-import CSV</span>
                  : <span className="text-gray-500">{gps.toLocaleString()} with GPS</span>;
              })()}
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{new Date(importConfig.lastUpdated).toLocaleDateString()}</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
                Update
              </button>
              {confirmingClear ? (
                <>
                  <button
                    onClick={handleClear}
                    className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    Confirm clear
                  </button>
                  <button
                    onClick={() => setConfirmingClear(false)}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmingClear(true)}
                  className="flex items-center gap-1 rounded border border-red-100 bg-white px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) processFile(file); e.target.value = ''; }}
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
                    <th className="px-2 py-1">Lat</th>
                    <th className="px-2 py-1">Lng</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-2 py-1 font-medium">{c.name}</td>
                      <td className="px-2 py-1 text-gray-500">{c.city || '—'}</td>
                      <td className={`px-2 py-1 ${c.lat != null ? 'text-gray-500' : 'font-medium text-red-400'}`}>
                        {c.lat != null ? c.lat.toFixed(4) : '✗'}
                      </td>
                      <td className={`px-2 py-1 ${c.lng != null ? 'text-gray-500' : 'font-medium text-red-400'}`}>
                        {c.lng != null ? c.lng.toFixed(4) : '✗'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length > 5 && (
                <p className="border-t border-gray-100 py-1 text-center text-[10px] text-gray-400">
                  + {(customers.length - 5).toLocaleString()} more
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
          <input type="file" accept=".csv,.xlsx,.xls" className="sr-only"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) processFile(file); }} />
          {loading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : <UploadCloud className="h-6 w-6 text-gray-400" />}
          <p className="text-xs text-gray-500">Drop a Spoke/Circuit .csv or .xlsx or click to browse</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </label>
      )}

      {/* Custom delivery zones — Pro only */}
      {isPro ? (
        <ZonesSection />
      ) : (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Delivery Zones</p>
          <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 text-xs text-gray-400">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>Pro feature — group cities into named delivery routes.</span>
          </div>
        </div>
      )}

      {/* Matching settings */}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Matching</p>
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
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Export</p>
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100">
          <Row label="CSV separator" hint="Semicolon for European Excel">
            <select
              value={settings.csvDelimiter}
              onChange={(e) => patch({ csvDelimiter: e.target.value as Settings['csvDelimiter'] })}
              className="rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none"
            >
              <option value="comma">Comma (,)</option>
              <option value="semicolon">Semicolon (;)</option>
            </select>
          </Row>
          {isPro && (
            <Row label="Export mode" hint="One file per zone or all zones in a single file">
              <select
                value={settings.exportMode}
                onChange={(e) => patch({ exportMode: e.target.value as Settings['exportMode'] })}
                className="rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none"
              >
                <option value="per-zone">One file per zone</option>
                <option value="combined">Single combined file</option>
              </select>
            </Row>
          )}
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
