import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const manifestSource = readFileSync("app/manifest.ts", "utf8");
const layoutSource = readFileSync("app/layout.tsx", "utf8");
const registrationSource = readFileSync(
  "components/platform/ServiceWorkerRegistration.tsx",
  "utf8",
);
const serviceWorkerSource = readFileSync("public/sw.js", "utf8");
const offlineSource = readFileSync("public/offline.html", "utf8");

for (const required of [
  'start_url: "/home?source=android"',
  'scope: "/"',
  'display: "standalone"',
  'purpose: "maskable"',
  'sizes: "192x192"',
  'sizes: "512x512"',
]) {
  assert.ok(manifestSource.includes(required), `manifest is missing ${required}`);
}

assert.match(layoutSource, /manifest:\s*"\/manifest\.webmanifest"/);
assert.match(layoutSource, /viewportFit:\s*"cover"/);
assert.match(registrationSource, /navigator\.serviceWorker\.register\("\/sw\.js"/);
assert.match(serviceWorkerSource, /request\.mode === "navigate"/);
assert.match(serviceWorkerSource, /caches\.match\("\/offline\.html"\)/);
assert.doesNotMatch(serviceWorkerSource, /caches\.put\(request/);
assert.match(offlineSource, /离线状态不会显示旧的私人数据/);

for (const icon of [
  "public/icons/app-icon-192.png",
  "public/icons/app-icon-512.png",
  "public/icons/app-icon-maskable-512.png",
]) {
  assert.ok(statSync(icon).size > 1000, `${icon} is missing or unexpectedly small`);
}

console.log("PWA and Android packaging foundation checks passed");
