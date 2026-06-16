#!/usr/bin/env node

import { spawn } from 'node:child_process';

const DEFAULT_ARGS = '-help';
const DEFAULT_TIMEOUT_MS = 10_000;
const OUTPUT_LIMIT = 12_000;

function parseArgs(value) {
  const args = [];
  let current = '';
  let quote = null;
  let escaping = false;

  for (const char of value) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escaping) {
    current += '\\';
  }

  if (quote) {
    throw new Error(`AUDIVERIS_PROBE_ARGS has an unmatched ${quote} quote.`);
  }

  if (current.length > 0) {
    args.push(current);
  }

  return args;
}

function parseTimeout(value) {
  if (!value) {
    return DEFAULT_TIMEOUT_MS;
  }

  const timeoutMs = Number(value);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('AUDIVERIS_PROBE_TIMEOUT_MS must be a positive number of milliseconds.');
  }

  return timeoutMs;
}

function appendLimited(current, chunk) {
  const text = current + chunk;
  if (text.length <= OUTPUT_LIMIT) {
    return text;
  }

  return text.slice(0, OUTPUT_LIMIT);
}

function printOutput(label, output) {
  if (!output) {
    console.log(`${label}: <empty>`);
    return;
  }

  const truncated = output.length >= OUTPUT_LIMIT ? '\n[output truncated]' : '';
  console.log(`${label}:\n${output}${truncated}`);
}

async function main() {
  const audiverisPath = process.env.AUDIVERIS_PATH;

  if (!audiverisPath) {
    console.error('AUDIVERIS_PATH is not set. Set it to your local Audiveris executable path.');
    process.exitCode = 1;
    return;
  }

  const argsText = process.env.AUDIVERIS_PROBE_ARGS ?? DEFAULT_ARGS;
  const args = parseArgs(argsText);
  const timeoutMs = parseTimeout(process.env.AUDIVERIS_PROBE_TIMEOUT_MS);

  let stdout = '';
  let stderr = '';
  let settled = false;

  console.log(`Running local Audiveris probe: ${audiverisPath} ${args.join(' ')}`);
  console.log(`Timeout: ${timeoutMs}ms`);

  const child = spawn(audiverisPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  const timeout = setTimeout(() => {
    if (settled) {
      return;
    }

    child.kill('SIGTERM');
  }, timeoutMs);

  child.stdout.on('data', (chunk) => {
    stdout = appendLimited(stdout, chunk.toString());
  });

  child.stderr.on('data', (chunk) => {
    stderr = appendLimited(stderr, chunk.toString());
  });

  await new Promise((resolve) => {
    child.on('error', (error) => {
      settled = true;
      clearTimeout(timeout);
      console.error(`Failed to start Audiveris local probe: ${error.message}`);
      process.exitCode = 1;
      resolve();
    });

    child.on('close', (code, signal) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      printOutput('stdout', stdout);
      printOutput('stderr', stderr);

      if (signal) {
        console.error(`Audiveris local probe timed out or was terminated with signal ${signal}.`);
        process.exitCode = 1;
        resolve();
        return;
      }

      if (code === 0) {
        console.log('Audiveris local probe passed.');
        resolve();
        return;
      }

      console.error(`Audiveris local probe failed with exit code ${code}.`);
      process.exitCode = 1;
      resolve();
    });
  });
}

main().catch((error) => {
  console.error(`Audiveris local probe failed: ${error.message}`);
  process.exitCode = 1;
});
