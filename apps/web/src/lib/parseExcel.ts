import * as XLSX from 'xlsx';
import { Customer } from '@/types';

export interface ParsedWorkbook {
  sheetNames: string[];
  sheets: Record<string, Record<string, string>[]>;
}

export function parseFile(file: File): Promise<ParsedWorkbook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheets: Record<string, Record<string, string>[]> = {};
        workbook.SheetNames.forEach((name) => {
          const sheet = workbook.Sheets[name];
          sheets[name] = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
            defval: '',
            raw: false,
          });
        });
        resolve({ sheetNames: workbook.SheetNames, sheets });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function getHeaders(rows: Record<string, string>[]): string[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]);
}

export function extractCustomers(
  rows: Record<string, string>[],
  nameCol: string,
  addressCol: string
): Customer[] {
  return rows
    .filter((row) => row[nameCol]?.trim())
    .map((row, idx) => ({
      id: `c_${idx}`,
      name: row[nameCol].trim(),
      address: (row[addressCol] ?? '').trim(),
      sourceRow: idx + 2,
    }));
}
