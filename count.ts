#!/usr/bin/env npx ts-node
/**
 * AST-based OOP vs FP counter for TypeScript codebases.
 *
 * Uses the TypeScript Compiler API in parse-only mode (ts.createSourceFile),
 * so it works on any codebase without installing dependencies.
 *
 * OOP constructs: ClassDeclaration, ClassExpression, MethodDeclaration,
 *   Constructor, GetAccessor, SetAccessor
 * FP constructs: FunctionDeclaration, FunctionExpression, ArrowFunction
 *
 * Usage:
 *   npx ts-node count.ts <directory> [--exclude pattern1,pattern2] [--json]
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

interface Counts {
  classes: number;
  methods: number;
  functions: number;
  arrowFunctions: number;
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "out",
  ".turbo",
  ".cache",
  "coverage",
  "__pycache__",
  ".bazel-cache",
  "bazel-out",
  ".output",
  ".nuxt",
  ".svelte-kit",
]);

function countNode(node: ts.Node, counts: Counts, inClass: boolean): void {
  switch (node.kind) {
    case ts.SyntaxKind.ClassDeclaration:
    case ts.SyntaxKind.ClassExpression:
      counts.classes++;
      ts.forEachChild(node, (child) => countNode(child, counts, true));
      return;

    case ts.SyntaxKind.MethodDeclaration:
    case ts.SyntaxKind.GetAccessor:
    case ts.SyntaxKind.SetAccessor:
    case ts.SyntaxKind.Constructor:
      if (inClass) {
        counts.methods++;
      }
      break;

    case ts.SyntaxKind.FunctionDeclaration:
      counts.functions++;
      break;

    case ts.SyntaxKind.FunctionExpression:
      if (!inClass) {
        counts.functions++;
      }
      break;

    case ts.SyntaxKind.ArrowFunction:
      if (!inClass) {
        counts.arrowFunctions++;
      }
      break;
  }

  ts.forEachChild(node, (child) => countNode(child, counts, inClass));
}

function countFile(filePath: string): Counts {
  const counts: Counts = { classes: 0, methods: 0, functions: 0, arrowFunctions: 0 };
  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    ts.forEachChild(sourceFile, (node) => countNode(node, counts, false));
  } catch {
    // Skip files that can't be parsed
  }
  return counts;
}

function walkDir(dir: string, excludePatterns: string[]): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (excludePatterns.some((p) => relativePath.includes(p))) continue;
        walk(fullPath);
      } else if (
        entry.isFile() &&
        /\.(ts|tsx)$/.test(entry.name) &&
        !entry.name.endsWith(".d.ts")
      ) {
        if (!excludePatterns.some((p) => relativePath.includes(p))) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}

// --- Main ---
const args = process.argv.slice(2);
let targetDir = args[0] || ".";
let excludePatterns: string[] = [];
const jsonOutput = args.includes("--json");

const excludeIdx = args.indexOf("--exclude");
if (excludeIdx !== -1 && args[excludeIdx + 1]) {
  excludePatterns = args[excludeIdx + 1].split(",");
}

targetDir = path.resolve(targetDir);
if (!jsonOutput) {
  console.error(`Scanning: ${targetDir}`);
  if (excludePatterns.length) {
    console.error(`Excluding: ${excludePatterns.join(", ")}`);
  }
}

const files = walkDir(targetDir, excludePatterns);
if (!jsonOutput) {
  console.error(`Found ${files.length} .ts/.tsx files`);
}

const totals: Counts = { classes: 0, methods: 0, functions: 0, arrowFunctions: 0 };

for (const file of files) {
  const counts = countFile(file);
  totals.classes += counts.classes;
  totals.methods += counts.methods;
  totals.functions += counts.functions;
  totals.arrowFunctions += counts.arrowFunctions;
}

const oopTotal = totals.classes + totals.methods;
const fpTotal = totals.functions + totals.arrowFunctions;
const ratio = fpTotal > 0 ? (oopTotal / fpTotal).toFixed(2) : "inf";

if (jsonOutput) {
  console.log(
    JSON.stringify({
      directory: targetDir,
      files: files.length,
      oop: { total: oopTotal, classes: totals.classes, methods: totals.methods },
      fp: { total: fpTotal, functions: totals.functions, arrowFunctions: totals.arrowFunctions },
      ratio: parseFloat(ratio),
    })
  );
} else {
  console.log(`OOP: ${oopTotal} (${totals.classes} classes + ${totals.methods} methods)`);
  console.log(
    `FP:  ${fpTotal} (${totals.functions} functions + ${totals.arrowFunctions} arrows)`
  );
  console.log(`Ratio (OOP:FP): ${ratio}:1`);
  console.log(`Files: ${files.length}`);
}
