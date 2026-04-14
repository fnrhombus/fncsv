export interface JsonToCsvOptions {
  /** Select and order columns (default: all keys from first row) */
  fields?: string[];
  /** Column delimiter (default: ',') */
  delimiter?: string;
  /** Include header row (default: true) */
  header?: boolean;
  /** Line ending (default: '\n') */
  eol?: string;
  /** Flatten nested objects with dot notation (default: false) */
  flatten?: boolean;
  /** Quote character (default: '"') */
  quote?: string;
}

export interface CsvToJsonOptions {
  /** Column delimiter (default: ',') */
  delimiter?: string;
  /** First row is header (default: true) */
  header?: boolean;
  /** Quote character (default: '"') */
  quote?: string;
}

/**
 * Flatten a nested object into dot-notation keys.
 * Arrays are left as-is (they get JSON-stringified later).
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (
      value !== null &&
      value !== undefined &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, fullKey),
      );
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Collect all unique keys from an array of objects, preserving insertion order.
 */
function collectKeys(data: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const row of data) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  return keys;
}

/**
 * Format a single cell value for CSV output (RFC 4180).
 */
function formatCell(value: unknown, delimiter: string, quote: string): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return quoteField(JSON.stringify(value), delimiter, quote);
  if (typeof value === "object") return quoteField(JSON.stringify(value), delimiter, quote);
  const str = String(value);
  return quoteField(str, delimiter, quote);
}

/**
 * Quote a field if it contains the delimiter, quote char, or newlines.
 */
function quoteField(value: string, delimiter: string, quote: string): string {
  if (
    value.includes(delimiter) ||
    value.includes(quote) ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    const escaped = value.replaceAll(quote, quote + quote);
    return quote + escaped + quote;
  }
  return value;
}

/**
 * Convert a JSON array to a CSV string.
 *
 * @example
 * ```ts
 * jsonToCsv([{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }]);
 * // => "name,age\nAlice,30\nBob,25"
 * ```
 */
export function jsonToCsv<T extends Record<string, unknown>>(
  data: T[],
  options: JsonToCsvOptions = {},
): string {
  if (data.length === 0) return "";

  const delimiter = options.delimiter ?? ",";
  const includeHeader = options.header ?? true;
  const eol = options.eol ?? "\n";
  const shouldFlatten = options.flatten ?? false;
  const quote = options.quote ?? '"';

  const rows = shouldFlatten ? data.map((row) => flattenObject(row)) : data;
  const fields = options.fields ?? collectKeys(rows);

  const lines: string[] = [];

  if (includeHeader) {
    lines.push(fields.map((f) => quoteField(f, delimiter, quote)).join(delimiter));
  }

  for (const row of rows) {
    const cells = fields.map((field) => {
      const value = getNestedValue(row, field);
      return formatCell(value, delimiter, quote);
    });
    lines.push(cells.join(delimiter));
  }

  return lines.join(eol);
}

/**
 * Get a value from an object, supporting dot-notation paths.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (path in obj) return obj[path];
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Parse a CSV string into rows of fields, respecting RFC 4180 quoting.
 */
function parseCsv(csv: string, delimiter: string, quote: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let fields: string[] = [];
  let i = 0;

  while (i < csv.length) {
    const ch = csv[i];

    if (inQuotes) {
      if (ch === quote) {
        // Check for escaped quote (doubled)
        if (i + 1 < csv.length && csv[i + 1] === quote) {
          current += quote;
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === quote) {
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        fields.push(current);
        current = "";
        i++;
      } else if (ch === "\r") {
        // Handle \r\n and bare \r
        fields.push(current);
        current = "";
        rows.push(fields);
        fields = [];
        i++;
        if (i < csv.length && csv[i] === "\n") i++;
      } else if (ch === "\n") {
        fields.push(current);
        current = "";
        rows.push(fields);
        fields = [];
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }

  // Push the last field/row if there's content
  if (current.length > 0 || fields.length > 0) {
    fields.push(current);
    rows.push(fields);
  }

  return rows;
}

/**
 * Convert a CSV string to a JSON array.
 *
 * @example
 * ```ts
 * csvToJson("name,age\nAlice,30\nBob,25");
 * // => [{ name: "Alice", age: "30" }, { name: "Bob", age: "25" }]
 * ```
 */
export function csvToJson<
  T extends Record<string, unknown> = Record<string, string>,
>(csv: string, options: CsvToJsonOptions = {}): T[] {
  const delimiter = options.delimiter ?? ",";
  const hasHeader = options.header ?? true;
  const quote = options.quote ?? '"';

  const rows = parseCsv(csv, delimiter, quote);
  if (rows.length === 0) return [];

  if (hasHeader) {
    const headers = rows[0];
    return rows.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        obj[headers[i]] = row[i] ?? "";
      }
      return obj as T;
    });
  }

  // Without headers, use numeric indices as keys
  return rows.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < row.length; i++) {
      obj[String(i)] = row[i];
    }
    return obj as T;
  });
}
