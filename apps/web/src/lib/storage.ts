import { Customer, MasterListConfig } from '@/types';

const MASTER_KEY = 'srb_master_list';
const CONFIG_KEY = 'srb_master_config';

export function saveMasterList(customers: Customer[], config: MasterListConfig): void {
  try {
    localStorage.setItem(MASTER_KEY, JSON.stringify(customers));
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // localStorage may be full; silently ignore
  }
}

export function loadMasterList(): { customers: Customer[]; config: MasterListConfig } | null {
  try {
    const raw = localStorage.getItem(MASTER_KEY);
    const configRaw = localStorage.getItem(CONFIG_KEY);
    if (!raw || !configRaw) return null;
    return { customers: JSON.parse(raw), config: JSON.parse(configRaw) };
  } catch {
    return null;
  }
}

export function clearMasterList(): void {
  localStorage.removeItem(MASTER_KEY);
  localStorage.removeItem(CONFIG_KEY);
}
