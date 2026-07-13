import type { MatchResult } from '@spoke/shared';

function csvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function formatAddress(match: NonNullable<MatchResult['match']>): string {
  return [match.addressLine1, match.city].filter(Boolean).join(', ');
}

export function exportToSpokeCsv(results: MatchResult[], includeAllColumns = false): void {
  const BOM = '﻿';
  const header = includeAllColumns
    ? 'Company Name,Address Line 1,City,State,Country,Notes,Latitude,Longitude'
    : 'Company Name,Address Line 1,City';

  const rows = results
    .filter((r) => r.match !== null)
    .map((r) => {
      const m = r.match!;
      if (includeAllColumns) {
        return [
          csvCell(m.name),
          csvCell(m.addressLine1),
          csvCell(m.city),
          csvCell(m.state),
          csvCell(m.country),
          csvCell(m.notes),
          csvCell(m.lat),
          csvCell(m.lng),
        ].join(',');
      }
      return [csvCell(m.name), csvCell(m.addressLine1), csvCell(m.city)].join(',');
    });

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
    .filter((r) => r.match !== null)
    .map((r) => formatAddress(r.match!))
    .filter(Boolean)
    .join('\n');
}
