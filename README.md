# fncsv

**JSON to CSV and back. No drama.**

[![npm version](https://img.shields.io/npm/v/fncsv)](https://www.npmjs.com/package/fncsv)
[![bundle size](https://img.shields.io/bundlephobia/minzip/fncsv)](https://bundlephobia.com/package/fncsv)
[![license](https://img.shields.io/npm/l/fncsv)](https://github.com/fnrhombus/fncsv/blob/main/LICENSE)

```ts
import { jsonToCsv, csvToJson } from "fncsv";

const csv = jsonToCsv([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
]);
// => "name,age\nAlice,30\nBob,25"

const data = csvToJson(csv);
// => [{ name: "Alice", age: "30" }, { name: "Bob", age: "25" }]
```

## The problem

[json2csv](https://www.npmjs.com/package/json2csv) has 1.6M weekly downloads and is abandoned. The maintainer split it into scoped packages (`@json2csv/plainjs`, `@json2csv/node`, etc.) that nobody can find. `csv-stringify` is callback-oriented and overkill for "I have objects, give me CSV." You just want `jsonToCsv(data)`.

**fncsv** is:
- TypeScript-first with full type inference
- RFC 4180 compliant (proper quoting, escaping, multiline values)
- Zero dependencies
- Under 4KB minified + gzipped
- ESM + CJS dual publish

## Examples

### Nested objects

```ts
const csv = jsonToCsv(
  [{ name: "Alice", address: { city: "NYC", zip: "10001" } }],
  { flatten: true }
);
// => "name,address.city,address.zip\nAlice,NYC,10001"
```

### Custom delimiter

```ts
const csv = jsonToCsv(
  [{ name: "Alice", age: 30 }],
  { delimiter: ";" }
);
// => "name;age\nAlice;30"
```

### Field selection

```ts
const csv = jsonToCsv(
  [{ id: 1, name: "Alice", email: "alice@example.com", age: 30 }],
  { fields: ["name", "email"] }
);
// => "name,email\nAlice,alice@example.com"
```

### Parse CSV back to JSON

```ts
const data = csvToJson("name;age\nAlice;30", { delimiter: ";" });
// => [{ name: "Alice", age: "30" }]
```

## Comparison

| Feature | fncsv | json2csv | @json2csv/plainjs | csv-stringify |
|---|---|---|---|---|
| Zero dependencies | ✅ | ❌ | ❌ | ❌ |
| TypeScript-first | ✅ | ❌ | ✅ | ❌ |
| ESM + CJS | ✅ | ❌ | ✅ | ✅ |
| CSV to JSON | ✅ | ❌ | ❌ | ❌ |
| Maintained | ✅ | ❌ | ❌ | ✅ |
| Bundle size | <4KB | 25KB+ | 15KB+ | 30KB+ |
| One function call | ✅ | ❌ | ❌ | ❌ |

## API

### `jsonToCsv(data, options?)`

Convert an array of objects to a CSV string.

| Option | Type | Default | Description |
|---|---|---|---|
| `fields` | `string[]` | all keys | Select and order columns |
| `delimiter` | `string` | `","` | Column delimiter |
| `header` | `boolean` | `true` | Include header row |
| `eol` | `string` | `"\n"` | Line ending |
| `flatten` | `boolean` | `false` | Flatten nested objects with dot notation |
| `quote` | `string` | `"\""` | Quote character |

### `csvToJson(csv, options?)`

Parse a CSV string into an array of objects.

| Option | Type | Default | Description |
|---|---|---|---|
| `delimiter` | `string` | `","` | Column delimiter |
| `header` | `boolean` | `true` | First row is header |
| `quote` | `string` | `"\""` | Quote character |

When `header` is `false`, keys are numeric indices (`"0"`, `"1"`, ...).

## Support

If fncsv saves you time, consider supporting development:

- [GitHub Sponsors](https://github.com/sponsors/fnrhombus)
- [Buy Me a Coffee](https://buymeacoffee.com/fnrhombus)

## License

[MIT](LICENSE)
