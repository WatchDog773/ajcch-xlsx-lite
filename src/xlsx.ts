/*
	Author: Alessandro J. Cardona
	Date: 2025 11 21
	Description: Módulo para parsear archivos .xlsx (Excel) y extraer datos en forma de matriz.
*/

import type { ZipEntry } from "./zip.js";

const textDecoder = new TextDecoder();

const decodeXmlString = (data: Uint8Array): string => textDecoder.decode(data);

const decodeXmlEntities = (value: string): string =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const extractTagContent = (xml: string, tagName: string): { attrs: string; content: string }[] => {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, "g");
  const matches: { attrs: string; content: string }[] = [];
  let match: RegExpExecArray | null = pattern.exec(xml);
  while (match) {
    matches.push({ attrs: match[1], content: match[2] });
    match = pattern.exec(xml);
  }
  return matches;
};

const parseAttributes = (raw: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const pattern = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null = pattern.exec(raw);
  while (match) {
    attrs[match[1]] = match[2];
    match = pattern.exec(raw);
  }
  return attrs;
};

const extractFirstTagValue = (content: string, tagName: string): string => {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`);
  const match = pattern.exec(content);
  return match ? decodeXmlEntities(match[1]) : "";
};

const extractAllTagValues = (content: string, tagName: string): string[] => {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "g");
  const values: string[] = [];
  let match: RegExpExecArray | null = pattern.exec(content);
  while (match) {
    values.push(decodeXmlEntities(match[1]));
    match = pattern.exec(content);
  }
  return values;
};

const columnLettersToIndex = (col: string): number => {
  let result = 0;
  for (let i = 0; i < col.length; i += 1) {
    const charCode = col.charCodeAt(i) - 64;
    result = result * 26 + charCode;
  }
  return result - 1;
};

const extractColumnLetters = (cellRef: string): string => {
  let letters = "";
  for (let i = 0; i < cellRef.length; i += 1) {
    const ch = cellRef[i];
    if (ch >= "A" && ch <= "Z") {
      letters += ch;
    } else if (letters.length > 0) {
      break;
    }
  }
  return letters;
};

export const parseSharedStrings = (entry?: ZipEntry): string[] => {
  if (!entry) return [];

  const xml = decodeXmlString(entry.data);
  const siNodes = extractTagContent(xml, "si");
  const sharedStrings: string[] = [];

  siNodes.forEach((si) => {
    const parts = extractAllTagValues(si.content, "t");
    if (parts.length === 0) {
      sharedStrings.push("");
    } else {
      sharedStrings.push(parts.join(""));
    }
  });

  return sharedStrings;
};

// Parseamos un worksheet XML y lo pasamos a una matriz de strings
export const parseWorksheetToMatrix = (sheetEntry: ZipEntry, sharedStrings: string[]): string[][] => {
  const xml = decodeXmlString(sheetEntry.data);
  const rowNodes = extractTagContent(xml, "row");
  const rows: string[][] = [];

  rowNodes.forEach((rowNode) => {
    const cellNodesPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    const tmpCells: { colIndex: number; value: string }[] = [];
    let maxColIndex = -1;

    let cellMatch: RegExpExecArray | null = cellNodesPattern.exec(rowNode.content);
    while (cellMatch) {
      const cellAttrs = parseAttributes(cellMatch[1]);
      const rAttr = cellAttrs.r ?? "";
      const columnLetters = extractColumnLetters(rAttr);
      const colIndex = columnLettersToIndex(columnLetters);
      if (colIndex > maxColIndex) {
        maxColIndex = colIndex;
      }

      const tAttr = cellAttrs.t ?? "";
      const rawValue = extractFirstTagValue(cellMatch[2], "v");

      let value = "";

      if (tAttr === "s") {
        const index = Number(rawValue);
        value = Number.isNaN(index) ? "" : sharedStrings[index] ?? "";
      } else {
        value = rawValue;
      }

      tmpCells.push({ colIndex, value });
      cellMatch = cellNodesPattern.exec(rowNode.content);
    }

    if (maxColIndex < 0) {
      rows.push([]);
      return;
    }

    const rowArray: string[] = new Array(maxColIndex + 1).fill("");
    tmpCells.forEach((cell) => {
      if (cell.colIndex >= 0 && cell.colIndex < rowArray.length) {
        rowArray[cell.colIndex] = cell.value;
      }
    });

    rows.push(rowArray);
  });

  return rows;
};

// Encuentra una entrada de ZIP por nombre ya sea exacto o lo que contenga una subruta :v
export const findEntry = (entries: ZipEntry[], matcher: (name: string) => boolean): ZipEntry | undefined => entries.find((entry) => matcher(entry.name));
