import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const fixtureRoot = path.join(process.cwd(), 'local-fixtures', 'melody-guide-audio');
const examplePath = path.join(fixtureRoot, 'metadata.example.json');
const localPath = path.join(fixtureRoot, 'metadata.local.json');
const audioRoot = path.join(fixtureRoot, 'audio');

const requiredFields = [
  'id',
  'targetLabel',
  'fileName',
  'format',
  'encoding',
  'expectedMonophonic',
  'durationSeconds',
  'sourceType',
  'rightsConfirmation',
  'includeInLocalResearch',
];

const errors = [];
let samplesChecked = 0;
let localAudioRefsChecked = 0;
let exampleValidated = false;
let localStatus = 'skipped';

function addError(sourceLabel, message) {
  errors.push(`${sourceLabel}: ${message}`);
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, sourceLabel) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    addError(sourceLabel, `could not read JSON file (${error.message})`);
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    addError(sourceLabel, `invalid JSON (${error.message})`);
    return null;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateString(sample, field, sourceLabel, index) {
  if (typeof sample[field] !== 'string' || sample[field].trim() === '') {
    addError(sourceLabel, `samples[${index}].${field} must be a non-empty string`);
  }
}

function validateFileName(fileName, sourceLabel, index) {
  if (typeof fileName !== 'string') {
    return;
  }

  const normalized = fileName.replaceAll('\\', '/');
  if (!normalized.endsWith('.wav')) {
    addError(sourceLabel, `samples[${index}].fileName must end with .wav`);
  }
  if (path.isAbsolute(fileName) || normalized.startsWith('/')) {
    addError(sourceLabel, `samples[${index}].fileName must not be an absolute path`);
  }
  if (normalized.includes('..')) {
    addError(sourceLabel, `samples[${index}].fileName must not include .. or path traversal`);
  }
  if (normalized.includes('//')) {
    addError(sourceLabel, `samples[${index}].fileName must not include empty path segments`);
  }
  if (!normalized.startsWith('audio/')) {
    addError(sourceLabel, `samples[${index}].fileName must follow the audio/ fixture convention`);
  }
  if (normalized.slice('audio/'.length).includes('/')) {
    addError(sourceLabel, `samples[${index}].fileName must reference a simple file name inside audio/`);
  }
}

function validateSample(sample, sourceLabel, index, { requireSafeExample }) {
  if (!isPlainObject(sample)) {
    addError(sourceLabel, `samples[${index}] must be an object`);
    return;
  }

  for (const field of requiredFields) {
    if (!(field in sample)) {
      addError(sourceLabel, `samples[${index}] is missing required field ${field}`);
    }
  }

  for (const field of ['id', 'targetLabel', 'fileName', 'format', 'encoding', 'sourceType', 'rightsConfirmation']) {
    if (field in sample) {
      validateString(sample, field, sourceLabel, index);
    }
  }

  if (sample.format !== 'wav') {
    addError(sourceLabel, `samples[${index}].format must be "wav"`);
  }
  if (sample.encoding !== 'pcm') {
    addError(sourceLabel, `samples[${index}].encoding must be "pcm"`);
  }
  if (sample.sourceType !== 'local-melody-guide-audio') {
    addError(sourceLabel, `samples[${index}].sourceType must be "local-melody-guide-audio"`);
  }
  if (sample.rightsConfirmation !== 'user-provided-local-only') {
    addError(sourceLabel, `samples[${index}].rightsConfirmation must be "user-provided-local-only"`);
  }
  if (sample.expectedMonophonic !== true) {
    addError(sourceLabel, `samples[${index}].expectedMonophonic must be true metadata intent only`);
  }
  if (typeof sample.includeInLocalResearch !== 'boolean') {
    addError(sourceLabel, `samples[${index}].includeInLocalResearch must be boolean`);
  }

  if (typeof sample.durationSeconds !== 'number' || !Number.isFinite(sample.durationSeconds) || sample.durationSeconds <= 0) {
    addError(sourceLabel, `samples[${index}].durationSeconds must be a positive number`);
  } else if (sample.durationSeconds < 5 || sample.durationSeconds > 30) {
    addError(sourceLabel, `samples[${index}].durationSeconds must stay within the recommended 5-30 second local research range`);
  }

  if ('sampleRateHz' in sample && (typeof sample.sampleRateHz !== 'number' || !Number.isFinite(sample.sampleRateHz) || sample.sampleRateHz <= 0)) {
    addError(sourceLabel, `samples[${index}].sampleRateHz must be positive when provided`);
  }
  if ('channelCount' in sample && ![1, 2].includes(sample.channelCount)) {
    addError(sourceLabel, `samples[${index}].channelCount must be 1 or 2 when provided`);
  }
  if ('notes' in sample && (!Array.isArray(sample.notes) || sample.notes.some((note) => typeof note !== 'string'))) {
    addError(sourceLabel, `samples[${index}].notes must be an array of strings when provided`);
  }

  validateFileName(sample.fileName, sourceLabel, index);

  if (requireSafeExample) {
    const sampleText = `${sample.id ?? ''} ${sample.targetLabel ?? ''} ${sample.fileName ?? ''} ${sample.expectedInstrument ?? ''}`.toLowerCase();
    if (!/(sample|fake|placeholder)/.test(sampleText)) {
      addError(sourceLabel, `samples[${index}] must remain clearly fake/sample-only committed metadata`);
    }
    if (sample.includeInLocalResearch !== false) {
      addError(sourceLabel, `samples[${index}].includeInLocalResearch must be false in committed example metadata`);
    }
  }
}

function validateMetadataShape(metadata, sourceLabel, options = {}) {
  if (!isPlainObject(metadata)) {
    addError(sourceLabel, 'top-level JSON value must be an object');
    return [];
  }
  if (!Array.isArray(metadata.samples)) {
    addError(sourceLabel, 'top-level samples must be an array');
    return [];
  }

  metadata.samples.forEach((sample, index) => validateSample(sample, sourceLabel, index, options));
  samplesChecked += metadata.samples.length;
  return metadata.samples;
}

const exampleMetadata = await readJson(examplePath, 'metadata.example.json');
if (exampleMetadata !== null) {
  validateMetadataShape(exampleMetadata, 'metadata.example.json', { requireSafeExample: true });
  exampleValidated = true;
}

if (await pathExists(localPath)) {
  localStatus = 'found';
  const localMetadata = await readJson(localPath, 'metadata.local.json');
  if (localMetadata !== null) {
    const samples = validateMetadataShape(localMetadata, 'metadata.local.json');
    for (const [index, sample] of samples.entries()) {
      if (!isPlainObject(sample) || typeof sample.fileName !== 'string') {
        continue;
      }
      const normalized = sample.fileName.replaceAll('\\', '/');
      if (normalized.startsWith('audio/') && !normalized.includes('..') && !path.isAbsolute(sample.fileName)) {
        localAudioRefsChecked += 1;
        const audioPath = path.join(fixtureRoot, normalized);
        if (!audioPath.startsWith(`${audioRoot}${path.sep}`)) {
          addError('metadata.local.json', `samples[${index}].fileName resolves outside the audio fixture directory`);
        } else if (!(await pathExists(audioPath))) {
          addError('metadata.local.json', `samples[${index}].fileName references missing local WAV file: ${normalized}`);
        }
      }
    }
  }
} else {
  console.log('metadata.local.json not found; skipping local melody guide fixture metadata validation.');
}

if (errors.length > 0) {
  console.error('Local melody guide fixture metadata validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error('This script validates metadata only. It does not read, decode, or analyze WAV contents.');
  process.exit(1);
}

console.log('Local melody guide fixture metadata validation passed.');
console.log(`- metadata.example.json validated: ${exampleValidated ? 'yes' : 'no'}`);
console.log(`- metadata.local.json: ${localStatus}`);
console.log(`- samples checked: ${samplesChecked}`);
console.log(`- local audio file references checked: ${localAudioRefsChecked}`);
console.log('- WAV contents read/decoded/analyzed: no');
