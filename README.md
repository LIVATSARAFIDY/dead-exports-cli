# dead-exports-cli

A TypeScript CLI that detects exports that are not used anywhere else in a project.

`dead-exports-cli` uses [ts-morph](https://ts-morph.com/) to analyze the TypeScript AST and track references to exported declarations.

The goal is to identify potentially dead exports while avoiding false positives caused by re-exports and TypeScript type references.

## Features

- Detect unused exported functions and classes
- Detect unused variables and constants
- Detect unused interfaces and type aliases
- Follow direct imports
- Follow aliased imports
- Handle barrel files
- Handle `export { ... }`
- Handle `export *`
- Follow chains of re-exports
- Handle default exports
- Handle TypeScript type references
- Handle type operators such as `keyof` and `typeof`
- Handle namespace imports
- Ignore files matching user-defined path patterns
- Output results as human-readable text or JSON
- Return meaningful exit codes for CI usage

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

The CLI is then available through:

```bash
node dist/cli.js
```

During development, you can run it directly with:

```bash
npm run dev -- ./path/to/tsconfig.json
```

## Usage

Basic analysis:

```bash
dead-exports ./tsconfig.json
```

Or, when running the built CLI directly:

```bash
node dist/cli.js ./tsconfig.json
```

### Example

Given:

```ts
// utils.ts

export function usedFunction() {
  return "used";
}

export function unusedFunction() {
  return "unused";
}
```

and:

```ts
// app.ts

import { usedFunction } from "./utils.js";

console.log(usedFunction());
```

Running the analyzer reports:

```text
X 1 export inutilisé détecté :

unusedFunction
  Déclaré dans : src/utils.ts:5
```

If every export is used:

```text
OK Aucun export inutilisé détecté.
```

## Ignoring files

Use `--ignore` to exclude files whose paths contain one of the specified patterns:

```bash
dead-exports ./tsconfig.json --ignore index.ts main.ts
```

This can be useful for entry points, public API files, or other files whose exports are intentionally exposed.

## JSON output

Use `--json` to get machine-readable results:

```bash
dead-exports ./tsconfig.json --json
```

Example:

```json
[
  {
    "filePath": "/project/src/utils.ts",
    "name": "unusedFunction",
    "kind": "FunctionDeclaration",
    "line": 5,
    "reExports": []
  }
]
```

This mode is intended for scripts and CI pipelines.

## Exit codes

The CLI uses different exit codes depending on the result:

| Exit code | Meaning |
| --- | --- |
| `0` | No unused exports detected |
| `1` | One or more unused exports detected |
| `2` | An error occurred during analysis |

This makes the CLI suitable for automated checks:

```bash
dead-exports ./tsconfig.json
```

A CI job can therefore fail when unused exports are detected.

## What is analyzed?

The analyzer works with TypeScript declarations and their references.

Examples include:

### Direct imports

```ts
import { User } from "./types.js";
```

### Aliased imports

```ts
import { User as AdminUser } from "./types.js";
```

### Barrel files

```ts
export { User } from "./types.js";
```

### Star re-exports

```ts
export * from "./types.js";
```

### Re-export chains

```text
types.ts
   ↓
public-api.ts
   ↓
index.ts
   ↓
app.ts
```

The analyzer follows these relationships back to the original declaration.

### TypeScript type references

The analyzer also considers references such as:

```ts
interface Admin extends User {}
```

```ts
type AdminId = UserId;
```

```ts
type UserKeys = keyof User;
```

```ts
type UserConstructor = typeof UserClass;
```

```ts
class Admin implements User {}
```

These cases are important because a type declaration can be genuinely used without appearing in a normal runtime import or expression.

## False-positive protection

Static analysis can easily produce incorrect results if references are interpreted too simply.

The test suite therefore includes dedicated cases for situations such as:

- namespace imports
- `extends`
- `implements`
- `keyof`
- `typeof`
- generic constraints
- function types
- cross-file type references
- multiple declarations with the same name

For example, two different files can legitimately contain declarations with the same name:

```text
users.ts  → User
admins.ts → User
```

The analyzer identifies declarations by their source location rather than relying only on the symbol name.

## Project structure

```text
src/
├── analyzer.ts
├── cli.ts
├── references.ts
└── types.ts

tests/
└── analyzer.test.ts

fixture/
└── ...
```

### `src/analyzer.ts`

Builds the export chains and determines which declarations have no usages.

### `src/references.ts`

Analyzes references to declarations and distinguishes between:

- normal usages
- re-exports

### `src/types.ts`

Contains the shared TypeScript types used by the analyzer.

### `src/cli.ts`

Provides the command-line interface and exit-code behavior.

### `tests/`

Contains the automated test suite and TypeScript fixtures used to validate the analyzer.

## Development

Run the test suite:

```bash
npm test
```

Build the project:

```bash
npm run build
```

Run the CLI directly from TypeScript:

```bash
npm run dev -- ./fixture/direct-import/tsconfig.json
```

## Test coverage

The test suite contains scenarios covering:

- direct imports
- barrel files
- aliased re-exports
- star re-exports
- chained re-exports
- default exports
- local exports
- exported variables
- interfaces
- type aliases
- type unions
- type intersections
- generic constraints
- `implements`
- function types
- cross-file type references
- namespace imports
- `keyof`
- `typeof`
- class inheritance
- same-name declarations

The fixtures are intentionally small and isolated so that each behavior can be tested independently.

## Technology

- Node.js
- TypeScript
- ts-morph
- Commander
- Chalk
- Vitest

## Limitations

`dead-exports-cli` is a static analyzer, not a complete semantic understanding of every possible TypeScript application.

In particular, some exports may be intentionally public even when they are not referenced inside the analyzed project.

Examples include:

- library public APIs
- framework conventions
- dynamically loaded modules
- entry points
- exports consumed by external applications

For this reason, the CLI provides the `--ignore` option and reports **potentially unused exports** rather than automatically deleting code.

The tool does not modify source files.

## License

MIT
```