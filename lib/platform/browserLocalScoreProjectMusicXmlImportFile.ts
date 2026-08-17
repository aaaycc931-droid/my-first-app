import type {
  LocalScoreProjectMusicXmlImportFilePort,
} from "../music/localScoreProjectMusicXmlImportController";
import type {
  LocalScoreProjectMusicXmlImportSourceFormat,
} from "../music/localScoreProjectMusicXmlImport";
import { extractMusicXMLFromMxl } from "../musicxml/mxlExtractor";

type ExtractMxl = (data: Uint8Array) => string;

export const createBrowserLocalScoreProjectMusicXmlImportFilePort = ({
  extractMxl = extractMusicXMLFromMxl,
}: {
  extractMxl?: ExtractMxl;
} = {}): LocalScoreProjectMusicXmlImportFilePort<File> => ({
  read: async (
    file: File,
    sourceFormat: LocalScoreProjectMusicXmlImportSourceFormat,
  ) => sourceFormat === "mxl"
    ? extractMxl(new Uint8Array(await file.arrayBuffer()))
    : file.text(),
});
