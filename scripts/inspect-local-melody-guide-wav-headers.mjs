import { access, open, readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_MAX_SCAN_BYTES = 1024 * 1024;
const DURATION_MIN_SECONDS = 5;
const DURATION_MAX_SECONDS = 30;
const DURATION_TOLERANCE_SECONDS = 0.5;

function readFixtureRootOverride() {
  const fixtureRootArg = process.argv.find((arg) => arg.startsWith('--fixture-root='));
  if (fixtureRootArg) {
    return path.resolve(fixtureRootArg.slice('--fixture-root='.length));
  }

  if (process.env.MELODY_GUIDE_FIXTURE_ROOT) {
    return path.resolve(process.env.MELODY_GUIDE_FIXTURE_ROOT);
  }

  return path.join(process.cwd(), 'local-fixtures', 'melody-guide-audio');
}

const fixtureRoot = readFixtureRootOverride();
const localMetadataPath = path.join(fixtureRoot, 'metadata.local.json');
const audioRoot = path.join(fixtureRoot, 'audio');

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundaryMessage() {
  return [
    'Boundary: WAV headers only; WAV audio is not decoded; WAV waveform is not analyzed;',
    'pitch is not tracked; TargetPitchCurve is not generated; no upload/cloud/AI.',
  ].join(' ');
}

function fail(message) {
  console.error(`Local melody guide WAV header inspection failed: ${message}`);
  console.error(boundaryMessage());
  process.exit(1);
}

function validateSafeFileName(sample, index) {
  if (!isPlainObject(sample) || typeof sample.fileName !== 'string') {
    fail(`samples[${index}].fileName must be a string.`);
  }

  const normalized = sample.fileName.replaceAll('\\', '/');
  if (!normalized.endsWith('.wav')) {
    fail(`samples[${index}].fileName must end with .wav: ${sample.fileName}`);
  }
  if (path.isAbsolute(sample.fileName) || normalized.startsWith('/')) {
    fail(`samples[${index}].fileName must not be an absolute path: ${sample.fileName}`);
  }
  if (normalized.includes('..')) {
    fail(`samples[${index}].fileName must not include .. or path traversal: ${sample.fileName}`);
  }
  if (!normalized.startsWith('audio/')) {
    fail(`samples[${index}].fileName must follow the audio/ fixture convention: ${sample.fileName}`);
  }
  if (normalized.slice('audio/'.length).includes('/') || normalized.includes('//')) {
    fail(`samples[${index}].fileName must reference a simple WAV file inside audio/: ${sample.fileName}`);
  }

  const resolved = path.resolve(fixtureRoot, normalized);
  const relativeToAudioRoot = path.relative(audioRoot, resolved);
  if (relativeToAudioRoot.startsWith('..') || path.isAbsolute(relativeToAudioRoot)) {
    fail(`samples[${index}].fileName resolves outside the audio fixture directory: ${sample.fileName}`);
  }

  return { normalized, resolved };
}

async function readExact(fileHandle, length, position, label) {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await fileHandle.read(buffer, 0, length, position);
  if (bytesRead !== length) {
    throw new Error(`${label} is truncated while reading ${length} bytes at offset ${position}`);
  }
  return buffer;
}

async function inspectWavHeader(filePath) {
  const fileHandle = await open(filePath, 'r');
  try {
    const header = await readExact(fileHandle, 12, 0, filePath);
    if (header.toString('ascii', 0, 4) !== 'RIFF') {
      throw new Error('missing RIFF marker');
    }
    if (header.toString('ascii', 8, 12) !== 'WAVE') {
      throw new Error('missing WAVE marker');
    }

    let offset = 12;
    let fmt = null;
    let data = null;

    while (offset + 8 <= DEFAULT_MAX_SCAN_BYTES) {
      const chunkHeader = await readExact(fileHandle, 8, offset, filePath);
      const chunkId = chunkHeader.toString('ascii', 0, 4);
      const chunkSize = chunkHeader.readUInt32LE(4);
      const chunkDataOffset = offset + 8;

      if (chunkId === 'fmt ') {
        if (chunkSize < 16) {
          throw new Error('fmt chunk is too small for PCM metadata');
        }
        const fmtBytes = await readExact(fileHandle, 16, chunkDataOffset, filePath);
        const audioFormat = fmtBytes.readUInt16LE(0);
        const channelCount = fmtBytes.readUInt16LE(2);
        const sampleRateHz = fmtBytes.readUInt32LE(4);
        const byteRate = fmtBytes.readUInt32LE(8);
        const blockAlign = fmtBytes.readUInt16LE(12);
        const bitsPerSample = fmtBytes.readUInt16LE(14);
        fmt = { audioFormat, channelCount, sampleRateHz, byteRate, blockAlign, bitsPerSample };
      } else if (chunkId === 'data') {
        data = { byteSize: chunkSize };
        break;
      }

      const paddedChunkSize = chunkSize + (chunkSize % 2);
      offset = chunkDataOffset + paddedChunkSize;
    }

    if (!fmt) {
      throw new Error(`fmt chunk not found within ${DEFAULT_MAX_SCAN_BYTES} scan bytes`);
    }
    if (!data) {
      throw new Error(`data chunk not found within ${DEFAULT_MAX_SCAN_BYTES} scan bytes`);
    }
    if (fmt.audioFormat !== 1) {
      throw new Error(`unsupported WAV audio format ${fmt.audioFormat}; only PCM audioFormat 1 is allowed`);
    }
    if (![1, 2].includes(fmt.channelCount)) {
      throw new Error(`unsupported channel count ${fmt.channelCount}; only mono or stereo is allowed`);
    }
    if (!Number.isFinite(fmt.sampleRateHz) || fmt.sampleRateHz <= 0) {
      throw new Error(`invalid sample rate ${fmt.sampleRateHz}`);
    }
    if (fmt.bitsPerSample !== 16) {
      throw new Error(`unsupported bits per sample ${fmt.bitsPerSample}; this first-phase inspector allows only 16-bit PCM WAV`);
    }
    const expectedBlockAlign = (fmt.channelCount * fmt.bitsPerSample) / 8;
    if (fmt.blockAlign !== expectedBlockAlign) {
      throw new Error(`invalid block align ${fmt.blockAlign}; expected ${expectedBlockAlign}`);
    }
    const expectedByteRate = fmt.sampleRateHz * fmt.blockAlign;
    if (fmt.byteRate !== expectedByteRate) {
      throw new Error(`invalid byte rate ${fmt.byteRate}; expected ${expectedByteRate}`);
    }
    if (data.byteSize <= 0) {
      throw new Error('data chunk byte size must be positive');
    }

    const estimatedDurationSeconds = data.byteSize / fmt.byteRate;
    if (estimatedDurationSeconds <= 0) {
      throw new Error('estimated duration must be positive');
    }
    if (estimatedDurationSeconds < DURATION_MIN_SECONDS || estimatedDurationSeconds > DURATION_MAX_SECONDS) {
      throw new Error(`estimated duration ${estimatedDurationSeconds.toFixed(3)}s is outside ${DURATION_MIN_SECONDS}-${DURATION_MAX_SECONDS}s`);
    }

    return { ...fmt, dataChunkBytes: data.byteSize, estimatedDurationSeconds };
  } finally {
    await fileHandle.close();
  }
}

if (!(await pathExists(localMetadataPath))) {
  console.log('metadata.local.json not found; skipping local melody guide WAV header inspection.');
  console.log(boundaryMessage());
  process.exit(0);
}

let metadata;
try {
  metadata = JSON.parse(await readFile(localMetadataPath, 'utf8'));
} catch (error) {
  fail(`could not parse metadata.local.json (${error.message}). Run npm run validate:local-melody-guide-fixtures first.`);
}

if (!isPlainObject(metadata) || !Array.isArray(metadata.samples)) {
  fail('metadata.local.json must contain a top-level samples array. Run npm run validate:local-melody-guide-fixtures first.');
}

const optInSamples = metadata.samples
  .map((sample, index) => ({ sample, index }))
  .filter(({ sample }) => isPlainObject(sample) && sample.includeInLocalResearch === true);

if (optInSamples.length === 0) {
  console.log('No includeInLocalResearch: true samples found; no local melody guide WAV headers inspected.');
  console.log(boundaryMessage());
  process.exit(0);
}

const summaries = [];
for (const { sample, index } of optInSamples) {
  const { normalized, resolved } = validateSafeFileName(sample, index);
  if (!(await pathExists(resolved))) {
    fail(`referenced local WAV file is missing for samples[${index}]: ${normalized}`);
  }

  let inspected;
  try {
    inspected = await inspectWavHeader(resolved);
  } catch (error) {
    fail(`${normalized}: ${error.message}`);
  }

  if (typeof sample.durationSeconds === 'number' && Number.isFinite(sample.durationSeconds)) {
    const difference = Math.abs(sample.durationSeconds - inspected.estimatedDurationSeconds);
    if (difference > DURATION_TOLERANCE_SECONDS) {
      fail(`${normalized}: metadata durationSeconds ${sample.durationSeconds}s differs from header estimate ${inspected.estimatedDurationSeconds.toFixed(3)}s by ${difference.toFixed(3)}s; tolerance is ${DURATION_TOLERANCE_SECONDS}s`);
    }
  }

  summaries.push({
    id: typeof sample.id === 'string' ? sample.id : `(samples[${index}])`,
    targetLabel: typeof sample.targetLabel === 'string' ? sample.targetLabel : '(missing targetLabel)',
    fileName: normalized,
    ...inspected,
  });
}

console.log('Local melody guide WAV header inspection passed.');
for (const summary of summaries) {
  console.log(`- ${summary.id} | ${summary.targetLabel} | ${summary.fileName} | channels=${summary.channelCount} | sampleRateHz=${summary.sampleRateHz} | bitsPerSample=${summary.bitsPerSample} | estimatedDurationSeconds=${summary.estimatedDurationSeconds.toFixed(3)} | dataChunkBytes=${summary.dataChunkBytes}`);
}
console.log(`- samples inspected: ${summaries.length}`);
console.log(`- max header/chunk scan bytes per file: ${DEFAULT_MAX_SCAN_BYTES}`);
console.log(boundaryMessage());
