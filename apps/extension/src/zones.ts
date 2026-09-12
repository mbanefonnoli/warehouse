import type { MatchResult } from '@spoke/shared';
import type { CustomZone } from './types';

export function normCity(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ăâ]/g, 'a')
    .replace(/î/g, 'i')
    .replace(/[şșŞȘ]/g, 's')
    .replace(/[ţțŢȚ]/g, 't')
    .trim();
}

export interface ZoneGroup {
  zoneName: string;
  results: MatchResult[];
}

export function groupByZone(results: MatchResult[], customZones: CustomZone[]): ZoneGroup[] {
  const cityToZone: Record<string, string> = {};
  for (const zone of customZones) {
    for (const city of zone.cities) {
      cityToZone[normCity(city)] = zone.name;
    }
  }

  const map = new Map<string, MatchResult[]>();
  for (const r of results) {
    const city = (r.match?.city ?? '').trim();
    const zoneName = cityToZone[normCity(city)] ?? (city || 'Unknown');
    if (!map.has(zoneName)) map.set(zoneName, []);
    map.get(zoneName)!.push(r);
  }

  return Array.from(map.entries()).map(([zoneName, results]) => ({ zoneName, results }));
}
