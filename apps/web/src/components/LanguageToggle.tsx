'use client';

import { Language } from '@/types';

interface Props {
  lang: Language;
  onChange: (lang: Language) => void;
}

export default function LanguageToggle({ lang, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border p-0.5 text-sm font-medium">
      <button
        onClick={() => onChange('en')}
        className={`rounded-full px-3 py-0.5 transition-colors ${
          lang === 'en'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => onChange('ro')}
        className={`rounded-full px-3 py-0.5 transition-colors ${
          lang === 'ro'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        RO
      </button>
    </div>
  );
}
