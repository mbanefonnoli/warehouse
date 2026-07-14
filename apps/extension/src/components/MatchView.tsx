import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Search, Copy, Check, Download } from 'lucide-react';
import { matchName, sanitizeWhatsAppPaste } from '@spoke/shared';
import type { Customer, MatchResult } from '@spoke/shared';
import type { Settings } from '../types';
import { formatAddress, buildCsvText, buildAddressesText, downloadCsvFile } from '../exportCsv';
import { saveMatchSession, loadMatchSession, clearMatchSession } from '../storage';

interface Props {
  customers: Customer[];
  settings: Settings;
}

const STATUS = {
  green: { Icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  yellow: { Icon: AlertCircle,  color: 'text-amber-500', bg: 'bg-amber-50' },
  red:    { Icon: XCircle,      color: 'text-red-500',   bg: 'bg-red-50'   },
};

function RedSearch({
  customers,
  onSelect,
}: {
  customers: Customer[];
  onSelect: (c: Customer) => void;
}) {
  const [q, setQ] = useState('');
  const hits =
    q.length > 1
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
            <li
              key={c.id}
              className="cursor-pointer px-2 py-1.5 text-xs hover:bg-gray-50"
              onClick={() => { onSelect(c); setQ(''); }}
            >
              <span className="font-medium">{c.name}</span>
              {c.city && <span className="ml-1 text-gray-400">· {c.city}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function YellowPicker({
  result,
  customers,
  onSelect,
}: {
  result: MatchResult;
  customers: Customer[];
  onSelect: (c: Customer) => void;
}) {
  const isMulti = result.ambiguityReason === 'multi-location';
  const hint = isMulti
    ? `${result.alternatives.length} locations — select one`
    : 'Possible match — confirm';
  const candidates = isMulti
    ? result.alternatives
    : [result.match, ...result.alternatives].filter((c): c is Customer => c !== null);

  return (
    <div className="mt-1">
      <p className="text-[10px] text-gray-400">{hint}</p>
      <select
        className="mt-0.5 w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-xs focus:outline-none"
        value={result.match?.id ?? ''}
        onChange={(e) => {
          const c = customers.find((x) => x.id === e.target.value);
          if (c) onSelect(c);
        }}
      >
        <option value="">— select —</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{c.city ? ` · ${c.city}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function MatchView({ customers, settings }: Props) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const hydrated = useRef(false);

  // Restore session when popup opens
  useEffect(() => {
    loadMatchSession().then((session) => {
      if (session) {
        setInput(session.input);
        setResults(session.results);
      }
      hydrated.current = true;
    });
  }, []);

  // Persist session whenever input or results change (after initial load)
  useEffect(() => {
    if (!hydrated.current) return;
    saveMatchSession(input, results);
  }, [input, results]);

  const hasLocations = customers.length > 0;
  const unresolvedCount = results.filter((r) => r.match === null).length;
  const canExport = results.length > 0 && unresolvedCount === 0;

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

  function copy(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleExportCsv() {
    navigator.clipboard.writeText(buildCsvText(results, settings.includeAllColumns)).then(() => {
      setCopiedCsv(true);
      setTimeout(() => {
        setCopiedCsv(false);
        setInput('');
        setResults([]);
        clearMatchSession();
      }, 1500);
    });
  }

  function handleDownloadCsv() {
    downloadCsvFile(results, settings.includeAllColumns);
    setDownloaded(true);
    setTimeout(() => {
      setDownloaded(false);
      setInput('');
      setResults([]);
      clearMatchSession();
    }, 1500);
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Location badge */}
      {hasLocations ? (
        <p className="text-xs text-gray-500">
          <span className="font-medium text-green-700">{customers.length.toLocaleString()} locations</span> loaded
        </p>
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          No locations loaded — open Settings to import a CSV.
        </p>
      )}

      {/* Input */}
      <textarea
        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
        rows={5}
        placeholder="Paste WhatsApp names here (one per line, or mixed with timestamps / phone numbers)..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleMatch();
        }}
      />

      <button
        onClick={handleMatch}
        disabled={!hasLocations || !input.trim()}
        className="w-full rounded-lg bg-[#1D9E75] py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Match Names
      </button>

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="space-y-1.5">
            {results.map((r) => {
              const { Icon, color, bg } = STATUS[r.status];
              return (
                <div key={r.inputName} className={`rounded-lg border border-gray-100 ${bg} p-2`}>
                  <div className="flex items-start gap-2">
                    <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-xs font-medium text-gray-800 truncate">{r.inputName}</span>
                        {r.status !== 'red' && (
                          <span className="shrink-0 text-[10px] tabular-nums text-gray-400">
                            {Math.round(r.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      {r.match && (
                        <p className="text-[11px] text-gray-600 truncate">
                          → {r.match.name}
                          {formatAddress(r.match) && (
                            <span className="text-gray-400"> · {formatAddress(r.match)}</span>
                          )}
                        </p>
                      )}
                      {r.status === 'yellow' && (
                        <YellowPicker
                          result={r}
                          customers={customers}
                          onSelect={(c) => handleOverride(r.inputName, c)}
                        />
                      )}
                      {r.status === 'red' && (
                        <RedSearch
                          customers={customers}
                          onSelect={(c) => handleOverride(r.inputName, c)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export bar */}
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
            <p className="text-[10px] text-gray-400">
              {results.length} rows
              {unresolvedCount > 0 && (
                <span className="ml-1 text-amber-500">· {unresolvedCount} unresolved</span>
              )}
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => copy(buildAddressesText(results), setCopiedAddr)}
                className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50"
              >
                {copiedAddr ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copiedAddr ? 'Copied!' : 'Addresses'}
              </button>
              <button
                disabled={!canExport}
                onClick={handleExportCsv}
                className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copiedCsv ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copiedCsv ? 'Copied!' : 'Copy CSV'}
              </button>
              <button
                disabled={!canExport}
                onClick={handleDownloadCsv}
                className="flex items-center gap-1 rounded bg-[#1D9E75] px-2 py-1 text-[10px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {downloaded ? <Check className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                {downloaded ? 'Saved!' : 'Export CSV'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
