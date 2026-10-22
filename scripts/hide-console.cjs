// SPDX-License-Identifier: Apache-2.0
// Inherited by Node tooling workers. No shell or interactive console is needed.
const cp = require('node:child_process');
for (const method of ['spawn', 'spawnSync']) {
  const original = cp[method];
  cp[method] = (file, args, options) => original(file, args, { ...options, windowsHide: true });
}
