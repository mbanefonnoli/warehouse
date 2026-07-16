import type { Customer } from '@spoke/shared';

export const CSV_COLUMNS = [
  'Company Name',
  'Address Line 1',
  'City',
  'State',
  'Country',
  'Notes',
  'Latitude',
  'Longitude',
] as const;

function parseCSVLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

export function importCsv(file: File): Promise<Customer[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Strip UTF-8 BOM if present — it corrupts the first column header.
        const raw = (e.target!.result as string).replace(/^﻿/, '');
        const lines = raw.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) { resolve([]); return; }

        // Auto-detect delimiter: Romanian-locale Excel uses semicolons.
        const headerLine = lines[0];
        const commas     = (headerLine.match(/,/g) ?? []).length;
        const semicolons = (headerLine.match(/;/g) ?? []).length;
        const delimiter  = semicolons > commas ? ';' : ',';

        const headers = parseCSVLine(headerLine, delimiter);

        // Normalize: lowercase, collapse non-alphanumeric runs to a space.
        const norm = (s: string) =>
          s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

        // Substring match — keyword can appear anywhere in the header.
        // Safe for long keywords (e.g. "company name") where false positives are unlikely.
        const colIncludes = (...keywords: string[]) =>
          headers.findIndex((h) => {
            const n = norm(h);
            return keywords.some((kw) => n === norm(kw) || n.includes(norm(kw)));
          });

        // Prefix match — header must START with the keyword.
        // Used for short keywords like "lat"/"lon" that appear inside many Romanian words
        // (e.g. "relatie", "plata") and would cause false positives with substring matching.
        const colPrefix = (...keywords: string[]) =>
          headers.findIndex((h) => {
            const n = norm(h);
            return keywords.some((kw) => {
              const nkw = norm(kw);
              return n === nkw || n.startsWith(nkw);
            });
          });

        const nameIdx    = colIncludes('company name', 'company', 'denumire', 'nume firma', 'name');
        if (nameIdx === -1) throw new Error(
          'Could not find a company/name column. ' +
          `Headers found: ${headers.join(', ')}`
        );

        const addrIdx    = colIncludes('address line 1', 'addres line 1', 'addr line 1', 'address 1', 'adresa', 'strada', 'line 1');
        const cityIdx    = colIncludes('city', 'oras', 'localitate', 'town');
        const stateIdx   = colIncludes('state', 'judet', 'provincia', 'province', 'region');
        const countryIdx = colIncludes('country', 'tara');
        const notesIdx   = colIncludes('notes', 'note', 'observatii', 'mentiuni');
        const latIdx     = colPrefix('latitude', 'latitutde', 'latitudine');
        const lngIdx     = colPrefix('longitude', 'longitutde', 'longitudine', 'lng', 'lon', 'long');

        const customers: Customer[] = lines
          .slice(1)
          .reduce<Customer[]>((acc, line, idx) => {
            const cells = parseCSVLine(line, delimiter);
            const name = cells[nameIdx]?.trim();
            if (!name) return acc;
            const latRaw = latIdx >= 0 ? parseFloat(cells[latIdx]!.replace(',', '.')) : NaN;
            const lngRaw = lngIdx >= 0 ? parseFloat(cells[lngIdx]!.replace(',', '.')) : NaN;
            const c: Customer = {
              id: `c_${idx}`,
              name,
              ...(addrIdx    >= 0 && cells[addrIdx]?.trim()    && { addressLine1: cells[addrIdx]!.trim() }),
              ...(cityIdx    >= 0 && cells[cityIdx]?.trim()    && { city:         cells[cityIdx]!.trim() }),
              ...(stateIdx   >= 0 && cells[stateIdx]?.trim()   && { state:        cells[stateIdx]!.trim() }),
              ...(countryIdx >= 0 && cells[countryIdx]?.trim() && { country:      cells[countryIdx]!.trim() }),
              ...(notesIdx   >= 0 && cells[notesIdx]?.trim()   && { notes:        cells[notesIdx]!.trim() }),
              ...(!isNaN(latRaw) && { lat: latRaw }),
              ...(!isNaN(lngRaw) && { lng: lngRaw }),
            };
            acc.push(c);
            return acc;
          }, []);

        resolve(customers);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, 'utf-8');
  });
}
