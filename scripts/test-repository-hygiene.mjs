import assert from "node:assert/strict";
import {
  collectModuleSpecifiers,
  findForbiddenTrackedFiles,
  findLibUiBoundaryViolations,
  isAllowedTrackedResource,
  isLibSourceFile,
} from "./repository-hygiene.mjs";

const allowedResources = [
  "android/app/src/main/AndroidManifest.xml",
  "android/app/src/main/res/layout/activity_main.xml",
  "android/app/src/main/res/drawable/splash.png",
  "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
  "docs/companion/assets/resonance-traveler-final-head.jpg",
  "mobile/public/icons/app-icon-192.png",
  "mobile/public/icons/app-icon-512.png",
  "mobile/public/icons/app-icon-maskable-512.png",
];

for (const filePath of allowedResources) {
  assert.equal(
    isAllowedTrackedResource(filePath),
    true,
    `${filePath} should remain an explicitly allowed product resource`,
  );
}
assert.deepEqual(findForbiddenTrackedFiles(allowedResources), []);

for (const filePath of [
  "lib/domain.ts",
  "lib/domain.tsx",
  "lib/domain.js",
  "lib/domain.jsx",
  "lib/domain.mts",
  "lib/domain.cts",
  "lib/domain.mjs",
  "lib/domain.cjs",
]) {
  assert.equal(isLibSourceFile(filePath), true);
}
for (const filePath of [
  "lib/README.md",
  "lib/fixture.json",
  "scripts/domain.ts",
  "mobile/src/domain.ts",
]) {
  assert.equal(isLibSourceFile(filePath), false);
}

const forbiddenFiles = [
  "android/app/src/main/debug-screenshot.png",
  "docs/unreviewed-sample.pdf",
  "local-fixtures/private-voice.PNG",
  "mobile/public/debug-recording.mxl",
  "tmp/recognizer.log",
];
assert.deepEqual(findForbiddenTrackedFiles(forbiddenFiles), forbiddenFiles);

assert.deepEqual(
  findForbiddenTrackedFiles([
    "app/page.tsx",
    "docs/architecture.md",
    "mobile/src/main.tsx",
    "scripts/report.json",
  ]),
  [],
);

assert.deepEqual(
  collectModuleSpecifiers(
    "lib/example.ts",
    `
      import type { Domain } from "./domain";
      import { read } from "node:fs";
      export { Adapter } from "../platform/adapter";
      const lazy = import("../practice/lazy");
      const legacy = require("../music/legacy");
      type External = import("react").ComponentType;
      void read;
      void lazy;
      void legacy;
    `,
  ).sort(),
  [
    "../music/legacy",
    "../platform/adapter",
    "../practice/lazy",
    "./domain",
    "node:fs",
    "react",
  ],
);

const allowedLibImports = [
  {
    filePath: "lib/music/useCase.ts",
    source: `
      import { parse } from "./parser";
      import type { Repository } from "../platform/repository";
      import React from "react";
      // import { Page } from "../../app/page";
      const example = "require('../components/example')";
      void parse;
      void example;
    `,
  },
  {
    filePath: "scripts/not-a-domain-file.mjs",
    source: 'import "../components/debug";',
  },
];
assert.deepEqual(findLibUiBoundaryViolations(allowedLibImports), []);

const boundaryViolations = findLibUiBoundaryViolations([
  ...allowedLibImports,
  {
    filePath: "lib/music/controller.ts",
    source: 'import { Panel } from "../../components/music/Panel";',
  },
  {
    filePath: "lib/platform/mobile.ts",
    source: 'export { storage } from "../../mobile/src/runtime/storage";',
  },
  {
    filePath: "lib/activity/navigation.ts",
    source: 'const page = import("../../app/practice/page"); void page;',
  },
  {
    filePath: "lib/learning/view.ts",
    source: 'const home = require("@/components/home/Home"); void home;',
  },
]);
assert.deepEqual(boundaryViolations, [
  {
    filePath: "lib/music/controller.ts",
    specifier: "../../components/music/Panel",
    resolvedPath: "components/music/Panel",
  },
  {
    filePath: "lib/platform/mobile.ts",
    specifier: "../../mobile/src/runtime/storage",
    resolvedPath: "mobile/src/runtime/storage",
  },
  {
    filePath: "lib/activity/navigation.ts",
    specifier: "../../app/practice/page",
    resolvedPath: "app/practice/page",
  },
  {
    filePath: "lib/learning/view.ts",
    specifier: "@/components/home/Home",
    resolvedPath: "components/home/Home",
  },
]);

console.log("Repository hygiene focused tests passed.");
