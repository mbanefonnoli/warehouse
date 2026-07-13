'use client';

import { useEffect, useState } from 'react';
import { matchName } from '@spoke/shared';
import type { Customer, MatchResult } from '@spoke/shared';
import type { ImportConfig, Language, Settings } from '@/types';
import { loadMasterList, loadSettings } from '@/lib/storage';
import { sanitizeWhatsAppPaste } from '@/lib/sanitize';
import { en, ro } from '@/lib/strings';
import LanguageToggle from '@/components/LanguageToggle';
import FileUpload from '@/components/FileUpload';
import NameInput from '@/components/NameInput';
import MatchTable from '@/components/MatchTable';
import ExportBar from '@/components/ExportBar';

export default function Home() {
  const [lang, setLang] = useState<Language>('en');
  const s = lang === 'en' ? en : ro;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [importConfig, setImportConfig] = useState<ImportConfig | null>(null);
  const [settings, setSettings] = useState<Settings>({
    matchSensitivity: 'normal',
    stripCompanySuffixes: true,
    includeAllColumns: false,
  });
  const [results, setResults] = useState<MatchResult[]>([]);

  useEffect(() => {
    const saved = loadMasterList();
    if (saved) {
      setCustomers(saved.customers);
      setImportConfig(saved.config);
    }
    setSettings(loadSettings());
  }, []);

  function handleFileReady(list: Customer[], config: ImportConfig) {
    setCustomers(list);
    setImportConfig(config);
    setResults([]);
  }

  function handleCleared() {
    setCustomers([]);
    setImportConfig(null);
    setResults([]);
  }

  function handleSettingsChange(patch: Partial<Settings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
    setResults([]);
  }

  function handleMatch(raw: string) {
    if (!raw.trim() || customers.length === 0) return;
    const names = sanitizeWhatsAppPaste(raw);
    const matched = matchName(names, customers, {
      sensitivity: settings.matchSensitivity,
      stripSuffixes: settings.stripCompanySuffixes,
    });
    setResults(matched);
  }

  function handleOverride(inputName: string, customer: Customer) {
    setResults((prev) =>
      prev.map((r) =>
        r.inputName === inputName
          ? { ...r, match: customer, status: 'green', confidence: 1, alternatives: [], ambiguityReason: undefined }
          : r,
      ),
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{s.title}</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">{s.subtitle}</p>
          </div>
          <LanguageToggle lang={lang} onChange={setLang} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <FileUpload
          s={s}
          customers={customers}
          importConfig={importConfig}
          settings={settings}
          onFileReady={handleFileReady}
          onCleared={handleCleared}
          onSettingsChange={handleSettingsChange}
        />

        <NameInput s={s} onMatch={handleMatch} disabled={customers.length === 0} />

        {results.length > 0 && (
          <>
            <ExportBar
              results={results}
              includeAllColumns={settings.includeAllColumns}
              s={s}
            />
            <MatchTable
              results={results}
              allCustomers={customers}
              s={s}
              onOverride={handleOverride}
            />
          </>
        )}
      </main>
    </div>
  );
}
