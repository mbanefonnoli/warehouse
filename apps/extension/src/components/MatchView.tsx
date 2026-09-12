import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Search, Copy, Check, Download, ChevronRight, X, Inbox } from 'lucide-react';
import { matchName, sanitizeWhatsAppPaste } from '@spoke/shared';
import type { Customer, MatchResult } from '@spoke/shared';
import type { CustomZone, Settings } from '../types';
import { formatAddress, buildAddressesText, downloadZoneCsv, downloadCombinedCsv } from '../exportCsv';
import { saveMatchSession, loadMatchSession, clearMatchSession, loadPendingNames, clearPendingNames, loadCustomZones } from '../storage';
import { groupByZone } from '../zones';
import type { ZoneGroup } from '../zones';

interface Props {
  customers: Customer[];
  settings: Settings;
  onOpenSettings: () => void;
}

const STATUS = {
  green: { Icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  yellow: { Icon: AlertCircle,  color: 'text-amber-500', bg: 'bg-amber-50' },
  red:    { Icon: XCircle,      color: 'text-red-500',   bg: 'bg-red-50'   },
};

function RedSearch({ customers, onSelect }: { customers: Customer[]; onSelect: (c: Customer) => void }) {
  const [q, setQ] = useState('');
  const hits = q.length > 1
    ? customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="relative mt-1">
      <div className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs">
        <Search className="h-3 w-3 text-gray-400" />
        <input
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400"
          placeholder="Search location..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {hits.length > 0 && (
        <ul className="absolute z-20 mt-0.5 w-full rounded border border-gray-200 bg-white shadow-lg">
          {hits.map((c) => (
            <li key={c.id} className="cursor-pointer px-2 py-1.5 text-xs hover:bg-gray-50"
              onClick={() => { onSelect(c); setQ(''); }}>
              <span className="font-medium">{c.name}</span>
              {c.city && <span className="ml-1 text-gray-400">· {c.city}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function YellowPicker({ result, customers, onSelect }: { result: MatchResult; customers: Customer[]; onSelect: (c: Customer) => void }) {
  const isMulti = result.ambiguityReason === 'multi-location';
  const hint = isMulti ? `${result.alternatives.length} locations — select one` : 'Possible match — confirm';
  const candidates = isMulti
    ? result.alternatives
    : [result.match, ...result.alternatives].filter((c): c is Customer => c !== null);

  return (
    <div className="mt-1">
      <p className="text-[10px] text-gray-400">{hint}</p>
      <select
        className="mt-0.5 w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-xs focus:outline-none"
        value={result.match?.id ?? ''}
        onChange={(e) => { const c = customers.find((x) => x.id === e.target.value); if (c) onSelect(c); }}
      >
        <option value="">— select —</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>{c.name}{c.city ? ` · ${c.city}` : ''}</option>
        ))}
      </select>
    </div>
  );
}

function StopRow({
  r,
  customers,
  onOverride,
  onRemove,
}: {
  r: MatchResult;
  customers: Customer[];
  onOverride: (inputName: string, c: Customer) => void;
  onRemove: (inputName: string) => void;
}) {
  const { Icon, color, bg } = STATUS[r.status];
  return (
    <div className={`rounded border border-gray-100 ${bg} p-1.5`}>
      <div className="flex items-start gap-1.5">
        <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${color}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xs font-medium text-gray-800 truncate">{r.inputName}</span>
            <div className="flex shrink-0 items-center gap-1">
              {r.status !== 'red' && (
                <span className="text-[10px] tabular-nums text-gray-400">{Math.round(r.confidence * 100)}%</span>
              )}
              <button
                onClick={() => onRemove(r.inputName)}
                className="rounded p-0.5 text-gray-300 hover:bg-gray-200 hover:text-gray-500"
                title="Remove"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
          {r.match && (
            <p className="text-[11px] text-gray-600 truncate">
              → {r.match.name}
              {formatAddress(r.match) ? (
                <span className="text-gray-400"> · {formatAddress(r.match)}</span>
              ) : (
                <span className="font-medium text-red-500"> · No address on file</span>
              )}
            </p>
          )}
          {r.status === 'yellow' && (
            <YellowPicker result={r} customers={customers} onSelect={(c) => onOverride(r.inputName, c)} />
          )}
          {r.status === 'red' && (
            <RedSearch customers={customers} onSelect={(c) => onOverride(r.inputName, c)} />
          )}
        </div>
      </div>
    </div>
  );
}

function ZoneSection({
  group,
  customers,
  includeAllColumns,
  onOverride,
  onRemove,
}: {
  group: ZoneGroup;
  customers: Customer[];
  includeAllColumns: boolean;
  onOverride: (inputName: string, c: Customer) => void;
  onRemove: (inputName: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const resolved = group.results.filter((r) => r.match !== null);
  const canExport = resolved.length === group.results.length && group.results.length > 0;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      {/* Zone header */}
      <div
        className="flex cursor-pointer items-center gap-1.5 bg-gray-50 px-2 py-1.5 hover:bg-gray-100"
        onClick={() => setCollapsed((c) => !c)}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}
        />
        <span className="flex-1 text-[13px] font-semibold text-gray-700">{group.zoneName}</span>
        <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
          {group.results.length} {group.results.length === 1 ? 'stop' : 'stops'}
        </span>
        <button
          disabled={!canExport}
          onClick={(e) => {
            e.stopPropagation();
            downloadZoneCsv(group.zoneName, group.results, includeAllColumns);
          }}
          className="flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-2.5 w-2.5" />
          Export
        </button>
      </div>

      {/* Zone body */}
      {!collapsed && (
        <div className="space-y-1 p-1.5">
          {group.results.map((r) => (
            <StopRow
              key={r.inputName}
              r={r}
              customers={customers}
              onOverride={onOverride}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MatchView({ customers, settings, onOpenSettings }: Props) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [customZones, setCustomZones] = useState<CustomZone[]>([]);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    Promise.all([loadMatchSession(), loadPendingNames(), loadCustomZones()]).then(
      ([session, pending, zones]) => {
        setCustomZones(zones);
        const baseInput = session?.input ?? '';
        if (session?.results?.length) setResults(session.results);

        if (pending.length > 0) {
          const pendingBlock = pending.join('\n');
          setInput(baseInput ? `${baseInput}\n${pendingBlock}` : pendingBlock);
          void clearPendingNames();
          if (typeof chrome !== 'undefined' && chrome.action) {
            chrome.action.setBadgeText({ text: '' });
          }
        } else {
          setInput(baseInput);
        }

        hydrated.current = true;
      },
    );
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    saveMatchSession(input, results);
  }, [input, results]);

  const groups = useMemo(() => groupByZone(results, customZones), [results, customZones]);

  const hasLocations = customers.length > 0;
  const matchedCount = results.filter((r) => r.match !== null).length;
  const unresolvedCount = results.filter((r) => r.match === null).length;
  const canExportAll = results.length > 0 && unresolvedCount === 0;

  function handleMatch() {
    if (!input.trim() || !hasLocations) return;
    const names = sanitizeWhatsAppPaste(input);
    setResults(
      matchName(names, customers, {
        sensitivity: settings.matchSensitivity,
        stripSuffixes: settings.stripCompanySuffixes,
      }),
    );
  }

  function handleOverride(inputName: string, customer: Customer) {
    setResults((prev) =>
      prev.map((r) =>
        r.inputName === inputName
          ? { ...r, match: customer, status: 'green', confidence: 1, alternatives: [], ambiguityReason: undefined }
          : r,
      ),
    );
  }

  function handleRemove(inputName: string) {
    setResults((prev) => prev.filter((r) => r.inputName !== inputName));
  }

  function handleClear() {
    setInput('');
    setResults([]);
    clearMatchSession();
    if (typeof chrome !== 'undefined' && chrome.action) {
      chrome.action.setBadgeText({ text: '' });
    }
  }

  function handleExportAll() {
    setExportingAll(true);
    const doExport = async () => {
      if (settings.exportMode === 'combined') {
        downloadCombinedCsv(groups, settings.includeAllColumns, settings.csvDelimiter);
        await new Promise((r) => setTimeout(r, 500));
      } else {
        for (const group of groups) {
          downloadZoneCsv(group.zoneName, group.results, settings.includeAllColumns, settings.csvDelimiter);
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      setExportingAll(false);
      setInput('');
      setResults([]);
      clearMatchSession();
    };
    doExport().catch(() => setExportingAll(false));
  }

  function copyAddresses() {
    const allResults = groups.flatMap((g) => g.results);
    navigator.clipboard.writeText(buildAddressesText(allResults)).then(() => {
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    });
  }

  return (
    <div className="flex max-h-[560px] flex-col gap-3 overflow-y-auto p-3">
      {/* Location badge */}
      {hasLocations ? (
        <p className="text-xs text-gray-500">
          <span className="font-medium text-green-700">{customers.length.toLocaleString()} locations</span> loaded
        </p>
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          No locations loaded —{' '}
          <button onClick={onOpenSettings} className="font-medium underline hover:text-amber-900">
            open Settings to import a file
          </button>
          .
        </p>
      )}

      {/* Input */}
      <textarea
        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
        rows={5}
        placeholder="Paste WhatsApp names here (one per line, or mixed with timestamps / phone numbers)..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleMatch(); }}
      />

      <button
        onClick={handleMatch}
        disabled={!hasLocations || !input.trim()}
        className="w-full rounded-lg bg-[#1D9E75] py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Match Names
      </button>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
          <Inbox className="h-6 w-6 text-gray-300" />
          <p className="text-xs font-medium text-gray-500">No names collected yet</p>
          <p className="text-[10px] text-gray-400">
            Paste names above, or right-click selected text on any page and choose “Add to Spoke Bridge”.
          </p>
        </div>
      )}

      {/* Zone results */}
      {groups.length > 0 && (
        <>
          <div className="space-y-1.5">
            {groups.map((group) => (
              <ZoneSection
                key={group.zoneName}
                group={group}
                customers={customers}
                includeAllColumns={settings.includeAllColumns}
                onOverride={handleOverride}
                onRemove={handleRemove}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span>
                {matchedCount} of {results.length} matched · {groups.length} {groups.length === 1 ? 'zone' : 'zones'}
                {unresolvedCount > 0 && <span className="ml-1 text-amber-500">· {unresolvedCount} unresolved</span>}
              </span>
              <button onClick={handleClear} className="text-gray-400 underline hover:text-gray-600">
                Clear all
              </button>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={copyAddresses}
                className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50"
              >
                {copiedAddr ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copiedAddr ? 'Copied!' : 'Addresses'}
              </button>
              <button
                disabled={!canExportAll || exportingAll}
                onClick={handleExportAll}
                className="flex items-center gap-1 rounded bg-[#1D9E75] px-2 py-1 text-[10px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exportingAll ? <Check className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                {exportingAll ? 'Saving…' : 'Export all zones'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
