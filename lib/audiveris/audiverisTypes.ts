export type AudiverisInput = {
  inputPath: string;
  outputDir: string;
};

export type AudiverisResult = {
  success: boolean;
  musicXmlPath?: string;
  mxlPath?: string;
  error?: string;
  logs?: string[];
};
