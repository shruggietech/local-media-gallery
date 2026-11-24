// SPDX-License-Identifier: Apache-2.0
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const app = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(app, "../..");
export const output = path.join(root, ".local", "portable");
const go = process.env.LMG_PORTABLE_GO || "go";
const web = path.join(app, "web");
const resolveWeb = createRequire(path.join(web, "package.json"));

export const targets = {
  "windows-x64": { goos: "windows", goarch: "amd64", ext: "zip", binary: "LocalMediaGallery.exe" },
  "linux-x64": { goos: "linux", goarch: "amd64", ext: "tar.gz", binary: "LocalMediaGallery" },
  "macos-arm64": { goos: "darwin", goarch: "arm64", ext: "tar.gz", binary: "LocalMediaGallery" },
};

export const hostTarget = { "win32-x64": "windows-x64", "linux-x64": "linux-x64", "darwin-arm64": "macos-arm64" }[process.platform + "-" + process.arch];

export function command(file, argv, options = {}) {
  const result = spawnSync(file, argv, { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024, timeout: process.env.LMG_PORTABLE_END ? Math.max(1, Number(process.env.LMG_PORTABLE_END) - Date.now()) : 180000, ...options });
  if (result.status !== 0) {
    throw new Error([file + " exited " + result.status, result.error?.message, result.stdout, result.stderr].filter(Boolean).join("\n"));
  }
  if (result.stderr) process.stderr.write(result.stderr);
  return result.stdout || "";
}

export function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function brandAssets() {
  const source = path.join(root, "brand", "kit");
  const target = path.join(web, "public", "brand");
  await mkdir(target, { recursive: true });
  for (const [from, to] of [
    ["logos/svg/localmedia-gallery-horizontal-color.svg", "logo-dark.svg"],
    ["logos/svg/localmedia-gallery-horizontal-light.svg", "logo-light.svg"],
    ["favicons/favicon.svg", "favicon.svg"],
  ]) await copyFile(path.join(source, from), path.join(target, to));
  await mkdir(path.join(target, "fonts"), { recursive: true });
  await copyFile(path.join(source, "fonts/fonts.css"), path.join(target, "fonts/fonts.css"));
  await cp(path.join(source, "fonts/woff2"), path.join(target, "fonts/woff2"), { recursive: true });
}

async function moduleNotices(staging, packageDir, env) {
  const to = path.join(packageDir, "Third-party");
  await mkdir(to);
  const save = async (directory, name) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !/^(?:license(?:\.(?:md|txt))?|copying|notice)$/i.test(entry.name)) continue;
      await copyFile(path.join(directory, entry.name), path.join(to, name.replace(/[^a-zA-Z0-9.-]/g, "-") + "-" + entry.name));
    }
  };
  const modules = command(go, ["list", "-mod=readonly", "-deps", "-f", "{{with .Module}}{{if not .Main}}{{.Path}}|{{.Dir}}{{end}}{{end}}", "."], { cwd: staging, env });
  for (const line of new Set(modules.trim().split(/\r?\n/))) {
    const [name, moduleDir] = line.split("|");
    if (moduleDir) await save(moduleDir, name);
  }
  for (const name of ["next", "react", "react-dom", "scheduler", "radix-ui", "lucide-react"]) {
    let directory = path.dirname(resolveWeb.resolve(name));
    while (directory !== path.dirname(directory)) {
      const manifest = await readFile(path.join(directory, "package.json"), "utf8").catch(() => null);
      if (manifest && JSON.parse(manifest).name === name) {
        await save(directory, name);
        break;
      }
      directory = path.dirname(directory);
    }
  }
  const goRoot = command(go, ["env", "GOROOT"], { cwd: staging }).trim();
  await save(goRoot, "go");
  await cp(path.join(root, "brand", "kit", "fonts", "licenses"), path.join(to, "fonts"), { recursive: true });
}

export async function build(selected) {
  if (selected.length === 0 || selected.some(target => !targets[target])) throw new Error("Choose native, all, windows-x64, linux-x64, or macos-arm64.");
  const sha = command("git", ["rev-parse", "HEAD"]).trim();
  const dirty = command("git", ["status", "--porcelain"]).trim() !== "";
  const revision = sha + (dirty ? "-dirty" : "");
  await mkdir(output, { recursive: true });
  const staging = await mkdtemp(path.join(output, "build-"));
  await brandAssets();
  process.stdout.write(command(process.execPath, [resolveWeb.resolve("next/dist/bin/next"), "build", web], {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  }));
  for (const file of await readdir(app)) {
    if (file.endsWith(".go") || file === "go.mod" || file === "go.sum") await copyFile(path.join(app, file), path.join(staging, file));
  }
  await cp(path.join(web, "out"), path.join(staging, "ui", "dist"), { recursive: true });
  const buildEnv = { ...process.env, CGO_ENABLED: "0" };
  process.stdout.write(command(go, ["test", "-mod=readonly", "./..."], { cwd: staging, env: buildEnv }));
  for (const name of selected) {
    const target = targets[name];
    const packageDir = path.join(staging, name);
    await mkdir(packageDir);
    const flags = "-s -w -X main.sourceRevision=" + revision + (target.goos === "windows" ? " -H=windowsgui" : "");
    process.stdout.write(command(go, ["build", "-mod=readonly", "-trimpath", "-buildvcs=false", "-ldflags", flags,
      "-o", path.join(packageDir, target.binary), "."], {
      cwd: staging, env: { ...buildEnv, GOOS: target.goos, GOARCH: target.goarch },
    }));
    await copyFile(path.join(app, "README.md"), path.join(packageDir, "README.md"));
    for (const file of ["LICENSE", "NOTICE"]) await copyFile(path.join(root, file), path.join(packageDir, file));
    await copyFile(path.join(root, "brand", "kit", "LICENSE-BRAND.md"), path.join(packageDir, "LICENSE-BRAND.md"));
    await moduleNotices(staging, packageDir, { ...buildEnv, GOOS: target.goos, GOARCH: target.goarch });
    const binaryHash = digest(await readFile(path.join(packageDir, target.binary)));
    await writeFile(path.join(packageDir, "BUILD.json"), JSON.stringify({
      revision, target: name, executable: target.binary, sha256: binaryHash,
    }, null, 2) + "\n", "utf8");
    const archive = "local-media-gallery-" + name + "-" + sha.slice(0, 12) + (dirty ? "-dirty" : "") + "." + target.ext;
    const archivePath = path.join(output, archive);
    if (process.platform === "win32" && target.ext === "tar.gz") {
      // Windows staging does not preserve the executable mode required on Unix.
      command(process.env.LMG_PORTABLE_PYTHON || "python.exe", [path.join(app, "pack-unix.py"), packageDir, archivePath, target.binary]);
    } else {
      command("tar", [target.ext === "zip" ? "-acf" : "-czf", archivePath, "-C", packageDir, "."]);
    }
    const archiveHash = digest(await readFile(archivePath));
    await writeFile(archivePath + ".sha256", archiveHash + "  " + archive + "\n", "utf8");
    console.log(archivePath);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const selection = process.argv.slice(2);
  if (selection[0] === "all") await build(Object.keys(targets));
  else await build(selection.length && selection[0] !== "native" ? selection : [hostTarget]);
}
