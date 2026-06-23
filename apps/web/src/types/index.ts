export interface Customer {
  id: string;
  name: string;
  address: string;
  sourceRow: number;
}

export interface MatchResult {
  inputName: string;
  match: Customer | null;
  confidence: number;
  status: 'green' | 'yellow' | 'red';
  alternatives: Customer[];
}

export interface MasterListConfig {
  nameColumn: string;
  addressColumn: string;
  sheetName: string;
  fileName: string;
}

export type Language = 'en' | 'ro';

export interface Strings {
  title: string;
  subtitle: string;
  uploadTitle: string;
  uploadSubtitle: string;
  uploadHint: string;
  selectSheet: string;
  mapColumns: string;
  nameColumn: string;
  addressColumn: string;
  saveList: string;
  listCached: string;
  clearList: string;
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
}
