/**
 * Enumerates the test files and runs them through tsx.
 *
 * The script used to be `tsx --test tests/**‌/*.test.ts`, which depended on
 * something expanding that pattern. `sh` does not (globstar is off), so the
 * literal reached tsx, which expands patterns using `fs.glob` — added in Node
 * 22. On Node 20, which is what `engines.node` declares and what CI pins, tsx
 * could not expand it either, so `npm test` matched nothing and exited 1
 * having run zero tests. It passed locally purely because this machine runs
 * Node 22.
 *
 * Enumerating here removes the dependency on both the shell and the Node
 * version: `readdirSync(..., { recursive: true })` is available from Node 20.
 */
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const testsDir = join(root, "tests");

const files = readdirSync(testsDir, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.ts"))
  .map((entry) => relative(root, join(entry.parentPath ?? entry.path, entry.name)))
  .sort();

if (files.length === 0) {
  console.error("No test files found under tests/. That is a failure, not an empty pass.");
  process.exit(1);
}

const result = spawnSync("npx", ["tsx", "--test", ...files], { stdio: "inherit", cwd: root, shell: process.platform === "win32" });
process.exit(result.status ?? 1);
