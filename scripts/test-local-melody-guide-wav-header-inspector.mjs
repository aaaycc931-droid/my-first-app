import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const baseSample = {
  id: 'synthetic-header-001',
  targetLabel: 'Synthetic Header Fixture',
  fileName: 'audio/sample.wav',
  format: 'wav',
  encoding: 'pcm',
  expectedMonophonic: true,
  durationSeconds: 5,
  sourceType: 'local-melody-guide-audio',
  rightsConfirmation: 'user-provided-local-only',
  includeInLocalResearch: true,
  sampleRateHz: 44100,
  channelCount: 1,
  notes: ['temporary synthetic header test fixture only'],
};

const cases = [
  {
    name: 'metadata.local.json absent should skip cleanly',
    expectedExitCode: 0,
    setup: async () => {},
    assert: ({ output }) => output.includes('metadata.local.json not found; skipping local melody guide WAV header inspection.'),
  },
  {
    name: 'no opt-in samples should skip/no-op cleanly',
    expectedExitCode: 0,
    setup: async (root) => writeMetadata(root, [{ ...baseSample, includeInLocalResearch: false }]),
    assert: ({ output }) => output.includes('No includeInLocalResearch: true samples found'),
  },
  {
    name: 'valid PCM WAV should pass',
    expectedExitCode: 0,
    setup: async (root) => {
      await writeMetadata(root, [baseSample]);
      await writeWav(root, 'sample.wav', createWavBuffer({ durationSeconds: 5 }));
    },
    assert: ({ output }) =>
      output.includes('channels=1') &&
      output.includes('sampleRateHz=44100') &&
      output.includes('bitsPerSample=16') &&
      output.includes('estimatedDurationSeconds=5.000') &&
      output.includes('dataChunkBytes=441000'),
  },
  {
    name: 'unsafe filename should fail',
    expectedExitCode: 1,
    setup: async (root) => writeMetadata(root, [{ ...baseSample, fileName: '../sample.wav' }]),
  },
  {
    name: 'missing referenced WAV should fail',
    expectedExitCode: 1,
    setup: async (root) => writeMetadata(root, [baseSample]),
  },
  {
    name: 'invalid RIFF marker should fail',
    expectedExitCode: 1,
    setup: async (root) => writeSample(root, Buffer.from('NOPE----WAVEfmt ', 'ascii')),
  },
  {
    name: 'invalid WAVE marker should fail',
    expectedExitCode: 1,
    setup: async (root) => writeSample(root, createWavBuffer({ waveMarker: 'WVAE' })),
  },
  {
    name: 'missing fmt chunk should fail',
    expectedExitCode: 1,
    setup: async (root) => writeSample(root, createWavBuffer({ omitFmt: true })),
  },
  {
    name: 'missing data chunk should fail',
    expectedExitCode: 1,
    setup: async (root) => writeSample(root, createWavBuffer({ omitData: true })),
  },
  {
    name: 'non-PCM format should fail',
    expectedExitCode: 1,
    setup: async (root) => writeSample(root, createWavBuffer({ audioFormat: 3 })),
  },
  {
    name: 'unsupported bit depth should fail',
    expectedExitCode: 1,
    setup: async (root) => writeSample(root, createWavBuffer({ bitsPerSample: 24 })),
  },
  {
    name: 'duration mismatch should fail',
    expectedExitCode: 1,
    setup: async (root) => {
      await writeMetadata(root, [{ ...baseSample, durationSeconds: 10 }]);
      await writeWav(root, 'sample.wav', createWavBuffer({ durationSeconds: 5 }));
    },
  },
  {
    name: 'invalid channel count should fail',
    expectedExitCode: 1,
    setup: async (root) => writeSample(root, createWavBuffer({ channelCount: 3 })),
  },
  {
    name: 'invalid duration range should fail',
    expectedExitCode: 1,
    setup: async (root) => writeSample(root, createWavBuffer({ durationSeconds: 4 })),
  },
];

async function writeMetadata(root, samples) {
  await writeFile(path.join(root, 'metadata.local.json'), `${JSON.stringify({ samples }, null, 2)}\n`, 'utf8');
}

async function writeWav(root, fileName, buffer) {
  await mkdir(path.join(root, 'audio'), { recursive: true });
  await writeFile(path.join(root, 'audio', fileName), buffer);
}

async function writeSample(root, buffer) {
  await writeMetadata(root, [baseSample]);
  await writeWav(root, 'sample.wav', buffer);
}

function createWavBuffer({
  riffMarker = 'RIFF',
  waveMarker = 'WAVE',
  audioFormat = 1,
  channelCount = 1,
  sampleRateHz = 44100,
  bitsPerSample = 16,
  durationSeconds = 5,
  omitFmt = false,
  omitData = false,
} = {}) {
  const blockAlign = (channelCount * bitsPerSample) / 8;
  const byteRate = sampleRateHz * blockAlign;
  const dataChunkBytes = Math.floor(durationSeconds * byteRate);
  const chunks = [];

  if (!omitFmt) {
    const fmt = Buffer.alloc(24);
    fmt.write('fmt ', 0, 'ascii');
    fmt.writeUInt32LE(16, 4);
    fmt.writeUInt16LE(audioFormat, 8);
    fmt.writeUInt16LE(channelCount, 10);
    fmt.writeUInt32LE(sampleRateHz, 12);
    fmt.writeUInt32LE(byteRate, 16);
    fmt.writeUInt16LE(blockAlign, 20);
    fmt.writeUInt16LE(bitsPerSample, 22);
    chunks.push(fmt);
  }

  if (!omitData) {
    const dataHeader = Buffer.alloc(8);
    dataHeader.write('data', 0, 'ascii');
    dataHeader.writeUInt32LE(dataChunkBytes, 4);
    chunks.push(dataHeader, Buffer.alloc(dataChunkBytes));
  }

  const riffSize = 4 + chunks.reduce((size, chunk) => size + chunk.length, 0);
  const header = Buffer.alloc(12);
  header.write(riffMarker, 0, 'ascii');
  header.writeUInt32LE(riffSize, 4);
  header.write(waveMarker, 8, 'ascii');
  return Buffer.concat([header, ...chunks]);
}

function runInspector(fixtureRoot) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', 'validate:local-melody-guide-wav-headers'], {
      cwd: process.cwd(),
      env: { ...process.env, MELODY_GUIDE_FIXTURE_ROOT: fixtureRoot },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr, output: `${stdout}${stderr}` }));
  });
}

let failures = 0;
const tempRoot = await mkdtemp(path.join(tmpdir(), 'melody-guide-wav-header-inspector-'));

try {
  for (const testCase of cases) {
    const root = await mkdtemp(path.join(tempRoot, 'case-'));
    await mkdir(path.join(root, 'audio'), { recursive: true });
    await testCase.setup(root);

    const result = await runInspector(root);
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

console.log('WAV header inspector harness used temporary synthetic fixtures only.');
console.log('The real local fixture directory was untouched; no real audio or metadata.local.json was written.');
console.log('Synthetic WAV-like files were temporary and used only for bounded RIFF/WAVE/fmt/data header/chunk inspection.');
console.log('No decoding, waveform analysis, pitch tracking, TargetPitchCurve generation, AudioContext, decodeAudioData, getUserMedia, microphone, upload, cloud, AI, or Practice Mode integration was used.');

if (failures > 0) {
  process.exit(1);
}
