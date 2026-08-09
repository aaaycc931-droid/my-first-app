import { readFileSync } from "node:fs";

const manifestUrl = new URL("./runtime-test-lanes.json", import.meta.url);
const packageJsonUrl = new URL("../package.json", import.meta.url);

export const RUNTIME_TEST_LANES = Object.freeze([
  "platform",
  "release-content",
  "learning-practice",
  "audio-rhythm",
  "piano-midi",
  "notation-composition",
  "account-web",
]);

export function loadRuntimeTestManifest() {
  return JSON.parse(readFileSync(manifestUrl, "utf8"));
}

export function loadPackageScripts() {
  return JSON.parse(readFileSync(packageJsonUrl, "utf8")).scripts ?? {};
}

function isDocumentationPath(path) {
  return path.startsWith("docs/")
    || (!path.includes("/") && (/\.md$/i.test(path) || path === "LICENSE"))
    || path.toLowerCase().startsWith(".github/pull_request_template/")
    || path.toLowerCase() === ".github/pull_request_template.md";
}

function commandReferencesPath(command, path) {
  return command.split(/\s+/).some((token) => token === path);
}

export function classifyRuntimeTestShadow(changedPaths, options = {}) {
  const uniquePaths = [...new Set(changedPaths.filter(Boolean))].sort();
  const codePaths = uniquePaths.filter((path) => !isDocumentationPath(path));
  const allLanes = [...RUNTIME_TEST_LANES];
  const manifest = loadRuntimeTestManifest();

  function withCounts(result) {
    const laneSet = new Set(result.lanes);
    const selectedCommands = result.full
      ? manifest.commands.length
      : manifest.commands.filter(({ lane }) => laneSet.has(lane)).length;
    const estimatedSeconds = result.full
      ? manifest.baseline.commandDurationSeconds
      : result.lanes.reduce(
        (total, lane) => total + manifest.baseline.laneDurationSeconds[lane],
        0,
      );
    return {
      ...result,
      selectedCommands,
      skippedCommands: manifest.commands.length - selectedCommands,
      totalCommands: manifest.commands.length,
      estimatedSeconds: Number(estimatedSeconds.toFixed(3)),
      baselineSeconds: manifest.baseline.commandDurationSeconds,
    };
  }

  if (options.forceFullReason) {
    return withCounts({
      full: true,
      lanes: allLanes,
      reason: options.forceFullReason,
      owners: {},
    });
  }

  if (codePaths.length === 0) {
    return withCounts({ full: false, lanes: [], reason: "docs-only", owners: {} });
  }

  const packageScripts = loadPackageScripts();
  const laneByScript = new Map(manifest.commands.map(({ script, lane }) => [script, lane]));
  const owners = {};
  const selectedLanes = new Set();

  for (const path of codePaths) {
    const matchingScripts = manifest.commands
      .map(({ script }) => script)
      .filter((script) => commandReferencesPath(packageScripts[script] ?? "", path));
    const pathLanes = [...new Set(matchingScripts.map((script) => laneByScript.get(script)))].sort();
    owners[path] = matchingScripts;

    if (pathLanes.length === 0) {
      return withCounts({ full: true, lanes: allLanes, reason: "unknown-path", owners });
    }
    if (pathLanes.length > 1) {
      return withCounts({ full: true, lanes: allLanes, reason: "shared-path", owners });
    }
    selectedLanes.add(pathLanes[0]);
  }

  return withCounts({
    full: false,
    lanes: [...selectedLanes].sort(),
    reason: "direct-owner-shadow",
    owners,
  });
}
