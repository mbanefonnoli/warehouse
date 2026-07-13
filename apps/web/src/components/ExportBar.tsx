'use client';

import { useState } from 'react';
import type { MatchResult } from '@spoke/shared';
import type { Strings } from '@/types';
import { Button } from '@/components/ui/button';
import { exportToSpokeCsv, copyAddresses } from '@/lib/exportCsv';
import { Download, Clipboard, Check } from 'lucide-react';

interface Props {
  results: MatchResult[];
  includeAllColumns: boolean;
  s: Strings;
}

export default function ExportBar({ results, includeAllColumns, s }: Props) {
  const [copied, setCopied] = useState(false);

  const unresolvedCount = results.filter((r) => r.match === null).length;
  const canExport = results.length > 0 && unresolvedCount === 0;

  function handleCopy() {
    const text = copyAddresses(results);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (results.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {results.length} {s.rowCount}
          {unresolvedCount > 0 && (
            <span className="ml-2 font-medium text-amber-500">
              · {unresolvedCount} {s.pendingReview}
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Clipboard className="h-4 w-4" />
            )}
            {copied ? s.copied : s.copyAddresses}
          </Button>
          <Button
            onClick={() => exportToSpokeCsv(results, includeAllColumns)}
            disabled={!canExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {s.downloadCsv}
          </Button>
        </div>
      </div>
    </section>
  );
}
