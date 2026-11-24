// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { chmod, copyFile, mkdir, mkdtemp, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { Resvg } from "@resvg/resvg-js";
import { app, command, digest, hostTarget, output, root, targets } from "./build.mjs";

const terminal = child => new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", (code, signal) => resolve({ code, signal }));
});

async function withDeadline(promise, milliseconds, description) {
  let timeout;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(description + " timed out")), milliseconds);
    })]);
  } finally {
    clearTimeout(timeout);
  }
}

async function readyAddress(child) {
  let text = "";
  for await (const data of child.stdout.iterator({ destroyOnReturn: false })) {
    text += data;
    const found = text.match(/http:\/\/127\.0\.0\.1:\d+\/start\/[A-Z2-7]+/);
    if (found) return found[0];
  }
  throw new Error("The portable host did not report its loopback address.");
}

function image(hex) {
  return new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96"><rect width="160" height="96" fill="' +
    hex + '"/></svg>').render().asPng();
}

async function readOnly(directory) {
  if (process.platform === "win32") {
    const identity = command("whoami.exe", ["/user", "/fo", "csv", "/nh"]);
    const sid = identity.match(/S-1-(?:\d+-)*\d+/)?.[0];
    assert.ok(sid, "Windows test user SID");
    command("icacls.exe", [directory, "/deny", "*" + sid + ":(OI)(CI)(WD,AD,WEA,WA,DE,DC)"]);
    return () => command("icacls.exe", [directory, "/remove:d", "*" + sid]);
  }
  await chmod(directory, 0o555);
  return () => chmod(directory, 0o755);
}

async function pixel(locator) {
  return locator.evaluate(async img => {
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const brush = canvas.getContext("2d");
    brush.drawImage(img, 0, 0, 1, 1);
    return Array.from(brush.getImageData(0, 0, 1, 1).data);
  });
}

async function seek(locator) {
  return locator.evaluate(async video => {
    const listen = name => new Promise((resolve, reject) => {
      const limit = setTimeout(() => reject(new Error("Video " + name + " timed out")), 10000);
      video.addEventListener(name, () => { clearTimeout(limit); resolve(); }, { once: true });
      video.addEventListener("error", () => { clearTimeout(limit); reject(new Error(video.error?.message)); }, { once: true });
    });
    if (video.readyState < 1) await listen("loadedmetadata");
    video.pause();
    const moved = listen("seeked");
    video.currentTime = 1.4;
    await moved;
    await video.play();
    if (video.readyState < 2) await listen("loadeddata");
    const frame = new Promise(resolve => video.requestVideoFrameCallback(() => resolve()));
    await Promise.race([frame, new Promise((_, reject) => setTimeout(() => reject(new Error("No decoded video frame")), 5000))]);
    video.pause();
    return { width: video.videoWidth, duration: video.duration, position: video.currentTime };
  });
}

export async function smoke(target, archive) {
  assert.equal(target, hostTarget, "Smoke must run on the package target");
  const scratch = await mkdtemp(path.join(output, "smoke-"));
  const primary = path.join(scratch, "Extracted candidate");
  const secondary = path.join(scratch, "Read only second gallery");
  const profile = path.join(scratch, "Profile");
  const screenshots = path.join(output, "evidence-" + target);
  await mkdir(screenshots, { recursive: true });
  await Promise.all([primary, secondary, profile].map(dir => mkdir(dir)));
  const archiveHash = digest(await readFile(archive));
  assert.equal((await readFile(archive + ".sha256", "utf8")).split(" ")[0], archiveHash);
  let archiveExtraction = "tar";
  if (target === "windows-x64") {
    const extract = await readFile(path.join(app, "extract-windows-zip.ps1"), "utf8");
    archiveExtraction = command("powershell.exe", ["-NoProfile", "-NonInteractive", "-Sta", "-Command", extract], {
      env: { ...process.env, LMG_PORTABLE_ZIP: archive, LMG_PORTABLE_ZIP_DESTINATION: primary },
      timeout: 30000,
    }).trim();
  } else {
    command("tar", ["-xf", archive, "-C", primary]);
  }
  const executable = path.join(primary, targets[target].binary);
  const build = JSON.parse(await readFile(path.join(primary, "BUILD.json"), "utf8"));
  assert.equal(build.target, target);
  assert.equal(build.executable, path.basename(executable));
  assert.equal(digest(await readFile(executable)), build.sha256);
  assert.equal(command(executable, ["--version"]).trim().split(" ").at(-1), build.revision);
  if (process.env.GITHUB_SHA) assert.equal(build.revision, process.env.GITHUB_SHA);

  const nested = path.join(primary, "Nested space", "Café");
  await mkdir(nested, { recursive: true });
  const red = path.join(nested, "red.png");
  const sidecar = red + ".json";
  const clip = path.join(nested, "silent.mp4");
  const removed = path.join(primary, "remove.png");
  const added = path.join(primary, "added.png");
  const blue = path.join(secondary, "red.png");
  const asset = { red: image("#ff0000"), blue: image("#0000ff"), other: image("#408d7d") };
  const sidecarText = '{"keep":"original"}\n';
  await Promise.all([
    writeFile(red, asset.red), writeFile(blue, asset.blue), writeFile(removed, asset.other),
    writeFile(sidecar, sidecarText), copyFile(path.join(app, "fixtures", "silent.mp4"), clip),
  ]);
  const originals = new Map(await Promise.all([red, blue, sidecar, clip].map(async file => [file, digest(await readFile(file))])));
  const restore = await readOnly(secondary);
  let child, ended, browser, page, context;
  let processError = "";
  const observations = [];
  const external = [];
  let url;
  const start = async () => {
    child = spawn(executable, ["--no-open"], {
      cwd: scratch, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, APPDATA: profile, LOCALAPPDATA: profile, XDG_CONFIG_HOME: profile, HOME: profile },
    });
    ended = terminal(child);
    child.stderr.on("data", chunk => { processError += chunk; });
    const address = await withDeadline(readyAddress(child), 10000, "Portable host startup");
    url = new URL(address);
    await page.goto(address);
  };
  const state = async () => {
    const response = await context.request.get(url.origin + "/api/state");
    assert.equal(response.status(), 200);
    return response.json();
  };
  const card = name => page.getByRole("button", { name, exact: true });
  const modal = name => page.getByRole("dialog", { name });
  const waitFor = async (selector, options = {}) => selector.waitFor({ timeout: 10000, ...options });
  const stop = async () => {
    await card("Settings").click();
    await modal("Settings").getByRole("button", { name: "Quit Local Media Gallery" }).click();
    const result = await withDeadline(ended, 10000, "Portable host shutdown");
    assert.deepEqual(result, { code: 0, signal: null });
  };
  const steps = [];
  try {
    await assert.rejects(writeFile(path.join(secondary, "write-probe"), "probe", { flag: "wx" }), /EACCES|EPERM|EROFS/);
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1360, height: 850 }, reducedMotion: "reduce" });
    await context.route("**/*", route => {
      if (new URL(route.request().url()).origin === url.origin) return route.continue();
      external.push(new URL(route.request().url()).origin);
      return route.abort();
    });
    page = await context.newPage();
    page.on("pageerror", e => observations.push(e.message));
    await start();

    await waitFor(card("red.png"));
    await waitFor(page.getByRole("navigation", { name: "Folders" }).getByRole("button", { name: /Nested space/ }));
    await page.getByRole("navigation", { name: "Folders" }).getByRole("button", { name: /Nested space/ }).click();
    await waitFor(card("remove.png"), { state: "hidden" });
    await page.getByRole("navigation", { name: "Folders" }).getByRole("button", { name: /All Media/ }).click();
    await waitFor(card("remove.png"));
    await card("List view").click();
    await waitFor(page.locator(".list-row").first());
    await card("Tiled view").click();
    await waitFor(page.locator(".tile").first());
    await card("Grid view").click();
    await waitFor(page.locator(".tile").first());
    const search = page.getByRole("searchbox", { name: "Search" });
    await search.fill("impossible-name");
    await waitFor(page.getByRole("heading", { name: "Nothing matches" }));
    await search.fill("red.png");
    await waitFor(card("red.png"));
    await card("red.png").focus();
    await page.keyboard.press("Enter");
    const open = modal("red.png");
    await waitFor(open);
    assert.deepEqual(await pixel(open.getByRole("img", { name: "red.png" })), [255, 0, 0, 255]);
    await page.screenshot({ path: path.join(screenshots, "viewer.png") });
    await page.keyboard.press("Tab");
    assert.equal(await open.evaluate(dialog => dialog.contains(document.activeElement)), true);
    await open.getByRole("button", { name: "Add to favorites" }).click();
    await waitFor(open.getByRole("button", { name: "Remove from favorites" }));
    await page.keyboard.press("Escape");
    await waitFor(open, { state: "hidden" });
    assert.equal(await card("red.png").evaluate(node => node === document.activeElement), true);
    await search.fill("silent.mp4");
    await card("silent.mp4").click();
    const video = modal("silent.mp4");
    const playback = await seek(video.locator("video"));
    assert.equal(playback.width, 160);
    assert.equal(playback.duration, 4);
    assert.ok(playback.position >= 1.4 && playback.position < 4);
    await page.keyboard.press("Escape");
    await search.fill("");
    await page.screenshot({ path: path.join(screenshots, "gallery.png") });
    steps.push("automatic recursive open, folder tree, search, grid, tiled, list, fixture pixels, focus, favorite, MP4 seek");

    const before = await state();
    const former = before.assets.find(item => item.path.endsWith("/red.png"));
    const formerPath = "/media/" + [before.generation, former.id, former.revision].join("/");
    assert.equal((await context.request.get(url.origin + formerPath)).status(), 200);
    const privateDir = process.platform === "darwin" ? path.join(profile, "Library", "Application Support") : profile;
    const appState = path.join(privateDir, "local-media-gallery-portable");
    const [galleryState] = await readdir(appState);
    const database = new DatabaseSync(path.join(appState, galleryState, "gallery.sqlite"));
    await writeFile(added, asset.other);
    await unlink(removed);
    try {
      database.exec("CREATE TRIGGER smoke_fail BEFORE INSERT ON assets BEGIN SELECT RAISE(ABORT,'Interrupted snapshot'); END");
      await card("Refresh").click();
      await waitFor(page.getByRole("status").filter({ hasText: "Scan incomplete" }));
      await waitFor(card("remove.png"));
      assert.equal(await card("added.png").count(), 0);
    } finally {
      database.exec("DROP TRIGGER IF EXISTS smoke_fail");
      database.close();
    }
    await card("Refresh").click();
    await waitFor(card("added.png"));
    await waitFor(card("remove.png"), { state: "hidden" });
    steps.push("transactional rollback on failed refresh and recovery on a later refresh");

    await card("Open folder").click();
    await waitFor(modal("Open folder"));
    await modal("Open folder").getByRole("textbox", { name: "Folder path" }).fill(secondary);
    await modal("Open folder").getByRole("button", { name: "Open", exact: true }).click();
    await waitFor(modal("Open folder"), { state: "hidden" });
    await waitFor(card("red.png"));
    assert.equal((await context.request.get(url.origin + formerPath)).status(), 404);
    assert.equal((await context.request.put(url.origin + "/api/gallery/" + before.generation + "/config", { data: { theme: "light" } })).status(), 409);
    assert.equal((await fetch(url.origin + "/api/state")).status, 401);
    await card("red.png").click();
    assert.deepEqual(await pixel(modal("red.png").getByRole("img", { name: "red.png" })), [0, 0, 255, 255]);
    await page.keyboard.press("Escape");
    await stop();
    steps.push("typed folder switch, stale media and settings rejected, launch session required, read-only media, explicit quit");

    await start();
    await waitFor(card("red.png"));
    await card("Favorites").click();
    await waitFor(card("red.png"));
    await waitFor(card("added.png"), { state: "hidden" });
    await stop();
    steps.push("favorite persists after reopening the archive executable");
    for (const [file, hash] of originals) assert.equal(digest(await readFile(file)), hash, path.basename(file));
    assert.deepEqual(external, [], "Chromium product requests stay local");
    assert.deepEqual(observations, [], "Browser script errors");
    const result = { target, revision: build.revision, archive: path.basename(archive), archiveHash, executableHash: build.sha256,
      checks: steps, archiveExtraction, browser: browser.version(), nonLoopbackRequests: external.length, originalsPreserved: true };
    await writeFile(path.join(screenshots, "smoke.json"), JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    await page?.screenshot({ path: path.join(screenshots, "failure.png") }).catch(() => {});
    await writeFile(path.join(screenshots, "failure.json"), JSON.stringify({ error: String(error), processError, observations, steps }, null, 2) + "\n");
    throw error;
  } finally {
    await browser?.close();
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill();
      await withDeadline(ended, 3000, "Stop smoke-test host").catch(() => {});
    }
    await restore();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await smoke(process.argv[2], path.resolve(root, process.argv[3]));
}
