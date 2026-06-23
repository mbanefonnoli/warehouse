'use client';

import { useState } from 'react';
import { Customer, MatchResult, Strings } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle, Search } from 'lucide-react';

interface Props {
  results: MatchResult[];
  allCustomers: Customer[];
  s: Strings;
  onOverride: (inputName: string, customer: Customer) => void;
}

const statusMeta = {
  green: { icon: CheckCircle2, cls: 'text-green-600', rowCls: 'bg-green-50/50 dark:bg-green-950/20' },
  yellow: { icon: AlertCircle, cls: 'text-amber-500', rowCls: 'bg-amber-50/50 dark:bg-amber-950/20' },
  red: { icon: XCircle, cls: 'text-red-500', rowCls: 'bg-red-50/50 dark:bg-red-950/20' },
};

function RedSearch({
  allCustomers,
  inputName,
  placeholder,
  onSelect,
}: {
  allCustomers: Customer[];
  inputName: string;
  placeholder: string;
  onSelect: (c: Customer) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = query.length > 1
    ? allCustomers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1 text-sm">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => { onSelect(c); setQuery(''); }}
            >
              <span className="font-medium">{c.name}</span>
              {c.address && <span className="ml-2 text-muted-foreground">{c.address}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MatchTable({ results, allCustomers, s, onOverride }: Props) {
  if (results.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold">{s.resultsTitle}</h2>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>{s.inputName}</TableHead>
              <TableHead>{s.matchedTo}</TableHead>
              <TableHead className="hidden sm:table-cell">{s.address}</TableHead>
              <TableHead className="w-16 text-right">{s.confidence}</TableHead>
              <TableHead className="w-52">{s.override}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => {
              const meta = statusMeta[r.status];
              const Icon = meta.icon;
              return (
                <TableRow key={r.inputName} className={meta.rowCls}>
                  <TableCell>
                    <Icon className={`h-4 w-4 ${meta.cls}`} />
                  </TableCell>
                  <TableCell className="font-medium">{r.inputName}</TableCell>
                  <TableCell>
                    {r.match ? r.match.name : (
                      <Badge variant="destructive" className="text-xs">{s.noMatch}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {r.match?.address || '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.status !== 'red' || r.match
                      ? `${Math.round(r.confidence * 100)}%`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {r.status === 'yellow' && r.alternatives.length > 0 && (
                      <Select
                        value={r.match?.id ?? ''}
                        onValueChange={(id) => {
                          if (!id) return;
                          const c = allCustomers.find((x) => x.id === id);
                          if (c) onOverride(r.inputName, c);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={s.override} />
                        </SelectTrigger>
                        <SelectContent>
                          {[r.match, ...r.alternatives].filter(Boolean).map((c) => (
                            <SelectItem key={c!.id} value={c!.id} className="text-xs">
                              {c!.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {r.status === 'red' && (
                      <RedSearch
                        allCustomers={allCustomers}
                        inputName={r.inputName}
                        placeholder={s.searchPlaceholder}
                        onSelect={(c) => onOverride(r.inputName, c)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
