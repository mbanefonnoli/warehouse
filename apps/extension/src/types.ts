import type { MatchResult } from '@spoke/shared';

export interface ImportConfig {
  fileName: string;
  lastUpdated: string; // ISO date string
  count: number;
}

export interface CustomZone {
  id: string;
  name: string;
  cities: string[];
}

export type ExportMode = 'per-zone' | 'combined';
export type CsvDelimiter = 'comma' | 'semicolon';

export interface Settings {
  matchSensitivity: 'strict' | 'normal' | 'loose';
  stripCompanySuffixes: boolean;
  includeAllColumns: boolean;
  exportMode: ExportMode;
  csvDelimiter: CsvDelimiter;
}

export const DEFAULT_SETTINGS: Settings = {
  matchSensitivity: 'normal',
  stripCompanySuffixes: true,
  includeAllColumns: false,
  exportMode: 'per-zone',
  csvDelimiter: 'comma',
};

export const FREE_NAME_CAP = 10;

export interface License {
  key: string;
  status: 'active' | 'inactive';
  instanceId: string | null;
  activatedAt: string;
  validatedAt: string;
}

export interface HistoryZoneSummary {
  name: string;
  count: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: string; // ISO date string
  totalMatched: number;
  zones: HistoryZoneSummary[];
  matchedStops: MatchResult[];
}
