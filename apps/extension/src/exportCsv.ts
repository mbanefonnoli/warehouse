import type { MatchResult } from '@spoke/shared';

function csvCell(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return '""';
  return `"${String(v).replace(/"/g, '""')}"`;
}

export function formatAddress(match: NonNullable<MatchResult['match']>): string {
  return [match.addressLine1, match.city].filter(Boolean).join(', ');
}

export function buildCsvText(results: MatchResult[], includeAllColumns = false): string {
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
          csvCell(m.name), csvCell(m.addressLine1), csvCell(m.city),
          csvCell(m.state), csvCell(m.country), csvCell(m.notes),
          csvCell(m.lat), csvCell(m.lng),
        ].join(',');
      }
      return [csvCell(m.name), csvCell(m.addressLine1), csvCell(m.city)].join(',');
    });

  return BOM + [header, ...rows].join('\r\n');
}

export function buildAddressesText(results: MatchResult[]): string {
  return results
    .filter((r) => r.match !== null)
    .map((r) => formatAddress(r.match!))
    .filter(Boolean)
    .join('\n');
}
