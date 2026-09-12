import type { MatchResult } from '@spoke/shared';
import type { HistoryEntry } from './types';
import type { ZoneGroup } from './zones';
import { appendMatchHistory, loadMatchHistory } from './storage';

export async function saveSession(groups: ZoneGroup[]): Promise<void> {
  const matchedStops: MatchResult[] = groups.flatMap((g) => g.results).filter((r) => r.match !== null);
  if (matchedStops.length === 0) return;

  const entry: HistoryEntry = {
    id: `session_${Date.now()}`,
    timestamp: new Date().toISOString(),
    totalMatched: matchedStops.length,
    zones: groups
      .map((g) => ({ name: g.zoneName, count: g.results.filter((r) => r.match !== null).length }))
      .filter((z) => z.count > 0),
    matchedStops,
  };
  await appendMatchHistory(entry);
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return loadMatchHistory();
}
