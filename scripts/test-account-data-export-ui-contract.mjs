import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../components/account/AccountPanel.tsx", import.meta.url), "utf8");

for (const required of [
  "loadSupabaseAccountDataExport(client, session.user.id)",
  "browserFileDownloadPort.download",
  "下载账户数据",
  "正在准备导出…",
  "原始素材文件不包含在此 JSON 中",
  "数据导出失败，没有生成不完整文件",
  'aria-live="polite"',
]) {
  assert.ok(source.includes(required), `account export UI must preserve: ${required}`);
}

assert.ok(!source.includes("URL.createObjectURL"), "account UI must keep file download side effects behind the shared port");
assert.ok(!source.includes('.select("*")'), "account UI must not bypass the export field allowlist");

console.log("account data export UI contract tests passed");
