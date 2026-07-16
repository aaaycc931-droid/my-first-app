import {
  createDefaultModulePreferences,
  moveVisibleModule,
  practiceModules,
  reconcileModulePreferences,
  toggleVisibleModule,
} from "../lib/product/practiceModuleRegistry.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const hobby = createDefaultModulePreferences("hobby");
const exam = createDefaultModulePreferences("exam");
assert(hobby.visibleModuleIds.includes("single-pitch"), "hobby preset should include an approachable pitch module");
assert(exam.visibleModuleIds.includes("sight-singing"), "exam preset should include sight singing");
assert(practiceModules.some((module) => module.id === "sound-packs" && module.availability === "planned"), "sound packs should remain represented in the product registry");

const hidden = toggleVisibleModule(hobby, "single-pitch");
assert(!hidden.visibleModuleIds.includes("single-pitch"), "a visible module should be hideable");
const restored = toggleVisibleModule(hidden, "single-pitch");
assert(restored.visibleModuleIds.at(-1) === "single-pitch", "a hidden module should be restorable");

const moved = moveVisibleModule(hobby, hobby.visibleModuleIds[1], -1);
assert(moved.visibleModuleIds[0] === hobby.visibleModuleIds[1], "visible modules should be reorderable");

const reconciled = reconcileModulePreferences({ version: 99, mode: "exam", visibleModuleIds: ["courses", "unknown", "courses"] });
assert(reconciled.version === 1, "stored preferences should migrate to the current version");
assert(reconciled.visibleModuleIds.join(",") === "courses", "unknown and duplicate module ids should be removed");

console.log("practice module registry tests passed");
