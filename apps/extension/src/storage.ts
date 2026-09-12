import type { Customer, MatchResult } from '@spoke/shared';
import type { CustomZone, HistoryEntry, ImportConfig, License, Settings } from './types';
import { DEFAULT_SETTINGS } from './types';

const MASTER_KEY = 'srb_master_list';
const CONFIG_KEY = 'srb_import_config';
const SETTINGS_KEY = 'srb_settings';

// chrome.storage is unavailable in test / non-extension environments
const store =
  typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.local : null;

export async function saveMasterList(customers: Customer[], config: ImportConfig): Promise<void> {
  if (!store) return;
  await store.set({ [MASTER_KEY]: customers, [CONFIG_KEY]: config });
}

export async function loadMasterList(): Promise<{ customers: Customer[]; config: ImportConfig } | null> {
  if (!store) return null;
  const result = await store.get([MASTER_KEY, CONFIG_KEY]);
  if (!result[MASTER_KEY] || !result[CONFIG_KEY]) return null;
  return { customers: result[MASTER_KEY] as Customer[], config: result[CONFIG_KEY] as ImportConfig };
}

export async function clearMasterList(): Promise<void> {
  if (!store) return;
  await store.remove([MASTER_KEY, CONFIG_KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (!store) return;
  await store.set({ [SETTINGS_KEY]: settings });
}

export async function loadSettings(): Promise<Settings> {
  if (!store) return DEFAULT_SETTINGS;
  const result = await store.get(SETTINGS_KEY);
  if (!result[SETTINGS_KEY]) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] as Partial<Settings>) };
}

const SESSION_KEY = 'srb_match_session';

export async function saveMatchSession(input: string, results: MatchResult[]): Promise<void> {
  if (!store) return;
  await store.set({ [SESSION_KEY]: { input, results } });
}

export async function loadMatchSession(): Promise<{ input: string; results: MatchResult[] } | null> {
  if (!store) return null;
  const r = await store.get(SESSION_KEY);
  return (r[SESSION_KEY] as { input: string; results: MatchResult[] }) ?? null;
}

export async function clearMatchSession(): Promise<void> {
  if (!store) return;
  await store.remove(SESSION_KEY);
}

const PENDING_KEY = 'srb_pending_names';

export async function loadPendingNames(): Promise<string[]> {
  if (!store) return [];
  const r = await store.get(PENDING_KEY);
  return (Array.isArray(r[PENDING_KEY]) ? r[PENDING_KEY] : []) as string[];
}

export async function clearPendingNames(): Promise<void> {
  if (!store) return;
  await store.remove(PENDING_KEY);
}

const ZONES_KEY = 'customZones';
const CITIES_KEY = 'availableCities';

export async function loadCustomZones(): Promise<CustomZone[]> {
  if (!store) return [];
  const r = await store.get(ZONES_KEY);
  return (Array.isArray(r[ZONES_KEY]) ? r[ZONES_KEY] : []) as CustomZone[];
}

export async function saveCustomZones(zones: CustomZone[]): Promise<void> {
  if (!store) return;
  await store.set({ [ZONES_KEY]: zones });
}

export async function loadAvailableCities(): Promise<string[]> {
  if (!store) return [];
  const r = await store.get(CITIES_KEY);
  return (Array.isArray(r[CITIES_KEY]) ? r[CITIES_KEY] : []) as string[];
}

export async function saveAvailableCities(cities: string[]): Promise<void> {
  if (!store) return;
  await store.set({ [CITIES_KEY]: cities });
}

const LICENSE_KEY = 'srb_license';

export async function loadLicense(): Promise<License | null> {
  if (!store) return null;
  const r = await store.get(LICENSE_KEY);
  return (r[LICENSE_KEY] as License) ?? null;
}

export async function saveLicense(license: License): Promise<void> {
  if (!store) return;
  await store.set({ [LICENSE_KEY]: license });
}

export async function clearLicense(): Promise<void> {
  if (!store) return;
  await store.remove(LICENSE_KEY);
}

const HISTORY_KEY = 'srb_match_history';
const HISTORY_LIMIT = 30;

export async function loadMatchHistory(): Promise<HistoryEntry[]> {
  if (!store) return [];
  const r = await store.get(HISTORY_KEY);
  return (Array.isArray(r[HISTORY_KEY]) ? r[HISTORY_KEY] : []) as HistoryEntry[];
}

export async function appendMatchHistory(entry: HistoryEntry): Promise<void> {
  if (!store) return;
  const existing = await loadMatchHistory();
  const updated = [entry, ...existing].slice(0, HISTORY_LIMIT);
  await store.set({ [HISTORY_KEY]: updated });
}
