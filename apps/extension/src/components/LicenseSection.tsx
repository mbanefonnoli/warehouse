import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { activateAndSave, deactivateAndClear, maskLicenseKey, LEMONSQUEEZY_CHECKOUT_URL } from '../license';
import type { License } from '../types';
import { track } from '../analytics';
import { loadLicense } from '../storage';

interface Props {
  license: License | null;
  onLicenseChange: (license: License | null) => void;
}

export default function LicenseSection({ license, onLicenseChange }: Props) {
  const [keyInput, setKeyInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setBusy(true);
    setError(null);
    const result = await activateAndSave(keyInput);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setKeyInput('');
    track('pro_activated', {});
    onLicenseChange(await loadLicense());
  }

  async function handleDeactivate() {
    setBusy(true);
    await deactivateAndClear();
    setBusy(false);
    track('pro_deactivated', {});
    onLicenseChange(null);
  }

  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">License</p>
      <div className="rounded-lg border border-gray-100 p-3">
        {license ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span className="font-medium text-green-700">Pro license active</span>
            </div>
            <p className="text-[10px] text-gray-400">Key: {maskLicenseKey(license.key)}</p>
            <button
              onClick={handleDeactivate}
              disabled={busy}
              className="text-[10px] text-red-500 underline hover:text-red-600 disabled:opacity-50"
            >
              Deactivate
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">Free plan — 10 names per session</p>
            <input
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter your license key"
              className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
            />
            {error && <p className="text-[10px] text-red-500">{error}</p>}
            <button
              onClick={handleActivate}
              disabled={busy || !keyInput.trim()}
              className="flex items-center gap-1 rounded bg-[#1D9E75] px-2 py-1 text-[10px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
              Activate
            </button>
            <a
              href={LEMONSQUEEZY_CHECKOUT_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => track('upgrade_clicked', {})}
              className="block text-[10px] font-medium text-[#1D9E75] underline hover:text-[#17805f]"
            >
              Buy Pro — $9.99
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
