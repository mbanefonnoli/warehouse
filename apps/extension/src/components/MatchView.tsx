import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2, AlertCircle, XCircle, Search, Copy, Check, Download, ChevronRight, X, Inbox,
  Lock, Infinity as InfinityIcon, MapPin, History as HistoryIcon,
} from 'lucide-react';
import { matchName, sanitizeWhatsAppPaste } from '@spoke/shared';
import type { Customer, MatchResult } from '@spoke/shared';
import type { CustomZone, HistoryEntry, Settings } from '../types';
import { FREE_NAME_CAP } from '../types';
import { formatAddress, buildAddressesText, downloadZoneCsv, downloadCombinedCsv, downloadFlatCsv } from '../exportCsv';
import { saveMatchSession, loadMatchSession, clearMatchSession, loadPendingNames, clearPendingNames, loadCustomZones } from '../storage';
import { groupByZone } from '../zones';
import type { ZoneGroup } from '../zones';
import { track } from '../analytics';
import { saveSession } from '../history';
import { LEMONSQUEEZY_CHECKOUT_URL } from '../license';
import HistoryView from './HistoryView';

interface Props {
  customers: Customer[];
  settings: Settings;
  isPro: boolean;
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

function UsageBar({ count }: { count: number }) {
  const clamped = Math.min(count, FREE_NAME_CAP);
  const pct = (clamped / FREE_NAME_CAP) * 100;
  const barColor = clamped >= FREE_NAME_CAP ? '#ef4444' : clamped >= FREE_NAME_CAP - 2 ? '#f59e0b' : '#1D9E75';

  return (
    <div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
        <span>{clamped} of {FREE_NAME_CAP} names used</span>
        {clamped >= FREE_NAME_CAP ? (
          <span className="font-medium text-red-500">Limit reached</span>
        ) : (
          <span>{FREE_NAME_CAP - clamped} remaining</span>
        )}
      </div>
    </div>
  );
}

function UpgradeCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative rounded-lg border border-[#534AB7]/20 p-3" style={{ backgroundColor: 'rgba(83, 74, 183, 0.08)' }}>
      <button
        onClick={onDismiss}
        className="absolute right-2 top-2 rounded p-0.5 text-gray-400 hover:bg-black/5 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
      <p className="pr-4 text-xs font-semibold text-gray-800">You've hit the free plan limit</p>
      <p className="mt-0.5 text-[10px] text-gray-500">Upgrade to Pro for unlimited names and more.</p>
      <ul className="mt-2 space-y-1">
        <li className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <InfinityIcon className="h-3 w-3 shrink-0 text-[#534AB7]" /> Unlimited names per session
        </li>
        <li className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <MapPin className="h-3 w-3 shrink-0 text-[#534AB7]" /> Zone grouping with per-zone export
        </li>
        <li className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <HistoryIcon className="h-3 w-3 shrink-0 text-[#534AB7]" /> Match history and re-export
        </li>
      </ul>
      <a
        href={LEMONSQUEEZY_CHECKOUT_URL}
        target="_blank"
        rel="noreferrer"
        onClick={() => track('upgrade_clicked', {})}
        className="mt-2 block rounded bg-[#534AB7] py-1.5 text-center text-[11px] font-semibold text-white hover:opacity-90"
      >
        Upgrade to Pro — $9.99 one-time
      </a>
    </div>
  );
}

export default function MatchView({ customers, settings, isPro, onOpenSettings }: Props) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [customZones, setCustomZones] = useState<CustomZone[]>([]);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
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
  const atCap = !isPro && results.length >= FREE_NAME_CAP;

  function handleMatch() {
    if (!input.trim() || !hasLocations) return;
    let names = sanitizeWhatsAppPaste(input);
    if (!isPro && names.length > FREE_NAME_CAP) {
      names = names.slice(0, FREE_NAME_CAP);
    }
    const matched = matchName(names, customers, {
      sensitivity: settings.matchSensitivity,
      stripSuffixes: settings.stripCompanySuffixes,
    });
    setResults(matched);

    const zoneCount = groupByZone(matched, customZones).length;
    track('names_matched', { count: matched.length, zones: zoneCount });
    if (!isPro && matched.length >= FREE_NAME_CAP) track('free_limit_hit', {});
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
    setUpgradeDismissed(false);
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
      await saveSession(groups);
      track('csv_exported', { stop_count: matchedCount, zone_count: groups.length, export_mode: settings.exportMode });
      setExportingAll(false);
      setInput('');
      setResults([]);
      clearMatchSession();
    };
    doExport().catch(() => setExportingAll(false));
  }

  async function handleExportFlat() {
    downloadFlatCsv(results, settings.includeAllColumns, settings.csvDelimiter);
    await saveSession(groups);
    track('csv_exported', { stop_count: matchedCount, zone_count: groups.length, export_mode: 'flat' });
    setInput('');
    setResults([]);
    clearMatchSession();
    if (typeof chrome !== 'undefined' && chrome.action) {
      chrome.action.setBadgeText({ text: '' });
    }
  }

  function handleLoadSession(entry: HistoryEntry) {
    setResults(entry.matchedStops);
    setInput(entry.matchedStops.map((r) => r.inputName).join('\n'));
    setActiveTab('current');
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

      {/* Usage bar — free tier only */}
      {!isPro && <UsageBar count={results.length} />}

      {/* Input */}
      <div className="relative">
        <textarea
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#1D9E75] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
          rows={5}
          placeholder="Paste WhatsApp names here (one per line, or mixed with timestamps / phone numbers)..."
          value={input}
          disabled={atCap}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleMatch(); }}
        />
        {atCap && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-white/70 text-center">
            <Lock className="h-4 w-4 text-gray-400" />
            <p className="text-[11px] font-medium text-gray-500">Upgrade to add more names</p>
          </div>
        )}
      </div>

      <button
        onClick={handleMatch}
        disabled={!hasLocations || !input.trim() || atCap}
        className="w-full rounded-lg bg-[#1D9E75] py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Match Names
      </button>

      {/* Upgrade card — shown only at the free limit */}
      {atCap && !upgradeDismissed && <UpgradeCard onDismiss={() => setUpgradeDismissed(true)} />}

      {/* Tab bar — Pro only */}
      {isPro && (
        <div className="flex h-9 border-b border-gray-100 text-[13px]">
          {(['current', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 border-b-2 font-medium transition-colors ${
                activeTab === tab ? 'border-[#1D9E75] text-gray-800' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'current' ? 'Current Session' : 'History'}
            </button>
          ))}
        </div>
      )}

      {isPro && activeTab === 'history' ? (
        <HistoryView settings={settings} customZones={customZones} onLoadSession={handleLoadSession} />
      ) : (
        <>
          {/* Empty state */}
          {results.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
              <Inbox className="h-6 w-6 text-gray-300" />
              <p className="text-xs font-medium text-gray-500">No names collected yet</p>
              <p className="text-[10px] text-gray-400">
                Paste names above, or right-click selected text on any page and choose “Add to Spoke Bridge”.
              </p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <>
              {isPro ? (
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
              ) : (
                <div className="space-y-1">
                  {results.map((r) => (
                    <StopRow key={r.inputName} r={r} customers={customers} onOverride={handleOverride} onRemove={handleRemove} />
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span>
                    {matchedCount} of {results.length} matched
                    {isPro && ` · ${groups.length} ${groups.length === 1 ? 'zone' : 'zones'}`}
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
                  {isPro ? (
                    <button
                      disabled={!canExportAll || exportingAll}
                      onClick={handleExportAll}
                      className="flex items-center gap-1 rounded bg-[#1D9E75] px-2 py-1 text-[10px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {exportingAll ? <Check className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                      {exportingAll ? 'Saving…' : 'Export all zones'}
                    </button>
                  ) : (
                    <button
                      disabled={!canExportAll}
                      onClick={handleExportFlat}
                      className="flex items-center gap-1 rounded bg-[#1D9E75] px-2 py-1 text-[10px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download className="h-3 w-3" />
                      Export CSV
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
