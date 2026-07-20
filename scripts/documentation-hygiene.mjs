import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const TRUNCATION_PATTERNS = [
  /Warning: truncated output/i,
  /Total output lines:\s*\d+/i,
  /(?:…|\.\.\.)?\d+\s+tokens?\s+truncated(?:…|\.\.\.)?/i,
];

export function findDocumentationHygieneProblems(markdown, relativePath) {
  const problems = [];
  const lines = markdown.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    if (TRUNCATION_PATTERNS.some((pattern) => pattern.test(line))) {
      problems.push(`${relativePath}:${index + 1}: contains a tool-output truncation marker`);
    }
  }

  let previousHeading = null;
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(trimmed);
    if (heading) {
      const normalized = `${heading[1]} ${heading[2].trim()}`;
      if (normalized === previousHeading) {
        problems.push(`${relativePath}:${index + 1}: duplicates the previous Markdown heading`);
      }
      previousHeading = normalized;
      continue;
    }

    previousHeading = null;
  }

  return problems;
}

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(absolutePath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(absolutePath);
    }
  }

  return files;
}

export async function validateDocumentationHygiene(rootDirectory) {
  const candidates = [path.join(rootDirectory, "README.md"), path.join(rootDirectory, "AGENTS.md")];
  candidates.push(...(await collectMarkdownFiles(path.join(rootDirectory, "docs"))));

  const problems = [];
  for (const absolutePath of candidates) {
    const markdown = await readFile(absolutePath, "utf8");
    const relativePath = path.relative(rootDirectory, absolutePath);
    problems.push(...findDocumentationHygieneProblems(markdown, relativePath));
  }

  return problems;
}
