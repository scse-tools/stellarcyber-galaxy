import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses a simple header + rows", () => {
    expect(parseCsv("a,b,c\n1,2,3\n4,5,6")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles quoted fields with commas and doubled-quote escapes", () => {
    expect(parseCsv('name,note\n"Acme, Inc.","say ""hi"""')).toEqual([
      ["name", "note"],
      ["Acme, Inc.", 'say "hi"'],
    ]);
  });

  it("handles CRLF line endings and a trailing newline", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps empty cells and drops fully blank lines", () => {
    expect(parseCsv("a,b,c\n1,,3\n\n4,5,6")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("preserves newlines inside quoted fields", () => {
    expect(parseCsv('a,b\n"line1\nline2",x')).toEqual([
      ["a", "b"],
      ["line1\nline2", "x"],
    ]);
  });
});
