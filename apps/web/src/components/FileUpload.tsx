'use client';

import { useCallback, useRef, useState } from 'react';
import type { Customer } from '@spoke/shared';
import type { ImportConfig, Settings, Strings } from '@/types';
import { importCsv, CSV_COLUMNS } from '@/lib/importCsv';
import { saveMasterList, clearMasterList, saveSettings } from '@/lib/storage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Trash2, Loader2, UploadCloud, Info } from 'lucide-react';

interface Props {
  s: Strings;
  customers: Customer[];
  importConfig: ImportConfig | null;
  settings: Settings;
  onFileReady: (customers: Customer[], config: ImportConfig) => void;
  onCleared: () => void;
  onSettingsChange: (patch: Partial<Settings>) => void;
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="mt-5 mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
      {title}
    </p>
  );
}

export default function FileUpload({
  s,
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
      saveMasterList(parsed, config);
      onFileReady(parsed, config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file.');
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    clearMasterList();
    onCleared();
  }

  function handleSettingsPatch(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    saveSettings(next);
    onSettingsChange(patch);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const locationsLabel = importConfig
    ? s.locationsLoaded.replace('{n}', String(importConfig.count.toLocaleString()))
    : s.noFileLoaded;

  const lastUpdatedFormatted = importConfig
    ? new Date(importConfig.lastUpdated).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const previewRows = customers.slice(0, 5);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* ── Header ── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{s.locationsTitle}</h2>
        {importConfig ? (
          <Badge variant="secondary" className="gap-1 text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {locationsLabel}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            {locationsLabel}
          </Badge>
        )}
      </div>

      {/* ── CSV info callout ── */}
      <div className="mb-4 flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{s.csvCallout}</span>
      </div>

      {/* ── File loaded state ── */}
      {importConfig ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {s.lastUpdated}{' '}
              <span className="font-medium text-foreground">{lastUpdatedFormatted}</span>
              {' · '}
              <span className="font-medium text-foreground">{importConfig.fileName}</span>
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="h-3.5 w-3.5" />
                )}
                {s.updateFile}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={handleClear}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {s.clearDatabase}
              </Button>
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
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

          {/* Preview table */}
          {previewRows.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">{s.previewCompanyName}</th>
                    <th className="px-3 py-2 text-left font-medium">{s.previewAddress}</th>
                    <th className="px-3 py-2 text-left font-medium">{s.previewCity}</th>
                    <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">{s.previewNotes}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.addressLine1 || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.city || '—'}</td>
                      <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                        {c.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length > 5 && (
                <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                  + {(customers.length - 5).toLocaleString()} more
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        /* ── Drop zone ── */
        <>
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
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
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">{s.uploadHint}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Expected columns: {CSV_COLUMNS.join(', ')}
          </p>
        </>
      )}

      {/* ── Matching settings ── */}
      <SectionHeader title={s.matchingSection} />
      <div className="divide-y divide-border rounded-lg border border-border">
        <SettingsRow label={s.matchSensitivityLabel}>
          <Select
            value={settings.matchSensitivity}
            onValueChange={(v) =>
              handleSettingsPatch({ matchSensitivity: v as Settings['matchSensitivity'] })
            }
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strict" className="text-xs">{s.sensStrict}</SelectItem>
              <SelectItem value="normal" className="text-xs">{s.sensNormal}</SelectItem>
              <SelectItem value="loose" className="text-xs">{s.sensLoose}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label={s.stripSuffixesLabel}>
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={settings.stripCompanySuffixes}
            onChange={(e) => handleSettingsPatch({ stripCompanySuffixes: e.target.checked })}
          />
        </SettingsRow>
      </div>

      {/* ── Export settings ── */}
      <SectionHeader title={s.exportSection} />
      <div className="divide-y divide-border rounded-lg border border-border">
        <SettingsRow label={s.includeAllColumnsLabel}>
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={settings.includeAllColumns}
            onChange={(e) => handleSettingsPatch({ includeAllColumns: e.target.checked })}
          />
        </SettingsRow>
      </div>
    </section>
  );
}
