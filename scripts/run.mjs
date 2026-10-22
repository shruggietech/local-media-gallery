// SPDX-License-Identifier: Apache-2.0
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { access, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const app = path.join(root, 'apps/gallery');
const localPython = path.join(root, '.local/python', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
export const python = process.env.PYTHON ?? (existsSync(localPython) ? localPython : 'python');
export const environment = {
  ...process.env, CI: 'true', NEXT_TELEMETRY_DISABLED: '1', npm_config_yes: 'false',
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require="${path.join(root, 'scripts/hide-console.cjs').replaceAll('\\', '/')}"`.trim(),
};
export function execute(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { cwd: root, env: environment, windowsHide: true, shell: false, stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${path.basename(file)} exited ${code ?? signal}`)));
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
export async function checkApp() {
  await cargo(['fmt', '--all', '--', '--check']);
  await cargo(['test', '--locked', '-p', 'gallery-core']);
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
