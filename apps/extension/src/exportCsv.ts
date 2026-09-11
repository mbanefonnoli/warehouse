import type { MatchResult } from '@spoke/shared';
import type { ZoneGroup } from './zones';

function csvCell(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number') return String(v);
  return `"${v.replace(/"/g, '""')}"`;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function triggerDownload(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatAddress(match: NonNullable<MatchResult['match']>): string {
  return [match.addressLine1, match.city].filter(Boolean).join(', ');
}

export function buildCsvText(results: MatchResult[], includeAllColumns = false): string {
  const BOM = '﻿';
  const header = includeAllColumns
    ? 'Company Name,Address Line 1,City,State,Country,Notes,Latitude,Longitude'
    : 'Company Name,Address Line 1,City,Latitude,Longitude';

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
      return [
        csvCell(m.name), csvCell(m.addressLine1), csvCell(m.city),
        csvCell(m.lat), csvCell(m.lng),
      ].join(',');
    });

  return BOM + [header, ...rows].join('\r\n');
}

export function buildCombinedCsvText(groups: ZoneGroup[], includeAllColumns = false): string {
  const BOM = '﻿';
  const header = includeAllColumns
    ? 'Zone,Company Name,Address Line 1,City,State,Country,Notes,Latitude,Longitude'
    : 'Zone,Company Name,Address Line 1,City,Latitude,Longitude';

  const rows = groups.flatMap(({ zoneName, results }) =>
    results
      .filter((r) => r.match !== null)
      .map((r) => {
        const m = r.match!;
        if (includeAllColumns) {
          return [
            csvCell(zoneName), csvCell(m.name), csvCell(m.addressLine1), csvCell(m.city),
            csvCell(m.state), csvCell(m.country), csvCell(m.notes),
            csvCell(m.lat), csvCell(m.lng),
          ].join(',');
        }
        return [
          csvCell(zoneName), csvCell(m.name), csvCell(m.addressLine1), csvCell(m.city),
          csvCell(m.lat), csvCell(m.lng),
        ].join(',');
      }),
  );

  return BOM + [header, ...rows].join('\r\n');
}

export function buildAddressesText(results: MatchResult[]): string {
  return results
    .filter((r) => r.match !== null)
    .map((r) => formatAddress(r.match!))
    .filter(Boolean)
    .join('\n');
}

export function downloadCsvFile(results: MatchResult[], includeAllColumns = false): void {
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(buildCsvText(results, includeAllColumns), `spoke-routes-${date}.csv`);
}

export function downloadZoneCsv(zoneName: string, results: MatchResult[], includeAllColumns = false): void {
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(buildCsvText(results, includeAllColumns), `spoke-bridge-${slugify(zoneName)}-${date}.csv`);
}

export function downloadCombinedCsv(groups: ZoneGroup[], includeAllColumns = false): void {
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(buildCombinedCsvText(groups, includeAllColumns), `spoke-bridge-all-zones-${date}.csv`);
}
