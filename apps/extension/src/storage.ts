import type { Customer } from '@spoke/shared';
import type { ImportConfig, Settings } from './types';
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
