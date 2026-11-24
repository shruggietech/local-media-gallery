// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { build, command, hostTarget, output } from "./build.mjs";
import { smoke } from "./smoke.mjs";

const target = process.argv[2] || hostTarget;
assert.equal(target, hostTarget, "The runner must match the candidate target.");
await mkdir(output, { recursive: true });
const now = new Date().toISOString();
const started = performance.now();
const preparationStart = process.env.LMG_PORTABLE_PREPARATION_STARTED || now;
process.env.LMG_PORTABLE_END = String(Date.now() + 885000);
const hold = setTimeout(() => {
  console.error("Candidate qualification exhausted its finalization reserve.");
  process.exit(1);
}, 885000);

try {
  if (process.env.GITHUB_ACTIONS && target === "linux-x64") {
    process.stdout.write(command(process.execPath, ["scripts/check.mjs"]));
    process.stdout.write(command(process.execPath, ["--test", "tests/*.test.mjs"]));
    process.stdout.write(command(process.execPath, ["scripts/check-docs.mjs"]));
  }
  await build([target]);
  const extension = target === "windows-x64" ? ".zip" : ".tar.gz";
  const source = command("git", ["rev-parse", "--short=12", "HEAD"]).trim();
  const matches = (await readdir(output)).filter(name => name.startsWith("local-media-gallery-" + target + "-" + source) && name.endsWith(extension));
  const expected = matches.find(name => !name.includes("-dirty")) ?? matches[0];
  assert.ok(expected, "Archive was generated");
  await smoke(target, path.join(output, expected));
} finally {
  clearTimeout(hold);
  const seconds = Number(((performance.now() - started) / 1000).toFixed(3));
  const finished = new Date().toISOString();
  await writeFile(path.join(output, "evidence-" + target + "-timing.json"), JSON.stringify({
    preparationStarted: preparationStart, qualificationStarted: now, finished,
    preparationSeconds: (Date.parse(now) - Date.parse(preparationStart)) / 1000,
    qualificationSeconds: seconds, combinedSeconds: (Date.parse(finished) - Date.parse(preparationStart)) / 1000, targetSeconds: 660, hardLimitSeconds: 900, reserveSeconds: 15,
  }, null, 2) + "\n").catch(() => {});
  if (seconds > 660) console.warn("Qualification exceeded its advisory target.");
  if (seconds > 900) throw new Error("Qualification exceeded its hard limit.");
}
