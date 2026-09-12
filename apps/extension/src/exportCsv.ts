import type { MatchResult } from '@spoke/shared';
import type { CsvDelimiter } from './types';
import type { ZoneGroup } from './zones';

function delimChar(d: CsvDelimiter): string {
  return d === 'semicolon' ? ';' : ',';
}

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

export function buildCsvText(results: MatchResult[], includeAllColumns = false, delimiter: CsvDelimiter = 'comma'): string {
  const d = delimChar(delimiter);
  const BOM = '﻿';
  const header = includeAllColumns
    ? ['Company Name', 'Address Line 1', 'City', 'State', 'Country', 'Notes', 'Latitude', 'Longitude'].join(d)
    : ['Company Name', 'Address Line 1', 'City', 'Latitude', 'Longitude'].join(d);

  const rows = results
    .filter((r) => r.match !== null)
    .map((r) => {
      const m = r.match!;
      if (includeAllColumns) {
        return [
          csvCell(m.name), csvCell(m.addressLine1), csvCell(m.city),
          csvCell(m.state), csvCell(m.country), csvCell(m.notes),
          csvCell(m.lat), csvCell(m.lng),
        ].join(d);
      }
      return [
        csvCell(m.name), csvCell(m.addressLine1), csvCell(m.city),
        csvCell(m.lat), csvCell(m.lng),
      ].join(d);
    });

  return BOM + [header, ...rows].join('\r\n');
}

export function buildCombinedCsvText(groups: ZoneGroup[], includeAllColumns = false, delimiter: CsvDelimiter = 'comma'): string {
  const d = delimChar(delimiter);
  const BOM = '﻿';
  const header = includeAllColumns
    ? ['Zone', 'Company Name', 'Address Line 1', 'City', 'State', 'Country', 'Notes', 'Latitude', 'Longitude'].join(d)
    : ['Zone', 'Company Name', 'Address Line 1', 'City', 'Latitude', 'Longitude'].join(d);

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
          ].join(d);
        }
        return [
          csvCell(zoneName), csvCell(m.name), csvCell(m.addressLine1), csvCell(m.city),
          csvCell(m.lat), csvCell(m.lng),
        ].join(d);
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

export function downloadZoneCsv(zoneName: string, results: MatchResult[], includeAllColumns = false, delimiter: CsvDelimiter = 'comma'): void {
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(buildCsvText(results, includeAllColumns, delimiter), `spoke-bridge-${slugify(zoneName)}-${date}.csv`);
}

export function downloadCombinedCsv(groups: ZoneGroup[], includeAllColumns = false, delimiter: CsvDelimiter = 'comma'): void {
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(buildCombinedCsvText(groups, includeAllColumns, delimiter), `spoke-bridge-all-zones-${date}.csv`);
}
