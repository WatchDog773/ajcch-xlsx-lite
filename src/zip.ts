/*
	Author: Alessandro J. Cardona
	Date: 2025 11 21
	Description: Módulo para parsear archivos .zip y extraer entradas descomprimidas.
*/
export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

interface CentralDirectoryEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
}

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50; // 0x50 0x4b 0x03 0x04
const CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50; // 0x50 0x4b 0x01 0x02
const END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50; // 0x50 0x4b 0x05 0x06

const getUint32LE = (view: DataView, offset: number): number => view.getUint32(offset, true);

const getUint16LE = (view: DataView, offset: number): number => view.getUint16(offset, true);

const decodeFilename = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

// Descomprimimos un bloque defalte. En navegador usamos la api nativa
const decompressDeflate = async (data: Uint8Array): Promise<Uint8Array> => {
  if (typeof DecompressionStream !== "undefined") {
    try {
      const ds = new DecompressionStream("deflate-raw");
      const compressedStream = new Blob([data.slice().buffer as ArrayBuffer]).stream();
      const decompressedStream = compressedStream.pipeThrough(ds);
      const buffer = await new Response(decompressedStream).arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      console.log("Ocurrio un error contacte con el creador");
    }
  }

  const { inflateRawSync } = await import("node:zlib");
  const inflated = inflateRawSync(data);
  return inflated instanceof Uint8Array ? new Uint8Array(inflated.buffer, inflated.byteOffset, inflated.byteLength) : new Uint8Array(inflated);
};

const findEndOfCentralDirOffset = (view: DataView, bytes: Uint8Array): number => {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (getUint32LE(view, offset) === END_OF_CENTRAL_DIR_SIGNATURE) {
      return offset;
    }
  }
  return -1;
};

const parseCentralDirectory = (view: DataView, bytes: Uint8Array): CentralDirectoryEntry[] => {
  const eocdOffset = findEndOfCentralDirOffset(view, bytes);
  if (eocdOffset < 0) {
    return [];
  }

  const centralDirOffset = getUint32LE(view, eocdOffset + 16);
  const totalEntries = getUint16LE(view, eocdOffset + 10);
  const entries: CentralDirectoryEntry[] = [];

  let offset = centralDirOffset;
  for (let i = 0; i < totalEntries; i += 1) {
    const signature = getUint32LE(view, offset);
    if (signature !== CENTRAL_FILE_HEADER_SIGNATURE) {
      break;
    }

    const compressionMethod = getUint16LE(view, offset + 10);
    const compressedSize = getUint32LE(view, offset + 20);
    const fileNameLength = getUint16LE(view, offset + 28);
    const extraFieldLength = getUint16LE(view, offset + 30);
    const fileCommentLength = getUint16LE(view, offset + 32);
    const localHeaderOffset = getUint32LE(view, offset + 42);

    const fileNameStart = offset + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    const nameBytes = bytes.slice(fileNameStart, fileNameEnd);

    entries.push({
      name: decodeFilename(nameBytes),
      compressionMethod,
      compressedSize,
      localHeaderOffset,
    });

    offset = fileNameEnd + extraFieldLength + fileCommentLength;
  }

  return entries;
};

// Parsea el arraybuffer de un archivo .zip y devuelve las entradas
// descomprimidas (solo para entradas deflate).
export const parseZip = async (buffer: ArrayBuffer): Promise<ZipEntry[]> => {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const entries: ZipEntry[] = [];

  const centralDirectoryEntries = parseCentralDirectory(view, bytes);

  if (centralDirectoryEntries.length === 0) {
    return entries;
  }

  for (const item of centralDirectoryEntries) {
    if (item.localHeaderOffset + 30 > buffer.byteLength) {
      continue;
    }

    const signature = getUint32LE(view, item.localHeaderOffset);
    if (signature !== LOCAL_FILE_HEADER_SIGNATURE) {
      continue;
    }

    const fileNameLength = getUint16LE(view, item.localHeaderOffset + 26);
    const extraFieldLength = getUint16LE(view, item.localHeaderOffset + 28);
    const dataStart = item.localHeaderOffset + 30 + fileNameLength + extraFieldLength;
    const dataEnd = dataStart + item.compressedSize;

    const compressedData = bytes.slice(dataStart, dataEnd);

    let decompressedData: Uint8Array;

    if (item.compressionMethod === 0) {
      decompressedData = compressedData;
    } else if (item.compressionMethod === 8) {
      decompressedData = await decompressDeflate(compressedData);
    } else {
      decompressedData = new Uint8Array(0);
    }

    entries.push({
      name: item.name,
      data: decompressedData,
    });
  }

  return entries;
};
