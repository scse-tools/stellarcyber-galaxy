/**
 * Parses CSV text into rows of string cells. Handles quoted fields (with embedded commas,
 * newlines and doubled "" escapes) and CRLF or LF line endings. Fully blank lines are dropped.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let sawField = false;

  const endField = () => {
    row.push(field);
    field = "";
    sawField = true;
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
    sawField = false;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      endField();
    } else if (char === "\n") {
      endRow();
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || sawField || row.length > 0) endRow();

  return rows.filter((cells) => !(cells.length === 1 && cells[0] === ""));
}
