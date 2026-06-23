'use client';

import { useEffect, useState } from 'react';
import { Customer, Language, MatchResult, MasterListConfig } from '@/types';
import { loadMasterList } from '@/lib/storage';
import { sanitizeWhatsAppPaste } from '@/lib/sanitize';
import { matchNames } from '@/lib/matcher';
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
  const [cachedConfig, setCachedConfig] = useState<MasterListConfig | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);

  useEffect(() => {
    const saved = loadMasterList();
    if (saved) {
      setCustomers(saved.customers);
      setCachedConfig(saved.config);
    }
  }, []);

  function handleListReady(list: Customer[], config: MasterListConfig) {
    setCustomers(list);
    setCachedConfig(config);
    setResults([]);
  }

  function handleListCleared() {
    setCustomers([]);
    setCachedConfig(null);
    setResults([]);
  }

  function handleMatch(raw: string) {
    if (!raw.trim() || customers.length === 0) return;
    const names = sanitizeWhatsAppPaste(raw);
    const matched = matchNames(names, customers);
    setResults(matched);
  }

  function handleOverride(inputName: string, customer: Customer) {
    setResults((prev) =>
      prev.map((r) =>
        r.inputName === inputName
          ? { ...r, match: customer, status: 'green', confidence: 1, alternatives: [] }
          : r
      )
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
          cachedConfig={cachedConfig}
          cachedCount={customers.length}
          onListReady={handleListReady}
          onListCleared={handleListCleared}
        />

        <NameInput s={s} onMatch={handleMatch} disabled={customers.length === 0} />

        {results.length > 0 && (
          <>
            <ExportBar results={results} s={s} />
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
