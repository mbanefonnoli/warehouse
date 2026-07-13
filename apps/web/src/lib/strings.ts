import type { Strings } from '@/types';

export const en: Strings = {
  title: 'Spoke Route Bridge',
  subtitle: 'Match WhatsApp names to your master list and export a Spoke-compatible CSV.',
  // Locations section
  locationsTitle: 'Locations',
  csvCallout:
    'Expected CSV columns: Company Name, Address Line 1, City, State, Country, Notes, Latitude, Longitude',
  updateFile: 'Update File',
  clearDatabase: 'Clear Database',
  lastUpdated: 'Last updated:',
  locationsLoaded: '{n} locations loaded',
  noFileLoaded: 'No file loaded',
  uploadHint: 'Drag & drop or click to select a Spoke/Circuit .csv export',
  previewCompanyName: 'Company Name',
  previewAddress: 'Address',
  previewCity: 'City',
  previewNotes: 'Notes',
  // Matching section
  matchingSection: 'Matching',
  matchSensitivityLabel: 'Match sensitivity',
  sensStrict: 'Strict',
  sensNormal: 'Normal',
  sensLoose: 'Loose',
  stripSuffixesLabel: 'Strip SRL, SA, S.C. from names',
  // Export section
  exportSection: 'Export',
  includeAllColumnsLabel: 'Include all columns',
  // Input / match results
  inputTitle: 'WhatsApp Names',
  inputPlaceholder:
    'Paste names from WhatsApp here (one per line, commas, or mixed with phone numbers / timestamps)...',
  matchBtn: 'Match Names',
  resultsTitle: 'Match Results',
  inputName: 'Input Name',
  matchedTo: 'Matched To',
  address: 'Address',
  confidence: 'Score',
  override: 'Override',
  searchPlaceholder: 'Search location...',
  downloadCsv: 'Download Spoke CSV',
  copyAddresses: 'Copy Addresses',
  copied: 'Copied!',
  noMatch: 'No match found',
  pendingReview: 'needs review',
  rowCount: 'rows',
  yellowMultiLocation: '{n} locations found — select one',
  yellowFuzzy: 'Possible match — confirm below',
};

export const ro: Strings = {
  title: 'Spoke Route Bridge',
  subtitle: 'Potrivește numele din WhatsApp cu lista master și exportă un CSV pentru Spoke.',
  // Locations section
  locationsTitle: 'Locații',
  csvCallout:
    'Coloane CSV așteptate: Company Name, Address Line 1, City, State, Country, Notes, Latitude, Longitude',
  updateFile: 'Actualizează Fișierul',
  clearDatabase: 'Șterge Baza de Date',
  lastUpdated: 'Actualizat la:',
  locationsLoaded: '{n} locații încărcate',
  noFileLoaded: 'Niciun fișier încărcat',
  uploadHint: 'Trage & aruncă sau dă clic pentru a selecta un export .csv din Spoke/Circuit',
  previewCompanyName: 'Nume Companie',
  previewAddress: 'Adresă',
  previewCity: 'Oraș',
  previewNotes: 'Note',
  // Matching section
  matchingSection: 'Potrivire',
  matchSensitivityLabel: 'Sensibilitate potrivire',
  sensStrict: 'Strictă',
  sensNormal: 'Normală',
  sensLoose: 'Relaxată',
  stripSuffixesLabel: 'Elimină SRL, SA, S.C. din nume',
  // Export section
  exportSection: 'Export',
  includeAllColumnsLabel: 'Include toate coloanele',
  // Input / match results
  inputTitle: 'Nume din WhatsApp',
  inputPlaceholder:
    'Lipește numele din WhatsApp (unul pe linie, separate prin virgulă, sau amestecate cu numere de telefon / marcaje de timp)...',
  matchBtn: 'Potrivește Numele',
  resultsTitle: 'Rezultate Potrivire',
  inputName: 'Nume Introdus',
  matchedTo: 'Potrivit Cu',
  address: 'Adresă',
  confidence: 'Scor',
  override: 'Modifică',
  searchPlaceholder: 'Caută locație...',
  downloadCsv: 'Descarcă CSV Spoke',
  copyAddresses: 'Copiază Adresele',
  copied: 'Copiat!',
  noMatch: 'Nicio potrivire',
  pendingReview: 'necesită revizuire',
  rowCount: 'rânduri',
  yellowMultiLocation: '{n} locații găsite — selectează una',
  yellowFuzzy: 'Potrivire posibilă — confirmă mai jos',
};
