'use client';

import { useCallback, useState } from 'react';
import { Customer, MasterListConfig, Strings } from '@/types';
import { parseFile, getHeaders, extractCustomers } from '@/lib/parseExcel';
import { saveMasterList, clearMasterList } from '@/lib/storage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadCloud, CheckCircle2, Trash2, Loader2 } from 'lucide-react';

interface Props {
  s: Strings;
  cachedConfig: MasterListConfig | null;
  cachedCount: number;
  onListReady: (customers: Customer[], config: MasterListConfig) => void;
  onListCleared: () => void;
}

export default function FileUpload({
  s,
  cachedConfig,
  cachedCount,
  onListReady,
  onListCleared,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [sheets, setSheets] = useState<Record<string, Record<string, string>[]>>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [nameCol, setNameCol] = useState('');
  const [addressCol, setAddressCol] = useState('');
  const [fileName, setFileName] = useState('');

  async function processFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const workbook = await parseFile(file);
      setSheetNames(workbook.sheetNames);
      setSheets(workbook.sheets);
      setFileName(file.name);
      const firstSheet = workbook.sheetNames[0];
      setSelectedSheet(firstSheet);
      const hdrs = getHeaders(workbook.sheets[firstSheet] ?? []);
      setHeaders(hdrs);
      setNameCol('');
      setAddressCol('');
    } catch {
      setError('Could not read file. Please use .xlsx, .xls, or .csv.');
    } finally {
      setLoading(false);
    }
  }

  function onSheetChange(sheet: string | null) {
    if (!sheet) return;
    setSelectedSheet(sheet);
    setHeaders(getHeaders(sheets[sheet] ?? []));
    setNameCol('');
    setAddressCol('');
  }

  function handleSave() {
    if (!nameCol || !addressCol) return;
    const customers = extractCustomers(sheets[selectedSheet] ?? [], nameCol, addressCol);
    const config: MasterListConfig = { nameColumn: nameCol, addressColumn: addressCol, sheetName: selectedSheet, fileName };
    saveMasterList(customers, config);
    onListReady(customers, config);
    setSheetNames([]);
    setHeaders([]);
  }

  function handleClear() {
    clearMasterList();
    setSheetNames([]);
    setHeaders([]);
    setNameCol('');
    setAddressCol('');
    onListCleared();
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const isMappingReady = headers.length > 0;
  const canSave = nameCol && addressCol;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{s.uploadTitle}</h2>
        {cachedConfig && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {s.listCached} · {cachedCount} {s.rowCount} · {cachedConfig.fileName}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 gap-1 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              {s.clearList}
            </Button>
          </div>
        )}
      </div>

      {!isMappingReady && (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={onInputChange} />
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">{s.uploadSubtitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.uploadHint}</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </label>
      )}

      {isMappingReady && (
        <div className="mt-2 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">{s.mapColumns} — {fileName}</p>

          {sheetNames.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{s.selectSheet}</label>
              <Select value={selectedSheet} onValueChange={onSheetChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sheetNames.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{s.nameColumn}</label>
              <Select value={nameCol} onValueChange={(v) => v && setNameCol(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="— select —" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{s.addressColumn}</label>
              <Select value={addressCol} onValueChange={(v) => v && setAddressCol(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="— select —" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!canSave} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {s.saveList}
            </Button>
            <Button variant="ghost" onClick={() => { setSheetNames([]); setHeaders([]); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
