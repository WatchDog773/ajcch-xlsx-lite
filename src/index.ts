/*
	Author: Alessandro J. Cardona
	Date: 2025 11 21
	Description: Módulo principal para leer archivos .xlsx y devolver matrices de strings.
*/

import { parseZip } from "./zip.js";
import { findEntry, parseSharedStrings, parseWorksheetToMatrix } from "./xlsx.js";

export type XlsxMatrix = string[][];

export interface ReadXlsxOptions {
  sheetNameContains?: string;
}

// Lee un archivo XLSX y devuelve una matriz de strings.
export const readXlsxMatrix = async (input: File | ArrayBuffer, options?: ReadXlsxOptions): Promise<XlsxMatrix> => {
  const buffer = input instanceof File ? await input.arrayBuffer() : input;

  const entries = await parseZip(buffer);

  const sharedStringsEntry = findEntry(entries, (name: string) => name === "xl/sharedStrings.xml");
  const sheetEntry = findEntry(entries, (name: string) => {
    if (options?.sheetNameContains) {
      return name.startsWith("xl/worksheets/") && name.includes(options.sheetNameContains);
    }
    return name === "xl/worksheets/sheet1.xml";
  });

  if (!sheetEntry) {
    return [];
  }

  const sharedStrings = parseSharedStrings(sharedStringsEntry);
  return parseWorksheetToMatrix(sheetEntry, sharedStrings);
};

// Convierte una matriz de strings en una lista de objetos tipados,
// usando la primera fila como encabezados.
export const mapMatrixToObjects = <T extends object>(matrix: XlsxMatrix, mapper: (row: Record<string, string>) => T): T[] => {
  if (matrix.length === 0) return [];

  const [headerRow, ...dataRows] = matrix;
  const headers = headerRow.map((header) => header.trim());

  const result: T[] = dataRows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = row[index] ?? "";
    });
    return mapper(record);
  });

  return result;
};
