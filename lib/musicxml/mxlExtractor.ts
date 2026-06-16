import { strFromU8, unzipSync } from "fflate";

const MAX_MXL_ENTRY_COUNT = 100;
const MAX_EXTRACTED_MUSICXML_SIZE_BYTES = 4 * 1024 * 1024;
const musicXMLSignaturePattern = /<score-(?:partwise|timewise)\b/i;

export function looksLikeMusicXML(xml: string): boolean {
  return musicXMLSignaturePattern.test(xml);
}

function validateRootfilePath(path: string): string {
  const trimmedPath = path.trim();

  if (!trimmedPath) {
    throw new Error(".mxl container.xml 中的 rootfile full-path 不能为空。");
  }

  if (trimmedPath.startsWith("/") || /^[A-Za-z]:/.test(trimmedPath)) {
    throw new Error(".mxl container.xml 中的 rootfile full-path 不能是绝对路径。");
  }

  if (trimmedPath.includes("\\")) {
    throw new Error(".mxl container.xml 中的 rootfile full-path 不能包含反斜杠路径逃逸。");
  }

  if (trimmedPath.split("/").includes("..")) {
    throw new Error(".mxl container.xml 中的 rootfile full-path 不能包含 .. 路径穿越。");
  }

  return trimmedPath;
}

function readEntryAsText(entries: Record<string, Uint8Array>, path: string): string {
  const entry = entries[path];

  if (!entry) {
    throw new Error(`.mxl container.xml 指向的 MusicXML 文件不存在：${path}`);
  }

  if (entry.byteLength > MAX_EXTRACTED_MUSICXML_SIZE_BYTES) {
    throw new Error(".mxl 内部 MusicXML 太大，解压后最大支持 4 MB。");
  }

  return strFromU8(entry);
}

function getRootfilePath(containerXml: string): string | undefined {
  return containerXml.match(/<rootfile\b[^>]*\bfull-path\s*=\s*["']([^"']+)["'][^>]*>/i)?.[1];
}

function extractFromContainer(entries: Record<string, Uint8Array>): string | undefined {
  const containerEntry = entries["META-INF/container.xml"];

  if (!containerEntry) return undefined;

  const containerXml = strFromU8(containerEntry);
  const rootfilePath = getRootfilePath(containerXml);

  if (!rootfilePath) {
    throw new Error(".mxl 的 META-INF/container.xml 缺少 rootfile full-path。");
  }

  const xml = readEntryAsText(entries, validateRootfilePath(rootfilePath));

  if (!looksLikeMusicXML(xml)) {
    throw new Error(".mxl container.xml 指向的文件不像 MusicXML，需包含 <score-partwise> 或 <score-timewise>。");
  }

  return xml;
}

function extractByFallback(entries: Record<string, Uint8Array>): string {
  for (const [path, data] of Object.entries(entries)) {
    const lowerPath = path.toLowerCase();

    if (
      lowerPath.startsWith("meta-inf/") ||
      (!lowerPath.endsWith(".xml") && !lowerPath.endsWith(".musicxml"))
    ) {
      continue;
    }

    if (data.byteLength > MAX_EXTRACTED_MUSICXML_SIZE_BYTES) {
      throw new Error(".mxl 内部 MusicXML 太大，解压后最大支持 4 MB。");
    }

    const xml = strFromU8(data);
    if (looksLikeMusicXML(xml)) return xml;
  }

  throw new Error(".mxl 结构不符合预期：未找到 META-INF/container.xml，也没有可识别的 MusicXML XML entry。");
}

export function extractMusicXMLFromMxl(data: Uint8Array): string {
  const entries = unzipSync(data);
  const entryCount = Object.keys(entries).length;

  if (entryCount > MAX_MXL_ENTRY_COUNT) {
    throw new Error(".mxl zip entry 过多，当前最多支持 100 个 entry。");
  }

  return extractFromContainer(entries) ?? extractByFallback(entries);
}
