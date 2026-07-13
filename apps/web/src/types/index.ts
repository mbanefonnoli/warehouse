export type { Customer, MatchResult, MatchOptions } from '@spoke/shared';

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

export type Language = 'en' | 'ro';

export interface Strings {
  title: string;
  subtitle: string;
  // Locations section
  locationsTitle: string;
  csvCallout: string;
  updateFile: string;
  clearDatabase: string;
  lastUpdated: string;
  locationsLoaded: string; // use {n} as placeholder for count
  noFileLoaded: string;
  uploadHint: string;
  previewCompanyName: string;
  previewAddress: string;
  previewCity: string;
  previewNotes: string;
  // Matching section
  matchingSection: string;
  matchSensitivityLabel: string;
  sensStrict: string;
  sensNormal: string;
  sensLoose: string;
  stripSuffixesLabel: string;
  // Export section
  exportSection: string;
  includeAllColumnsLabel: string;
  // Input / match results
  inputTitle: string;
  inputPlaceholder: string;
  matchBtn: string;
  resultsTitle: string;
  inputName: string;
  matchedTo: string;
  address: string;
  confidence: string;
  override: string;
  searchPlaceholder: string;
  downloadCsv: string;
  copyAddresses: string;
  copied: string;
  noMatch: string;
  pendingReview: string;
  rowCount: string;
  yellowMultiLocation: string; // "{n} locations found — select one"
  yellowFuzzy: string;
}
