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

function parseCSVLine(line: string): string[] {
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
    } else if (ch === ',' && !inQuotes) {
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
        const text = e.target!.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) { resolve([]); return; }

        const headers = parseCSVLine(lines[0]);
        const col = (name: string) =>
          headers.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());

        const nameIdx = col('Company Name');
        if (nameIdx === -1) throw new Error('Missing "Company Name" column');

        const addrIdx = col('Address Line 1');
        const cityIdx = col('City');
        const stateIdx = col('State');
        const countryIdx = col('Country');
        const notesIdx = col('Notes');
        const latIdx = col('Latitude');
        const lngIdx = col('Longitude');

        const customers: Customer[] = lines
          .slice(1)
          .reduce<Customer[]>((acc, line, idx) => {
            const cells = parseCSVLine(line);
            const name = cells[nameIdx]?.trim();
            if (!name) return acc;
            const latRaw = latIdx >= 0 ? parseFloat(cells[latIdx]) : NaN;
            const lngRaw = lngIdx >= 0 ? parseFloat(cells[lngIdx]) : NaN;
            const c: Customer = {
              id: `c_${idx}`,
              name,
              ...(addrIdx >= 0 && cells[addrIdx]?.trim() && { addressLine1: cells[addrIdx].trim() }),
              ...(cityIdx >= 0 && cells[cityIdx]?.trim() && { city: cells[cityIdx].trim() }),
              ...(stateIdx >= 0 && cells[stateIdx]?.trim() && { state: cells[stateIdx].trim() }),
              ...(countryIdx >= 0 && cells[countryIdx]?.trim() && { country: cells[countryIdx].trim() }),
              ...(notesIdx >= 0 && cells[notesIdx]?.trim() && { notes: cells[notesIdx].trim() }),
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
