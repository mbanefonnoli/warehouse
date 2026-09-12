import type { Customer } from '@spoke/shared';
import { customersFromRows } from './importCsv';

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

async function readWorkbook(file: File) {
  // Loaded on demand — SheetJS is large and most imports are plain CSV.
  const { read } = await import('xlsx');
  const buf = await readFileAsArrayBuffer(file);
  return read(new Uint8Array(buf), { type: 'array' });
}

export async function listXlsxSheets(file: File): Promise<string[]> {
  const workbook = await readWorkbook(file);
  return workbook.SheetNames;
}

export async function importXlsx(file: File, sheetName?: string): Promise<Customer[]> {
  const { utils } = await import('xlsx');
  const workbook = await readWorkbook(file);
  const name = sheetName ?? workbook.SheetNames[0];
  if (!name) return [];

  const sheet = workbook.Sheets[name];
  if (!sheet) return [];

  // raw: false formats cells as displayed text (dates, numbers) so
  // downstream parsing matches what a human sees / what CSV export would give.
  const rows: string[][] = utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  const nonEmptyRows = rows.filter((r) => r.some((cell) => String(cell).trim()));
  if (nonEmptyRows.length < 2) return [];

  const [headerRow, ...dataRows] = nonEmptyRows;
  return customersFromRows(
    headerRow!.map((h) => String(h).trim()),
    dataRows.map((row) => row.map((cell) => String(cell).trim())),
  );
}
