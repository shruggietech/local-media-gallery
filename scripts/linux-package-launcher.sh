#!/bin/sh
# NAME
#     local-media-gallery Linux recipient entrypoint
# SYNOPSIS
#     local-media-gallery [native operation and directory arguments]
# DESCRIPTION
#     Checks target architecture and native ELF closure before exec. Argument,
#     wait/detach and machine-result semantics belong to the native application.
# OPTIONS
#     Native --help/--version and operation arguments are forwarded unchanged.
# EXAMPLES
#     ./local-media-gallery
#     ./local-media-gallery resolve '/gallery path' --json
# EXIT CODES
#     2 means a pre-ELF prerequisite is unavailable. After exec, native codes apply.
# AUTHOR
#     ShruggieTech
# COMPATIBILITY
#     Ubuntu 24.04 amd64, POSIX /bin/sh and declared host native libraries.
#
set -eu

#_______________________________________________________________________________
# Declare Functions

    prerequisite_failure() {
        printf '%s\n' "prerequisite_unavailable: $* Use Ubuntu 24.04 x86_64 with GTK3, WebKitGTK4.1, libsoup3 and the declared GStreamer media plugins. Full prerequisites are resolved by apt install --reinstall ./FULL.deb; Lite uses that host runtime. See PREREQUISITES.txt." >&2
        exit 2
    }

#_______________________________________________________________________________
# Declare Variables and Arrays

    [ -x /usr/bin/uname ] || prerequisite_failure 'Host uname unavailable.'
    [ "$(/usr/bin/uname -m)" = x86_64 ] || prerequisite_failure 'Wrong CPU architecture.'
    launcher_path=$(/usr/bin/readlink -f -- "$0") || prerequisite_failure 'Entrypoint location unavailable.'
    launcher_directory=${launcher_path%/*}
    binary=@BINARY@
    loader=/lib64/ld-linux-x86-64.so.2

#_______________________________________________________________________________
# Execute Operations

    if [ ! -f "$binary" ] || [ ! -x "$binary" ] || [ -L "$binary" ]; then
        prerequisite_failure 'Ordinary application ELF is missing, linked or not executable.'
    fi
    [ -x "$loader" ] || prerequisite_failure 'GNU x86_64 dynamic loader is missing.'
    "$loader" --verify "$binary" || prerequisite_failure 'Application ELF/ABI cannot be loaded.'
    if ! closure=$("$loader" --list "$binary" 2>&1); then
        prerequisite_failure "Native library resolution failed: $closure"
    fi
    exec "$binary" "$@"

#_______________________________________________________________________________
# End of script
