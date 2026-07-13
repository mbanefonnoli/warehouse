export interface ImportConfig {
  fileName: string;
  lastUpdated: string; // ISO date string
  count: number;
}

export interface Settings {
  matchSensitivity: 'strict' | 'normal' | 'loose';
  stripCompanySuffixes: boolean;
  includeAllColumns: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  matchSensitivity: 'normal',
  stripCompanySuffixes: true,
  includeAllColumns: false,
};
