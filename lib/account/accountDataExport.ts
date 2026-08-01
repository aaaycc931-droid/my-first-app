export const accountDataExportSchemaVersion = 1 as const;

export type AccountDataExportRows = Readonly<Record<string, unknown>>;

export type AccountDataExportDataset = Readonly<{
  profiles: ReadonlyArray<AccountDataExportRows>;
  ownedExercises: ReadonlyArray<AccountDataExportRows>;
  practiceSessions: ReadonlyArray<AccountDataExportRows>;
  practiceAttempts: ReadonlyArray<AccountDataExportRows>;
  evaluationResults: ReadonlyArray<AccountDataExportRows>;
  skillProgress: ReadonlyArray<AccountDataExportRows>;
  reviewQueue: ReadonlyArray<AccountDataExportRows>;
  privateAssets: ReadonlyArray<AccountDataExportRows>;
  analysisJobs: ReadonlyArray<AccountDataExportRows>;
  notationDrafts: ReadonlyArray<AccountDataExportRows>;
  consentRecords: ReadonlyArray<AccountDataExportRows>;
  deletionRequests: ReadonlyArray<AccountDataExportRows>;
}>;

export type AccountDataExportPackage = Readonly<{
  schemaVersion: typeof accountDataExportSchemaVersion;
  generatedAt: string;
  account: Readonly<{
    id: string;
    email: string | null;
    createdAt: string | null;
  }>;
  data: AccountDataExportDataset;
  assetInventory: ReadonlyArray<AccountDataExportRows>;
}>;

export const createAccountDataExportPackage = (input: Readonly<{
  account: AccountDataExportPackage["account"];
  data: AccountDataExportDataset;
  generatedAt: Date;
}>): AccountDataExportPackage => ({
  schemaVersion: accountDataExportSchemaVersion,
  generatedAt: input.generatedAt.toISOString(),
  account: input.account,
  data: input.data,
  assetInventory: input.data.privateAssets,
});

export const serializeAccountDataExport = (
  exportPackage: AccountDataExportPackage,
): string => `${JSON.stringify(exportPackage, null, 2)}\n`;

export const getAccountDataExportFileName = (generatedAt: Date): string =>
  `music-learning-data-export-${generatedAt.toISOString().slice(0, 10)}.json`;
