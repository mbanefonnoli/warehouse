import { describe, expect, it } from 'vitest';
import { utils, write } from 'xlsx';
import { importXlsx } from './importXlsx';

function xlsxFile(rows: (string | number)[][]): File {
  const sheet = utils.aoa_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, 'Sheet1');
  const buf = write(workbook, { type: 'array', bookType: 'xlsx' });
  return new File([buf], 'locations.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('importXlsx', () => {
  it('parses a workbook into customers', async () => {
    const file = xlsxFile([
      ['Company Name', 'City', 'Latitude', 'Longitude'],
      ['Acme Corp', 'Springfield', 44.4268, 26.1025],
      ['Beta LLC', 'Metropolis', 40.7128, -74.006],
    ]);

    const customers = await importXlsx(file);

    expect(customers).toHaveLength(2);
    expect(customers[0]).toMatchObject({ name: 'Acme Corp', city: 'Springfield', lat: 44.4268, lng: 26.1025 });
    expect(customers[1]).toMatchObject({ name: 'Beta LLC', city: 'Metropolis', lat: 40.7128, lng: -74.006 });
  });

  it('skips rows with no name and returns [] for header-only sheets', async () => {
    const withBlank = xlsxFile([
      ['Company Name', 'City'],
      ['', 'Nowhere'],
      ['Real Co', 'Somewhere'],
    ]);
    expect(await importXlsx(withBlank)).toHaveLength(1);

    const headerOnly = xlsxFile([['Company Name', 'City']]);
    expect(await importXlsx(headerOnly)).toEqual([]);
  });

  it('throws when no name/company column is found', async () => {
    const file = xlsxFile([
      ['Foo', 'Bar'],
      ['1', '2'],
    ]);
    await expect(importXlsx(file)).rejects.toThrow(/company\/name column/);
  });
});
