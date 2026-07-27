import { strToU8, zipSync } from "fflate";

export const MUSICXML_MIME_TYPE =
  "application/vnd.recordare.musicxml+xml" as const;
export const MXL_MIME_TYPE =
  "application/vnd.recordare.musicxml" as const;
export const MXL_ROOTFILE_PATH = "score.musicxml" as const;

const deterministicZipDate = new Date(1980, 0, 1, 0, 0, 0);

const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container>
  <rootfiles>
    <rootfile full-path="${MXL_ROOTFILE_PATH}" media-type="${MUSICXML_MIME_TYPE}"/>
  </rootfiles>
</container>
`;

/**
 * Creates a deterministic compressed MusicXML archive. Callers remain
 * responsible for applying their product-level input/output size limits.
 */
export const createMusicXmlMxlArchive = (xml: string): Uint8Array =>
  zipSync({
    mimetype: [
      strToU8(MXL_MIME_TYPE),
      { level: 0, mtime: deterministicZipDate },
    ],
    "META-INF/container.xml": [
      strToU8(containerXml),
      { level: 9, mtime: deterministicZipDate },
    ],
    [MXL_ROOTFILE_PATH]: [
      strToU8(xml),
      { level: 9, mtime: deterministicZipDate },
    ],
  }, {
    level: 9,
    mtime: deterministicZipDate,
  });
