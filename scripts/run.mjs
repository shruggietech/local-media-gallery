// SPDX-License-Identifier: Apache-2.0
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { access, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const app = path.join(root, 'apps/gallery');
const localPython = path.join(root, '.local/python', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
export const python = process.env.PYTHON ?? (existsSync(localPython) ? localPython : 'python');
const workspaceTemp = path.join(root, '.local/tmp');
if (process.platform === 'win32') await mkdir(workspaceTemp, { recursive: true });
export const environment = {
  ...process.env, ...(process.platform === 'win32' ? { TMP: workspaceTemp, TEMP: workspaceTemp } : {}), CI: 'true', NEXT_TELEMETRY_DISABLED: '1', npm_config_yes: 'false',
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.join(root, '.local/browsers'),
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require="${path.join(root, 'scripts/hide-console.cjs').replaceAll('\\', '/')}"`.trim(),
};
let executionDeadline = null;
export function setExecutionDeadline(value) { executionDeadline = value; }
export function execute(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    if (executionDeadline !== null && Date.now() >= executionDeadline) return reject(new Error('Qualification deadline reached before child admission'));
    const child = spawn(file, args, { cwd: root, env: environment, windowsHide: true, shell: false, stdio: 'inherit', detached: process.platform !== 'win32', ...options });
    let timedOut = false;
    const timer = executionDeadline === null ? null : setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32') {
        const terminator = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, shell: false, stdio: 'ignore' });
        terminator.once('error', () => child.kill());
      } else { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
    }, Math.max(1, executionDeadline - Date.now()));
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', (code, signal) => { clearTimeout(timer); timedOut ? reject(new Error(`Qualification deadline terminated ${path.basename(file)} (${code ?? signal})`)) : code === 0 ? resolve() : reject(new Error(`${path.basename(file)} exited ${code ?? signal}`)); });
  });
}
export const node = (script, args = [], options = {}) => execute(process.execPath, [script, ...args], options);
export const cargo = (args) => execute('cargo', args);
export async function exportInterface() {
  await node(path.join(root, 'scripts/stage-brand.mjs'));
  await node(path.join(root, 'node_modules/next/dist/bin/next'), ['build', '--webpack'], { cwd: app });
  // Next may rewrite these tracked configuration files using Windows line endings.
  for (const name of ['tsconfig.json', 'next-env.d.ts']) {
    const file = path.join(app, name);
    await writeFile(file, (await readFile(file, 'utf8')).replaceAll('\r\n', '\n'), 'utf8');
  }
}
export async function buildEditions({ nativeTests = false } = {}) {
  const directory=path.join(root,'.local/bin');await mkdir(directory,{recursive:true});const binaries={};
  for(const edition of ['full','lite']){
    const features=[...(nativeTests?['native-tests']:[]),...(edition==='lite'?['lite']:[])];
    await cargo(['build','--locked','-p','local-media-gallery',...(features.length?['--features',features.join(',')]:[])]);
    const suffix=process.platform==='win32'?'.exe':'';
    const name='local-media-gallery'+(edition==='lite'?'-lite':'')+(nativeTests?'-native-tests':'')+suffix;
    const output=path.join(directory,name);await copyFile(path.join(root,'target/debug/local-media-gallery'+suffix),output);binaries[edition]=output;
  }
  return binaries;
}
export async function checkApp() {
  await cargo(['fmt', '--all', '--', '--check']);
  await cargo(['test', '--locked', '-p', 'gallery-core']);
  await cargo(['test', '--locked', '-p', 'gallery-windows-package']);
  await cargo(['test', '--locked', '-p', 'gallery-macos-package']);
  await cargo(['clippy', '--locked', '--workspace', '--all-targets', '--', '-D', 'warnings']);
  await node(path.join(root, 'node_modules/typescript/bin/tsc'), ['--project', path.join(app, 'tsconfig.json')]);
  await node(path.join(root, 'node_modules/eslint/bin/eslint.js'), ['src', '--config', 'eslint.config.mjs'], { cwd: app });
  await node(path.join(root, 'node_modules/stylelint/bin/stylelint.mjs'), ['src/**/*.css', '--config', '../../brand/kit/enforcement/stylelint.config.json'], { cwd: app });
  await node(path.join(root, 'scripts/check-brand.mjs'));
}
async function main(command, rest) {
  switch (command) {
    case 'check-app': return checkApp();
    case 'export': return exportInterface();
    case 'build-app':
      await exportInterface();
      return cargo(['build', '--locked', '-p', 'local-media-gallery']);
    case 'test-native':
      await access(path.join(app, 'out/index.html'));
      await cargo(['build', '--locked', '-p', 'local-media-gallery', '--features', 'native-tests']);
      return node(path.join(root, 'scripts/test-native.mjs'));
    case 'app':
      await exportInterface();
      return cargo(['run', '--locked', '-p', 'local-media-gallery', '--', ...rest]);
    default: throw new Error('Unknown maintainer command. Use check-app, export, build-app, test-native or app.');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2], process.argv.slice(3)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
