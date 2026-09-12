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
