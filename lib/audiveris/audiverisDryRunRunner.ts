import type { AudiverisInput, AudiverisResult } from "./audiverisTypes";

export type AudiverisDryRunOptions = AudiverisInput & {
  audiverisPath?: string;
  timeoutMs?: number;
};

export type AudiverisDryRunResult = AudiverisResult & {
  command: string[];
};

/**
 * Builds a provisional Audiveris CLI command without accessing the file system
 * or executing an external program. The command shape has not been verified
 * against a real Audiveris installation yet.
 */
export function createAudiverisDryRunCommand(
  options: AudiverisDryRunOptions,
): AudiverisDryRunResult {
  const inputPath = options.inputPath?.trim();
  const outputDir = options.outputDir?.trim();
  const audiverisPath = options.audiverisPath?.trim() || "audiveris";
  const command = inputPath && outputDir
    ? [
        audiverisPath,
        "-batch",
        "-export",
        "-output",
        outputDir,
        inputPath,
      ]
    : [];

  if (!inputPath) {
    return {
      success: false,
      error: "inputPath must be a non-empty string.",
      logs: ["Dry-run validation failed; no command was executed."],
      command,
    };
  }

  if (!outputDir) {
    return {
      success: false,
      error: "outputDir must be a non-empty string.",
      logs: ["Dry-run validation failed; no command was executed."],
      command,
    };
  }

  const logs = [
    "Audiveris dry-run only; no external command was executed.",
    "Command shape is provisional and has not been verified against the real Audiveris CLI.",
  ];

  if (options.timeoutMs !== undefined) {
    logs.push(
      `timeoutMs=${options.timeoutMs} is recorded for the future runner but is not applied during dry-run.`,
    );
  }

  return {
    success: true,
    command,
    logs,
  };
}
