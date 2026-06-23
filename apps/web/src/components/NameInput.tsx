'use client';

import { Strings } from '@/types';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

interface Props {
  s: Strings;
  onMatch: (raw: string) => void;
  disabled: boolean;
}

export default function NameInput({ s, onMatch, disabled }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">{s.inputTitle}</h2>
      <textarea
        id="name-input"
        rows={8}
        placeholder={s.inputPlaceholder}
        className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="mt-3 flex justify-end">
        <Button
          disabled={disabled}
          onClick={() => {
            const el = document.getElementById('name-input') as HTMLTextAreaElement;
            onMatch(el.value);
          }}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          {s.matchBtn}
        </Button>
      </div>
    </section>
  );
}
