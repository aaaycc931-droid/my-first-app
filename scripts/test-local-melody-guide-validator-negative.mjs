import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const validatorPath = path.join(process.cwd(), 'scripts', 'validate-local-melody-guide-fixtures.mjs');

const baseSample = {
  id: 'fake-sample-001',
  targetLabel: 'Fake Sample Melody',
  fileName: 'audio/sample.wav',
  format: 'wav',
  encoding: 'pcm',
  expectedMonophonic: true,
  durationSeconds: 10,
  sourceType: 'local-melody-guide-audio',
  rightsConfirmation: 'user-provided-local-only',
  includeInLocalResearch: false,
  sampleRateHz: 44100,
  channelCount: 1,
  notes: ['fake metadata-only test fixture'],
};

const exampleMetadata = {
  samples: [baseSample],
};

const cases = [
  {
    name: 'metadata.local.json absent should skip cleanly',
    expectedExitCode: 0,
    setup: async (root) => {
      await writeMetadata(root, 'metadata.example.json', exampleMetadata);
    },
    assert: ({ output }) => output.includes('metadata.local.json not found; skipping'),
  },
  {
    name: 'valid local metadata should pass',
    expectedExitCode: 0,
    setup: async (root) => {
      await writeMetadata(root, 'metadata.example.json', exampleMetadata);
      await writeMetadata(root, 'metadata.local.json', { samples: [{ ...baseSample, includeInLocalResearch: true }] });
      await writeEmptyWavPlaceholder(root, 'sample.wav');
    },
  },
  {
    name: 'missing required field should fail',
    expectedExitCode: 1,
    setup: async (root) => {
      const { targetLabel, ...sample } = baseSample;
      await writeStandardInvalidLocal(root, sample, true);
    },
  },
  {
    name: 'invalid format should fail',
    expectedExitCode: 1,
    setup: async (root) => writeStandardInvalidLocal(root, { ...baseSample, format: 'mp3' }, true),
  },
  {
    name: 'invalid encoding should fail',
    expectedExitCode: 1,
    setup: async (root) => writeStandardInvalidLocal(root, { ...baseSample, encoding: 'aac' }, true),
  },
  {
    name: 'expectedMonophonic false should fail',
    expectedExitCode: 1,
    setup: async (root) => writeStandardInvalidLocal(root, { ...baseSample, expectedMonophonic: false }, true),
  },
  {
    name: 'unsafe fileName should fail',
    expectedExitCode: 1,
    setup: async (root) => writeStandardInvalidLocal(root, { ...baseSample, fileName: '../sample.wav' }, false),
  },
  {
    name: 'invalid duration should fail',
    expectedExitCode: 1,
    setup: async (root) => writeStandardInvalidLocal(root, { ...baseSample, durationSeconds: 0 }, true),
  },
  {
    name: 'invalid channelCount should fail',
    expectedExitCode: 1,
    setup: async (root) => writeStandardInvalidLocal(root, { ...baseSample, channelCount: 3 }, true),
  },
  {
    name: 'missing referenced local WAV should fail only when metadata.local.json exists',
    expectedExitCode: 1,
    setup: async (root) => writeStandardInvalidLocal(root, baseSample, false),
  },
];

async function writeMetadata(root, fileName, metadata) {
  await writeFile(path.join(root, fileName), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
}

async function writeEmptyWavPlaceholder(root, fileName) {
  await mkdir(path.join(root, 'audio'), { recursive: true });
  await writeFile(path.join(root, 'audio', fileName), '');
}

async function writeStandardInvalidLocal(root, sample, createWav) {
  await writeMetadata(root, 'metadata.example.json', exampleMetadata);
  await writeMetadata(root, 'metadata.local.json', { samples: [sample] });
  if (createWav) {
    await writeEmptyWavPlaceholder(root, 'sample.wav');
  }
}

function runValidator(fixtureRoot) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [validatorPath], {
      cwd: process.cwd(),
      env: { ...process.env, MELODY_GUIDE_FIXTURE_ROOT: fixtureRoot },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => resolve({ code, stdout, stderr, output: `${stdout}${stderr}` }));
  });
}

let failures = 0;
const tempRoot = await mkdtemp(path.join(tmpdir(), 'melody-guide-validator-'));

try {
  for (const testCase of cases) {
    const root = await mkdtemp(path.join(tempRoot, 'case-'));
    await mkdir(path.join(root, 'audio'), { recursive: true });
    await testCase.setup(root);

    const result = await runValidator(root);
    const exitMatches = result.code === testCase.expectedExitCode;
    const assertionMatches = testCase.assert ? testCase.assert(result) : true;

    if (exitMatches && assertionMatches) {
      console.log(`PASS ${testCase.name}`);
    } else {
      failures += 1;
      console.error(`FAIL ${testCase.name}`);
      console.error(`  expected exit ${testCase.expectedExitCode}, got ${result.code}`);
      console.error(`  stdout:\n${result.stdout}`);
      console.error(`  stderr:\n${result.stderr}`);
    }
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

console.log('Validator negative harness used temporary fake fixture roots only.');
console.log('WAV placeholders, when present, were empty files used only for existence checks.');
console.log('No WAV contents were read, decoded, or analyzed by this test harness.');

if (failures > 0) {
  process.exit(1);
}
