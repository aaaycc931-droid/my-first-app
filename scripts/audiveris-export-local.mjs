#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_TIMEOUT_MS = 300_000;

function printHelp() {
  console.log(`Local-only Audiveris export helper

Usage:
  npm run audiveris:export-local -- --input <path> --output <dir> [--dry-run]

Environment:
  AUDIVERIS_PATH                 Path to your local Audiveris executable or launcher.
  AUDIVERIS_EXPORT_TIMEOUT_MS    Optional timeout in milliseconds. Defaults to ${DEFAULT_TIMEOUT_MS}.

Options:
  --input <path>    Local PDF/image input path.
  --output <dir>    Local output directory. Created when missing.
  --dry-run         Print the Audiveris command without running it.
  --help            Show this help.

This script is local-only. It does not call Next.js APIs, /api/recognize, or any web import route.`);
}

function parseCliArgs(argv) {
  const options = {
    input: null,
    output: null,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help') {
      options.help = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--input') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--input requires a path value.');
      }
      options.input = value;
      index += 1;
      continue;
    }

    if (arg === '--output') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--output requires a directory value.');
      }
      options.output = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function parseTimeout(value) {
  if (!value) {
    return DEFAULT_TIMEOUT_MS;
  }

  const timeoutMs = Number(value);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('AUDIVERIS_EXPORT_TIMEOUT_MS must be a positive number of milliseconds.');
  }

  return timeoutMs;
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((part) => (/[\s"]/u.test(part) ? JSON.stringify(part) : part))
    .join(' ');
}

async function runAudiveris(audiverisPath, args, timeoutMs) {
  let timedOut = false;
  let settled = false;

  console.log(`Running: ${formatCommand(audiverisPath, args)}`);
  console.log(`Timeout: ${timeoutMs}ms`);

  const child = spawn(audiverisPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  const timeout = setTimeout(() => {
    if (settled) {
      return;
    }

    timedOut = true;
    child.kill('SIGTERM');
  }, timeoutMs);

  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  return new Promise((resolve) => {
    child.on('error', (error) => {
      settled = true;
      clearTimeout(timeout);
      console.error(`Failed to start Audiveris: ${error.message}`);
      resolve(1);
    });

    child.on('close', (code, signal) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (timedOut) {
        console.error(`Audiveris export timed out after ${timeoutMs}ms and was terminated.`);
        resolve(1);
        return;
      }

      if (signal) {
        console.error(`Audiveris export ended with signal ${signal}.`);
        resolve(1);
        return;
      }

      console.log(`Audiveris exit code: ${code}`);
      resolve(code ?? 1);
    });
  });
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const audiverisPath = process.env.AUDIVERIS_PATH;
  if (!audiverisPath) {
    throw new Error('AUDIVERIS_PATH is not set. Set it to your local Audiveris executable path.');
  }

  if (!options.input) {
    throw new Error('Missing required --input <path>.');
  }

  if (!options.output) {
    throw new Error('Missing required --output <dir>.');
  }

  const inputPath = path.resolve(options.input);
  const outputDir = path.resolve(options.output);

  if (!existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }

  await mkdir(outputDir, { recursive: true });

  const timeoutMs = parseTimeout(process.env.AUDIVERIS_EXPORT_TIMEOUT_MS);
  const audiverisArgs = ['-batch', '-export', '-output', outputDir, inputPath];
  const commandText = formatCommand(audiverisPath, audiverisArgs);

  if (options.dryRun) {
    console.log(`Dry run only. Audiveris will not be started.`);
    console.log(`Command: ${commandText}`);
    console.log(`After a real export, check this output directory for .mxl files: ${outputDir}`);
    return;
  }

  const exitCode = await runAudiveris(audiverisPath, audiverisArgs, timeoutMs);

  if (exitCode === 0) {
    console.log(`Audiveris export finished. Check this output directory for .mxl files: ${outputDir}`);
  } else {
    console.error(`Audiveris export failed with exit code ${exitCode}.`);
    process.exitCode = exitCode;
  }
}

main().catch((error) => {
  console.error(`Audiveris local export failed: ${error.message}`);
  process.exitCode = 1;
});
