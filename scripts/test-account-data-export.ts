import type { SupabaseClient } from "@supabase/supabase-js";

import {
  accountDataExportSchemaVersion,
  createAccountDataExportPackage,
  getAccountDataExportFileName,
  serializeAccountDataExport,
} from "../lib/account/accountDataExport.js";
import {
  AccountDataExportError,
  loadSupabaseAccountDataExport,
} from "../lib/platform/supabaseAccountDataExport.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

type QueryCall = { table: string; columns: string; ownerColumn: string | null; userId: string | null };

const createFakeClient = (failingTable?: string) => {
  const calls: QueryCall[] = [];
  const client = {
    from(table: string) {
      return {
        select(columns: string) {
          calls.push({ table, columns, ownerColumn: null, userId: null });
          const result = Promise.resolve(failingTable === table
            ? { data: null, error: new Error("blocked") }
            : { data: [{ table }], error: null });
          return {
            then: result.then.bind(result),
            eq(ownerColumn: string, userId: string) {
              const call = calls.at(-1);
              if (call) Object.assign(call, { ownerColumn, userId });
              return result;
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
};

const main = async () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const generatedAt = new Date("2026-08-01T12:34:56.000Z");
  const { client, calls } = createFakeClient();
  const data = await loadSupabaseAccountDataExport(client, userId);

  assert(data.privateAssets[0]?.table === "private_assets", "private asset inventory should be exported");
  assert(data.evaluationResults[0]?.table === "evaluation_results", "owned evaluation results should be exported through RLS");
  assert(calls.length === 12, "every export table should be queried exactly once");
  assert(calls.filter((call) => call.table !== "evaluation_results").every((call) => call.userId === userId), "every direct-owner query should use the active user id");
  assert(calls.find((call) => call.table === "evaluation_results")?.ownerColumn === null, "evaluation ownership should remain enforced by its existing RLS policy");
  assert(calls.every((call) => call.columns !== "*"), "export fields should be explicitly allowlisted");

  const exportPackage = createAccountDataExportPackage({
    account: { id: userId, email: "learner@example.com", createdAt: "2026-01-01T00:00:00.000Z" },
    data,
    generatedAt,
  });
  assert(exportPackage.schemaVersion === accountDataExportSchemaVersion, "export package should be versioned");
  assert(exportPackage.generatedAt === generatedAt.toISOString(), "export package should record generation time");
  assert(exportPackage.assetInventory === data.privateAssets, "asset inventory should reuse the exact owned rows");
  assert(getAccountDataExportFileName(generatedAt) === "music-learning-data-export-2026-08-01.json", "filename should be stable and exclude account identifiers");
  assert(serializeAccountDataExport(exportPackage).endsWith("\n"), "serialized export should have a trailing newline");

  const failing = createFakeClient("analysis_jobs");
  let blocked = false;
  try {
    await loadSupabaseAccountDataExport(failing.client, userId);
  } catch (error) {
    blocked = error instanceof AccountDataExportError && error.table === "analysis_jobs";
  }
  assert(blocked, "a single table failure should block the entire export");

  console.log("account data export tests passed");
};

void main();
