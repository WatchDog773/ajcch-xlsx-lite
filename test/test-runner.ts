import { readXlsxMatrix } from "../dist/index.js";
import { readFileSync } from "fs";
import { resolve, dirname, isAbsolute } from "path";
import { fileURLToPath } from "url";

// Necesario en ESM porque __dirname no existe
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  const argPath = process.argv[2];
  const filePath = argPath ? (isAbsolute(argPath) ? argPath : resolve(process.cwd(), argPath)) : resolve(__dirname, "data/prueba.xlsx");

  // Leemos archivo como arrayBuffer
  const fileBuffer = readFileSync(filePath);
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);

  const matrix = await readXlsxMatrix(arrayBuffer);

  console.log(`Resultado del XLSX (${filePath}):`);
  console.log(matrix);
}

run();
