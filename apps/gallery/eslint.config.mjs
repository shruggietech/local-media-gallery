// SPDX-License-Identifier: Apache-2.0
import brand from '../../brand/kit/enforcement/eslint.brand.mjs';
import parser from '@typescript-eslint/parser';
export default [
  ...brand,
  { ignores: ['**/node_modules/**', '**/.next/**', '**/out/**', '**/public/brand/**', '**/src-tauri/**'] },
  { files: ['src/**/*.{ts,tsx}'], languageOptions: { parser } },
];
