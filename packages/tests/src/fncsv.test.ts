import { describe, expect, it } from "vitest";
import { jsonToCsv, csvToJson } from "fncsv";

describe("jsonToCsv", () => {
  it("converts simple objects to CSV", () => {
    const result = jsonToCsv([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
    expect(result).toBe("name,age\nAlice,30\nBob,25");
  });

  it("returns empty string for empty array", () => {
    expect(jsonToCsv([])).toBe("");
  });

  it("handles single row", () => {
    const result = jsonToCsv([{ x: 1 }]);
    expect(result).toBe("x\n1");
  });

  it("handles single column", () => {
    const result = jsonToCsv([{ a: 1 }, { a: 2 }, { a: 3 }]);
    expect(result).toBe("a\n1\n2\n3");
  });

  it("omits header when header: false", () => {
    const result = jsonToCsv([{ name: "Alice", age: 30 }], { header: false });
    expect(result).toBe("Alice,30");
  });

  it("uses custom delimiter", () => {
    const result = jsonToCsv([{ a: 1, b: 2 }], { delimiter: ";" });
    expect(result).toBe("a;b\n1;2");
  });

  it("uses tab delimiter", () => {
    const result = jsonToCsv([{ a: 1, b: 2 }], { delimiter: "\t" });
    expect(result).toBe("a\tb\n1\t2");
  });

  it("uses custom EOL", () => {
    const result = jsonToCsv([{ a: 1 }, { a: 2 }], { eol: "\r\n" });
    expect(result).toBe("a\r\n1\r\n2");
  });

  it("selects and orders fields", () => {
    const result = jsonToCsv(
      [{ c: 3, a: 1, b: 2 }],
      { fields: ["b", "a"] },
    );
    expect(result).toBe("b,a\n2,1");
  });

  it("outputs empty value for missing fields", () => {
    const result = jsonToCsv(
      [{ a: 1 }],
      { fields: ["a", "b"] },
    );
    expect(result).toBe("a,b\n1,");
  });

  it("collects all keys across rows with different shapes", () => {
    const result = jsonToCsv([
      { a: 1 },
      { a: 2, b: 3 },
    ]);
    expect(result).toBe("a,b\n1,\n2,3");
  });

  describe("RFC 4180 quoting", () => {
    it("quotes values containing the delimiter", () => {
      const result = jsonToCsv([{ msg: "hello, world" }]);
      expect(result).toBe('msg\n"hello, world"');
    });

    it("quotes and escapes values containing quotes", () => {
      const result = jsonToCsv([{ msg: 'she said "hello"' }]);
      expect(result).toBe('msg\n"she said ""hello"""');
    });

    it("quotes values containing newlines", () => {
      const result = jsonToCsv([{ msg: "line1\nline2" }]);
      expect(result).toBe('msg\n"line1\nline2"');
    });

    it("quotes values containing carriage returns", () => {
      const result = jsonToCsv([{ msg: "line1\r\nline2" }]);
      expect(result).toBe('msg\n"line1\r\nline2"');
    });

    it("uses custom quote character", () => {
      const result = jsonToCsv([{ msg: "hello, world" }], { quote: "'" });
      expect(result).toBe("msg\n'hello, world'");
    });
  });

  describe("null and undefined", () => {
    it("converts null to empty string", () => {
      const result = jsonToCsv([{ a: null as unknown as string }]);
      expect(result).toBe("a\n");
    });

    it("converts undefined to empty string", () => {
      const result = jsonToCsv([{ a: undefined as unknown as string }]);
      expect(result).toBe("a\n");
    });
  });

  describe("nested objects with flatten", () => {
    it("flattens nested objects with dot notation", () => {
      const result = jsonToCsv(
        [{ name: "Alice", address: { city: "NYC", zip: "10001" } }],
        { flatten: true },
      );
      expect(result).toBe("name,address.city,address.zip\nAlice,NYC,10001");
    });

    it("flattens deeply nested objects", () => {
      const result = jsonToCsv(
        [{ a: { b: { c: "deep" } } }],
        { flatten: true },
      );
      expect(result).toBe("a.b.c\ndeep");
    });

    it("preserves arrays when flattening", () => {
      const result = jsonToCsv(
        [{ tags: [1, 2, 3], name: "test" }],
        { flatten: true },
      );
      expect(result).toBe('tags,name\n"[1,2,3]",test');
    });

    it("without flatten, nested objects become JSON", () => {
      const result = jsonToCsv([{ a: { b: 1 } }]);
      expect(result).toBe('a\n"{""b"":1}"');
    });
  });

  describe("arrays in values", () => {
    it("JSON-stringifies arrays", () => {
      const result = jsonToCsv([{ items: [1, 2, 3] }]);
      expect(result).toBe('items\n"[1,2,3]"');
    });

    it("JSON-stringifies string arrays", () => {
      const result = jsonToCsv([{ items: ["a", "b"] }]);
      expect(result).toBe('items\n"[""a"",""b""]"');
    });
  });

  describe("empty values", () => {
    it("handles empty string values", () => {
      const result = jsonToCsv([{ a: "", b: "x" }]);
      expect(result).toBe("a,b\n,x");
    });

    it("handles boolean values", () => {
      const result = jsonToCsv([{ a: true, b: false }]);
      expect(result).toBe("a,b\ntrue,false");
    });

    it("handles numeric zero", () => {
      const result = jsonToCsv([{ a: 0 }]);
      expect(result).toBe("a\n0");
    });
  });

  describe("unicode", () => {
    it("handles unicode characters", () => {
      const result = jsonToCsv([{ name: "日本語", emoji: "🎉" }]);
      expect(result).toBe("name,emoji\n日本語,🎉");
    });
  });
});

describe("csvToJson", () => {
  it("parses simple CSV with header", () => {
    const result = csvToJson("name,age\nAlice,30\nBob,25");
    expect(result).toEqual([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(csvToJson("")).toEqual([]);
  });

  it("handles header-only CSV (no data rows)", () => {
    const result = csvToJson("name,age");
    expect(result).toEqual([]);
  });

  it("parses CSV without header (numeric keys)", () => {
    const result = csvToJson("Alice,30\nBob,25", { header: false });
    expect(result).toEqual([
      { "0": "Alice", "1": "30" },
      { "0": "Bob", "1": "25" },
    ]);
  });

  it("uses custom delimiter", () => {
    const result = csvToJson("a;b\n1;2", { delimiter: ";" });
    expect(result).toEqual([{ a: "1", b: "2" }]);
  });

  it("uses tab delimiter", () => {
    const result = csvToJson("a\tb\n1\t2", { delimiter: "\t" });
    expect(result).toEqual([{ a: "1", b: "2" }]);
  });

  describe("RFC 4180 parsing", () => {
    it("parses quoted fields", () => {
      const result = csvToJson('msg\n"hello, world"');
      expect(result).toEqual([{ msg: "hello, world" }]);
    });

    it("parses escaped quotes", () => {
      const result = csvToJson('msg\n"she said ""hello"""');
      expect(result).toEqual([{ msg: 'she said "hello"' }]);
    });

    it("parses multiline quoted values", () => {
      const result = csvToJson('msg\n"line1\nline2"');
      expect(result).toEqual([{ msg: "line1\nline2" }]);
    });

    it("parses values with carriage returns", () => {
      const result = csvToJson('msg\n"line1\r\nline2"');
      expect(result).toEqual([{ msg: "line1\r\nline2" }]);
    });

    it("handles CRLF line endings", () => {
      const result = csvToJson("a,b\r\n1,2\r\n3,4");
      expect(result).toEqual([
        { a: "1", b: "2" },
        { a: "3", b: "4" },
      ]);
    });

    it("uses custom quote character", () => {
      const result = csvToJson("msg\n'hello, world'", { quote: "'" });
      expect(result).toEqual([{ msg: "hello, world" }]);
    });
  });

  describe("edge cases", () => {
    it("handles single column", () => {
      const result = csvToJson("name\nAlice\nBob");
      expect(result).toEqual([{ name: "Alice" }, { name: "Bob" }]);
    });

    it("handles single row", () => {
      const result = csvToJson("a,b\n1,2");
      expect(result).toEqual([{ a: "1", b: "2" }]);
    });

    it("handles empty values", () => {
      const result = csvToJson("a,b,c\n1,,3");
      expect(result).toEqual([{ a: "1", b: "", c: "3" }]);
    });

    it("handles trailing empty value", () => {
      const result = csvToJson("a,b\n1,");
      expect(result).toEqual([{ a: "1", b: "" }]);
    });

    it("fills missing columns with empty string", () => {
      const result = csvToJson("a,b,c\n1");
      expect(result).toEqual([{ a: "1", b: "", c: "" }]);
    });

    it("handles unicode", () => {
      const result = csvToJson("name\n日本語\n🎉");
      expect(result).toEqual([{ name: "日本語" }, { name: "🎉" }]);
    });
  });
});

describe("round-trip", () => {
  it("converts objects to CSV and back", () => {
    const original = [
      { name: "Alice", age: "30", city: "NYC" },
      { name: "Bob", age: "25", city: "LA" },
    ];
    const csv = jsonToCsv(original);
    const result = csvToJson(csv);
    expect(result).toEqual(original);
  });

  it("round-trips with custom delimiter", () => {
    const original = [
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ];
    const csv = jsonToCsv(original, { delimiter: ";" });
    const result = csvToJson(csv, { delimiter: ";" });
    expect(result).toEqual(original);
  });

  it("round-trips values with commas and quotes", () => {
    const original = [
      { msg: 'hello, "world"', note: "line1\nline2" },
    ];
    const csv = jsonToCsv(original);
    const result = csvToJson(csv);
    expect(result).toEqual(original);
  });
});
