import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    files: [
      "app/practice/page.tsx",
      "components/home/ModularLearningHome.tsx",
      "components/practice/MockRecognitionDraftPanel.tsx",
      "components/practice/NotationTemporaryPracticePanel.tsx",
    ],
    rules: {
      // These effects reconcile existing state machines after their source changes.
      // Keep their validated runtime semantics stable during the framework upgrade.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["app/practice/page.tsx"],
    rules: {
      // The runtime stop helper is intentionally declared with the other audio controls.
      "react-hooks/immutability": "off",
    },
  },
  {
    files: [
      "app/recognize/page.tsx",
      "app/research/local-audio-decode/LocalAudioDecodeFileInputShell.tsx",
      "components/practice/LocalEarTrainingIntervalPanel.tsx",
      "components/practice/LocalEarTrainingMelodyDictationPanel.tsx",
      "components/practice/LocalEarTrainingRhythmPanel.tsx",
      "components/practice/LocalEarTrainingSinglePitchPanel.tsx",
    ],
    rules: {
      // These refs own browser-only audio resources and are covered by focused tests.
      "react-hooks/refs": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "mobile-dist/**",
    "android/**/build/**",
    "android/.gradle/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
