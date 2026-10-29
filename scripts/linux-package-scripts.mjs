// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {validateLinuxFile} from './linux-packages.mjs';
const guard=readFileSync(new URL('./linux-package-guard.sh',import.meta.url),'utf8');
const launcher=readFileSync(new URL('./linux-package-launcher.sh',import.meta.url),'utf8');
export function renderLauncher(edition){assert.ok(['full','lite'].includes(edition));return launcher.replace('@BINARY@',edition==='full'?'"$launcher_directory/../lib/local-media-gallery/local-media-gallery.bin"':'"$launcher_directory/local-media-gallery.bin"');}
export function renderMaintainerScripts(files){
 assert.ok(Array.isArray(files)&&files.length>0&&files.length<=4097);assert.equal(new Set(files.map(f=>f.path)).size,files.length);for(const f of files)validateLinuxFile(f,'full');
 const authority=files.map(f=>[f.sha256,f.mode,f.bytes,'/'+f.path].join('|')).join('\n');
 const operations={
 preinst:['    case "$operation" in','        install)','            registered_state','            [ "${2:-0.0.0}" = 0.0.0 ] || fail "Different removed predecessor version."','            fresh_install ;;','        upgrade)','            [ "${2:-}" = 0.0.0 ] || fail "Different installed predecessor version."','            verify_owned ;;','        abort-upgrade) : ;;','        *) fail "Unknown preinst operation: $operation." ;;','    esac'],
 prerm:['    case "$operation" in','        remove|upgrade|failed-upgrade|deconfigure) verify_owned ;;','        *) fail "Unknown prerm operation: $operation." ;;','    esac'],
 postinst:['    case "$operation" in','        configure)','            verify_owned','            native_identity=$(/usr/bin/local-media-gallery --version --json) || fail "Installed native identity failed."','            case "$native_identity" in','                *\\"edition\\":\\"full\\"*) : ;;','                *) fail "Installed edition identity differs." ;;','            esac','            printf \'%s\\n\' \'Verified Local Media Gallery Full 0.0.0 amd64 payload and native identity.\' ;;','        abort-remove|abort-upgrade|abort-deconfigure) : ;;','        *) fail "Unknown postinst operation: $operation." ;;','    esac'],
 postrm:['    case "$operation" in','        remove|purge) walk_files removed ;;','        upgrade|failed-upgrade|abort-install|abort-upgrade|disappear) : ;;','        *) fail "Unknown postrm operation: $operation." ;;','    esac']};
 return Object.fromEntries(Object.entries(operations).map(([name,lines])=>[name,guard.replace('@EXPECTED_FILES@',authority).replace('@OPERATIONS@',lines.join('\n'))]));
}
