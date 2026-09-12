import type { License } from './types';
import { clearLicense, loadLicense, saveLicense } from './storage';

// TODO: replace with the real LemonSqueezy checkout URL for the Pro product
// once it's set up in the LemonSqueezy dashboard.
export const LEMONSQUEEZY_CHECKOUT_URL = 'https://YOUR-STORE.lemonsqueezy.com/buy/YOUR-PRODUCT-ID';

const INSTANCE_NAME = 'spoke-route-bridge';
const LS_API = 'https://api.lemonsqueezy.com/v1/licenses';

interface ValidateResult {
  valid: boolean;
  error?: string;
}

interface ActivateResult {
  activated: boolean;
  error?: string;
  instanceId?: string;
}

interface DeactivateResult {
  deactivated: boolean;
  error?: string;
}

export async function validateLicenseKey(licenseKey: string, instanceId: string | null): Promise<ValidateResult> {
  try {
    const response = await fetch(`${LS_API}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_id: instanceId ?? undefined,
      }),
    });
    const data = await response.json();
    if (data.valid) return { valid: true };
    return { valid: false, error: data.error ?? 'Invalid license key' };
  } catch {
    return { valid: false, error: 'Could not reach license server. Check your connection.' };
  }
}

export async function activateLicenseKey(licenseKey: string): Promise<ActivateResult> {
  try {
    const response = await fetch(`${LS_API}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_name: INSTANCE_NAME,
      }),
    });
    const data = await response.json();
    if (!data.activated) return { activated: false, error: data.error ?? 'Could not activate this key.' };
    return { activated: true, instanceId: data.instance?.id ?? null };
  } catch {
    return { activated: false, error: 'Network error during activation.' };
  }
}

export async function deactivateLicenseKey(licenseKey: string, instanceId: string | null): Promise<DeactivateResult> {
  try {
    const response = await fetch(`${LS_API}/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        instance_id: instanceId ?? undefined,
      }),
    });
    const data = await response.json();
    return { deactivated: Boolean(data.deactivated), error: data.error };
  } catch {
    return { deactivated: false, error: 'Network error during deactivation.' };
  }
}

export async function isPro(): Promise<boolean> {
  const license = await loadLicense();
  return license?.status === 'active';
}

export function maskLicenseKey(key: string): string {
  const last4 = key.slice(-4);
  return `••••••••-${last4}`;
}

/** Activates a key end-to-end and persists it. Returns an error string on failure. */
export async function activateAndSave(licenseKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = licenseKey.trim();
  if (!key) return { ok: false, error: 'Enter a license key.' };

  const result = await activateLicenseKey(key);
  if (!result.activated) return { ok: false, error: result.error ?? 'Could not activate this key.' };

  const now = new Date().toISOString();
  const license: License = {
    key,
    status: 'active',
    instanceId: result.instanceId ?? null,
    activatedAt: now,
    validatedAt: now,
  };
  await saveLicense(license);
  return { ok: true };
}

export async function deactivateAndClear(): Promise<void> {
  const license = await loadLicense();
  if (license) {
    await deactivateLicenseKey(license.key, license.instanceId);
  }
  await clearLicense();
}
