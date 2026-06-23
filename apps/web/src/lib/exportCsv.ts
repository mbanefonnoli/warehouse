import { MatchResult } from '@/types';

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function exportToSpokeCsv(results: MatchResult[]): void {
  const BOM = '﻿';
  const header = 'Name,Address Line 1,Notes';
  const rows = results
    .filter((r) => r.match !== null)
    .map((r) => [csvCell(r.match!.name), csvCell(r.match!.address), ''].join(','));

  const csv = BOM + [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `spoke_route_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyAddresses(results: MatchResult[]): string {
  return results
    .filter((r) => r.match?.address)
    .map((r) => r.match!.address)
    .join('\n');
}
