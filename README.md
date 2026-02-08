# ts-oop-fp-ratio

Measure how object-oriented or functional a TypeScript codebase is.

Uses the TypeScript Compiler API to walk the AST and count OOP vs FP constructs. Parse-only mode - no `node_modules` or dependency installation needed.

## What it counts

**OOP constructs:**
- `class` declarations and expressions
- Methods, constructors, getters, setters

**FP constructs:**
- `function` declarations and expressions
- Arrow functions (`=>`)

Arrow functions and function expressions inside class bodies are excluded from the FP count (they're part of the class implementation).

## Usage

```bash
# Install
git clone https://github.com/moritzWa/ts-oop-fp-ratio.git
cd ts-oop-fp-ratio
npm install

# Run on any codebase (no need to install its dependencies)
npx ts-node count.ts /path/to/your/project

# Exclude directories (comma-separated)
npx ts-node count.ts /path/to/project --exclude vendor,generated

# JSON output (for scripting)
npx ts-node count.ts /path/to/project --json
```

## Example output

```
Scanning: /path/to/project
Found 742 .ts/.tsx files
OOP: 3195 (546 classes + 2649 methods)
FP:  2375 (332 functions + 2043 arrows)
Ratio (OOP:FP): 1.35:1
Files: 742
```

## Example comparison

Analysis of several open-source TypeScript projects:

```
Project                    OOP:FP Ratio    OOP        FP
---------------------------------------------------------------
NestJS backend             1.35 : 1       3,195      2,375
Cal.com                    0.18 : 1       7,082     39,887
Zero (Mail-0)              0.15 : 1         460      2,989
Plane                      0.11 : 1       1,351     12,411
Langfuse                   0.05 : 1         840     16,864
Documenso                  0.01 : 1         108      8,377
Formbricks                 0.01 : 1         149     16,527
Next.js frontend           0.01 : 1          69     10,033
```

Most TypeScript codebases are heavily functional (0.01 to 0.18:1). NestJS projects are a notable exception due to the framework's decorator-based class patterns.

## How it works

The script uses `ts.createSourceFile` to parse each `.ts`/`.tsx` file into an AST without type-checking. This means it works on any TypeScript file without needing the project's `node_modules` or `tsconfig.json`.

It then walks the AST tree and counts nodes by `SyntaxKind`:
- `ClassDeclaration`, `ClassExpression` -> OOP
- `MethodDeclaration`, `Constructor`, `GetAccessor`, `SetAccessor` (inside classes) -> OOP
- `FunctionDeclaration`, `FunctionExpression` (outside classes) -> FP
- `ArrowFunction` (outside classes) -> FP

Automatically skips `node_modules`, `dist`, `build`, `.next`, and other common non-source directories. Also skips `.d.ts` declaration files.

## License

MIT
