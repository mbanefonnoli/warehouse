import { useEffect, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import type { HistoryEntry, Settings } from '../types';
import { getHistory } from '../history';
import { groupByZone } from '../zones';
import { downloadCombinedCsv, downloadZoneCsv } from '../exportCsv';
import type { CustomZone } from '../types';

interface Props {
  settings: Settings;
  customZones: CustomZone[];
  onLoadSession: (entry: HistoryEntry) => void;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  const fullDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today — ${fullDate} · ${time}` : `${fullDate} · ${time}`;
}

export default function HistoryView({ settings, customZones, onLoadSession }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    getHistory().then(setEntries);
  }, []);

  function reExport(entry: HistoryEntry) {
    const groups = groupByZone(entry.matchedStops, customZones);
    if (settings.exportMode === 'combined') {
      downloadCombinedCsv(groups, settings.includeAllColumns, settings.csvDelimiter);
    } else {
      groups.forEach((g, i) => {
        setTimeout(() => downloadZoneCsv(g.zoneName, g.results, settings.includeAllColumns, settings.csvDelimiter), i * 200);
      });
    }
  }

  if (entries === null) {
    return <p className="py-6 text-center text-xs text-gray-400">Loading history…</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
        <p className="text-xs font-medium text-gray-500">No exports yet</p>
        <p className="text-[10px] text-gray-400">Sessions you export will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="border-b border-gray-100 pb-2">
          <p className="text-[10px] text-gray-400">{formatTimestamp(entry.timestamp)}</p>
          <p className="text-xs font-medium text-gray-700">
            {entry.totalMatched} names matched · {entry.zones.length} {entry.zones.length === 1 ? 'zone' : 'zones'} exported
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {entry.zones.map((z) => (
              <span key={z.name} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                {z.name} · {z.count}
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <button
              onClick={() => reExport(entry)}
              className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50"
            >
              <Download className="h-2.5 w-2.5" /> Re-export
            </button>
            <button
              onClick={() => onLoadSession(entry)}
              className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50"
            >
              <Upload className="h-2.5 w-2.5" /> Load into session
            </button>
          </div>
        </div>
      ))}
      <p className="text-center text-[10px] text-gray-400">Last 30 sessions stored</p>
    </div>
  );
}
