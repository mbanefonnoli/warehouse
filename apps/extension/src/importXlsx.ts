import type { Customer } from '@spoke/shared';
import { customersFromRows } from './importCsv';

export async function importXlsx(file: File): Promise<Customer[]> {
  // Loaded on demand — SheetJS is large and most imports are plain CSV.
  const { read, utils } = await import('xlsx');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) { resolve([]); return; }

        const sheet = workbook.Sheets[sheetName]!;
        // raw: false formats cells as displayed text (dates, numbers) so
        // downstream parsing matches what a human sees / what CSV export would give.
        const rows: string[][] = utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
        const nonEmptyRows = rows.filter((r) => r.some((cell) => String(cell).trim()));
        if (nonEmptyRows.length < 2) { resolve([]); return; }

        const [headerRow, ...dataRows] = nonEmptyRows;
        resolve(customersFromRows(
          headerRow!.map((h) => String(h).trim()),
          dataRows.map((row) => row.map((cell) => String(cell).trim())),
        ));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
