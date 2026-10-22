export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export type CsvAssetRow = {
  name: string;
  category: string;
  description: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  purchase_price: string;
  home_location: string;
  notes: string;
  tracking_method: string;
};

const COLUMNS: (keyof CsvAssetRow)[] = [
  "name",
  "category",
  "description",
  "manufacturer",
  "model",
  "serial_number",
  "purchase_date",
  "purchase_price",
  "home_location",
  "notes",
  "tracking_method",
];

export function parseAssetCsv(text: string): { rows: CsvAssetRow[]; error?: string } {
  const table = parseCsv(text);
  if (table.length < 2) {
    return { rows: [], error: "The file needs a header row and at least one asset." };
  }

  const header = table[0].map((column) => column.toLowerCase().replace(/\s+/g, "_"));
  const missing = ["name"].filter((column) => !header.includes(column));
  if (missing.length > 0) {
    return { rows: [], error: "The CSV must include a name column." };
  }

  const rows = table.slice(1).map((cells) => {
    const record = Object.fromEntries(COLUMNS.map((column) => [column, ""])) as CsvAssetRow;
    header.forEach((column, index) => {
      if (column in record) {
        record[column as keyof CsvAssetRow] = cells[index] ?? "";
      }
    });
    return record;
  });

  return { rows: rows.filter((row) => row.name.length > 0) };
}
