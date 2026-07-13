import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, ArrowLeft } from 'lucide-react';
import type { Customer } from '@spoke/shared';
import type { ImportConfig, Settings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { loadMasterList, loadSettings } from './storage';
import MatchView from './components/MatchView';
import SettingsView from './components/SettingsView';

type View = 'match' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('match');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [importConfig, setImportConfig] = useState<ImportConfig | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadMasterList().then((saved) => {
      if (saved) {
        setCustomers(saved.customers);
        setImportConfig(saved.config);
      }
    });
    loadSettings().then(setSettings);
  }, []);

  function handleFileReady(list: Customer[], config: ImportConfig) {
    setCustomers(list);
    setImportConfig(config);
    setView('match');
  }

  function handleCleared() {
    setCustomers([]);
    setImportConfig(null);
  }

  function handleSettingsChange(patch: Partial<Settings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="flex w-[400px] flex-col bg-white" style={{ minHeight: 200 }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
        <div className="flex items-center gap-2">
          {view === 'settings' && (
            <button
              onClick={() => setView('match')}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span className="text-sm font-semibold" style={{ color: '#1D9E75' }}>
            Spoke Route Bridge
          </span>
        </div>
        {view === 'match' && (
          <button
            onClick={() => setView('settings')}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        )}
      </header>

      {/* Body */}
      {view === 'match' ? (
        <MatchView customers={customers} settings={settings} />
      ) : (
        <SettingsView
          customers={customers}
          importConfig={importConfig}
          settings={settings}
          onFileReady={handleFileReady}
          onCleared={handleCleared}
          onSettingsChange={handleSettingsChange}
        />
      )}
    </div>
  );
}
