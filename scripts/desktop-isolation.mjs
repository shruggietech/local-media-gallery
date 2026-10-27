// SPDX-License-Identifier: Apache-2.0
/** Focus-changing acceptance belongs on an isolated runner, never the owner's desktop. */
export function requireIsolatedDesktop(env=process.env){
 if(env.GITHUB_ACTIONS!=='true'||env.GALLERY_ISOLATED_DESKTOP!=='1')throw new Error('Native interactive qualification requires an explicitly isolated CI desktop; active workstation focus must not be changed.');
}
