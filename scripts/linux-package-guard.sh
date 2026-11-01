#!/bin/sh
# NAME
#     local-media-gallery Debian lifecycle guard template
# SYNOPSIS
#     Generated control script called by dpkg, never invoked interactively.
# DESCRIPTION
#     Exact candidate authority is inserted by the package builder. Only dpkg
#     owns file copy/removal. This prefix is not a standalone installer.
# OPTIONS
#     dpkg supplies the documented maintainer operation and version arguments.
# EXAMPLES
#     apt install --reinstall ./local-media-gallery-candidate.deb
#     apt remove local-media-gallery
# EXIT CODES
#     0 means this lifecycle guard passed; 1 means a conflict or check failure.
# AUTHOR
#     ShruggieTech
# COMPATIBILITY
#     Essential POSIX /bin/sh before unpack. No Bash arrays or pipefail.
#
set -eu
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LC_ALL=C
export PATH LC_ALL

#_______________________________________________________________________________
# Declare Functions

    fail() {
        printf '%s\n' "package_conflict ($operation): $* Inspect the retained state before retrying." >&2
        exit 1
    }

    check_parent() {
        file_parent=${1%/*}
        resolved_parent=$(/usr/bin/readlink -m -- "$file_parent") || fail "Cannot resolve $file_parent."
        [ "$resolved_parent" = "$file_parent" ] || fail "Redirected parent $file_parent."
        current_parent=$file_parent
        while [ "$current_parent" != / ]; do
            case "$checked_parents" in
                *"
$current_parent
"*) break ;;
            esac
            [ ! -L "$current_parent" ] || fail "Linked parent $current_parent."
            if [ -e "$current_parent" ]; then
                [ -d "$current_parent" ] || fail "Non-directory parent $current_parent."
                parent_stat=$(/usr/bin/stat -c '%u:%g:%a' -- "$current_parent") || fail "Cannot stat parent $current_parent."
                case "$parent_stat" in
                    0:0:*) parent_mode=${parent_stat##*:} ;;
                    *) fail "Non-root parent ownership: $current_parent." ;;
                esac
                [ $((0$parent_mode & 0022)) -eq 0 ] || fail "Writable foreign parent: $current_parent."
                checked_parents="$checked_parents$current_parent
"
            fi
            current_parent=${current_parent%/*}
            [ -n "$current_parent" ] || current_parent=/
        done
    }

    valid_version() {
        case "$1" in ''|*[!0-9.]*|.*|*..*|*.) return 1 ;; esac
        version_rest=$1
        version_count=0
        while :; do
            version_part=${version_rest%%.*}
            case "$version_part" in 0|[1-9]|[1-9][0-9]*) ;; *) return 1 ;; esac
            version_count=$((version_count + 1))
            [ "$version_rest" != "$version_part" ] || break
            version_rest=${version_rest#*.}
        done
        [ "$version_count" = 3 ]
    }

    registered_state() {
        expected_version=${1:-@PRODUCT_VERSION@}
        # dpkg-query expands its own literal format fields.
        # shellcheck disable=SC2016
        package_record=$(/usr/bin/dpkg-query -W --showformat='${db:Status-Status}|${Version}|${Architecture}' local-media-gallery 2>/dev/null) || { query_status=$?; [ "$query_status" = 1 ] || fail 'Package registry query failed.'; package_record=; }
        if [ -z "$package_record" ]; then
            package_state=not-installed
        else
            package_state=${package_record%%|*}
            package_rest=${package_record#*|}
            package_version=${package_rest%%|*}
            package_arch=${package_rest#*|}
            [ "$package_version" = "$expected_version" ] || fail "Registered version $package_version differs."
            [ "$package_arch" = amd64 ] || fail "Registered architecture $package_arch differs."
        fi
    }

    walk_files() {
        walk_mode=$1
        set --
        while IFS='|' read -r expected_hash expected_mode expected_size file; do
            check_parent "$file"
            if [ "$walk_mode" = absent ]; then
                if [ -e "$file" ] || [ -L "$file" ]; then
                    fail "Destination exists: $file."
                fi
            elif [ "$walk_mode" = removed ]; then
                if [ -e "$file" ] || [ -L "$file" ]; then
                    fail "Owned path remains after removal: $file."
                fi
            else
                if [ ! -f "$file" ] || [ -L "$file" ]; then
                    fail "Missing or linked owned file: $file."
                fi
                actual_stat=$(/usr/bin/stat -c '%a:%s:%u:%g' -- "$file") || fail "Cannot stat $file."
                [ "$actual_stat" = "$expected_mode:$expected_size:0:0" ] || fail "Changed size/mode: $file."
                actual_hash=$(/usr/bin/sha256sum -- "$file") || fail "Cannot hash $file."
                [ "${actual_hash%% *}" = "$expected_hash" ] || fail "Changed content/candidate: $file."
            fi
            set -- "$@" "$file"
        done <<'LMG_EXPECTED_FILES'
@EXPECTED_FILES@
LMG_EXPECTED_FILES
        [ "$walk_mode" != removed ] || return 0
        # Query all literal paths once. dpkg-query also reports diversions; those
        # rows cannot match the exclusive expected package-owner prefix below.
        if owner_report=$(/usr/bin/dpkg-query -S -- "$@" 2>/dev/null); then
            owner_status=0
        else
            owner_status=$?
            [ "$owner_status" = 1 ] || fail 'Package ownership query failed.'
        fi
        if [ "$walk_mode" = absent ]; then
            [ -z "$owner_report" ] || fail "Registered foreign/diverted destination: $owner_report"
        else
            [ "$owner_status" = 0 ] || fail 'Some owned files are not registered.'
            while IFS= read -r owner_line; do
                case "$owner_line" in
                    'local-media-gallery: /'*|'local-media-gallery:amd64: /'*) : ;;
                    *) fail "Different owner or diversion: $owner_line" ;;
                esac
            done <<LMG_OWNER_REPORT
$owner_report
LMG_OWNER_REPORT
        fi
    }

    check_visible_command() {
        visible_command=$(command -v local-media-gallery) || visible_command=
        if [ -n "$visible_command" ]; then
            resolved_command=$(/usr/bin/readlink -m -- "$visible_command") || fail "Cannot resolve visible command."
            [ "$resolved_command" = /usr/bin/local-media-gallery ] || fail "Visible foreign command: $visible_command."
        fi
    }

    fresh_install() {
        [ "$(/usr/bin/dpkg --print-architecture)" = amd64 ] || fail "Ubuntu 24.04 amd64 package required."
        check_parent /usr/lib/local-media-gallery/candidate.json
        if [ -e /usr/lib/local-media-gallery ] || [ -L /usr/lib/local-media-gallery ]; then
            if [ ! -d /usr/lib/local-media-gallery ] || [ -L /usr/lib/local-media-gallery ]; then
                fail "Foreign application destination."
            fi
            first_entry=$(/usr/bin/find /usr/lib/local-media-gallery -mindepth 1 -print -quit) || fail "Cannot inspect application destination."
            [ -z "$first_entry" ] || fail "Nonempty foreign application destination."
        fi
        app_owner=$(/usr/bin/dpkg-query -S -- /usr/lib/local-media-gallery 2>/dev/null) || { query_status=$?; [ "$query_status" = 1 ] || fail 'Application ownership query failed.'; app_owner=; }
        case "$app_owner" in
            ''|'local-media-gallery: /usr/lib/local-media-gallery'|'local-media-gallery:amd64: /usr/lib/local-media-gallery') : ;;
            *) fail "Registered foreign application destination: $app_owner" ;;
        esac
        check_visible_command
        walk_files absent
    }


    registered_paths() {
        [ "$#" -gt 0 ] || return 0
        owner_report=$(/usr/bin/dpkg-query -S -- "$@" 2>/dev/null) || fail 'Unregistered incoming/recovery destination.'
        while IFS= read -r owner_line; do
            case "$owner_line" in
                'local-media-gallery: /'*|'local-media-gallery:amd64: /'*) : ;;
                *) fail "Foreign owner/diversion: $owner_line" ;;
            esac
        done <<LMG_REGISTERED_PATHS
$owner_report
LMG_REGISTERED_PATHS
    }

    incoming_paths() {
        registered_state "$1"
        case "$package_state" in
            installed|half-installed|unpacked|half-configured|triggers-awaited|triggers-pending) ;;
            *) fail "Unowned transition state: $package_state." ;;
        esac
        check_visible_command
        set --
        while IFS='|' read -r expected_hash expected_mode expected_size file; do
            check_parent "$file"
            if [ -e "$file" ] || [ -L "$file" ]; then
                if [ ! -f "$file" ] || [ -L "$file" ]; then fail "Linked/nonregular incoming destination: $file."; fi
                set -- "$@" "$file"
            fi
        done <<'LMG_INCOMING_FILES'
@EXPECTED_FILES@
LMG_INCOMING_FILES
        registered_paths "$@"
    }

    recovery_owned() {
        authority=/run/local-media-gallery-update/authority
        if [ ! -f "$authority" ] || [ -L "$authority" ]; then fail 'No physical coordinator recovery authority.'; fi
        check_parent "$authority"
        [ "$(/usr/bin/stat -c '%u:%g:%a' -- /run/local-media-gallery-update)" = 0:0:700 ] || fail 'Foreign recovery directory.'
        [ "$(/usr/bin/stat -c '%u:%g:%a' -- "$authority")" = 0:0:600 ] || fail 'Foreign recovery record.'
        [ "$(/usr/bin/stat -c '%s' -- "$authority")" -le 8388608 ] || fail 'Oversized recovery record.'
        IFS='|' read -r protocol old_hash new_hash coordinator old_count new_count < "$authority"
        [ "$protocol" = LMG1 ] || fail 'Unknown recovery protocol.'
        case "$coordinator:$old_count:$new_count" in *[!0-9:]*|:*|*::*) fail 'Invalid recovery counters.' ;; esac
        if [ "$old_count" -le 0 ] || [ "$old_count" -gt 8192 ] || [ "$new_count" -le 0 ] || [ "$new_count" -gt 8192 ]; then fail 'Recovery inventory count.'; fi
        kill -0 "$coordinator" 2>/dev/null || fail 'Recovery coordinator is no longer active; run lmg-update recover.'
        [ "$(/usr/bin/wc -l < "$authority")" -eq "$((1 + old_count + new_count))" ] || fail 'Recovery inventory length.'
        old_end=$((old_count + 1))
        observed_old=$(/usr/bin/head -n "$old_end" -- "$authority" | /usr/bin/tail -n "$old_count" | /usr/bin/sha256sum)
        observed_new=$(/usr/bin/tail -n "$new_count" -- "$authority" | /usr/bin/sha256sum)
        if [ "${observed_old%% *}" != "$old_hash" ] || [ "${observed_new%% *}" != "$new_hash" ]; then fail 'Recovery inventory hashes changed.'; fi
        [ '@EXPECTED_HASH@' = "$old_hash" ] || [ '@EXPECTED_HASH@' = "$new_hash" ] || fail 'This package is outside the recovery operation.'
        registered_state "${1:-@PRODUCT_VERSION@}"
        case "$package_state" in installed|half-installed|unpacked|half-configured|triggers-awaited|triggers-pending) ;; *) fail 'Recovery package state differs.' ;; esac
        check_visible_command
        recovery_rows=$(/usr/bin/tail -n +2 -- "$authority") || fail 'Cannot read recovery rows.'
        set --
        while IFS='|' read -r _entry_hash _entry_mode _entry_size file; do
            case "$file" in /usr/lib/local-media-gallery/*|/usr/bin/local-media-gallery|/usr/share/applications/tech.shruggie.local-media-gallery.desktop|/usr/share/icons/hicolor/*/apps/tech.shruggie.local-media-gallery.png|/usr/share/doc/local-media-gallery/*) ;; *) fail 'Recovery path outside application contract.' ;; esac
            case "$file" in *'..'*|*'//'*) fail 'Noncanonical recovery path.' ;; esac
            check_parent "$file"
            if [ -e "$file" ] || [ -L "$file" ]; then
                if [ ! -f "$file" ] || [ -L "$file" ]; then fail "Linked recovery path: $file."; fi
                observed_stat=$(/usr/bin/stat -c '%a:%s:%u:%g' -- "$file") || fail 'Recovery stat failed.'
                case "$observed_stat" in *:0:0) ;; *) fail 'Foreign recovery file owner.' ;; esac
                actual_mode=${observed_stat%%:*}
                actual_size=${observed_stat#*:}
                actual_size=${actual_size%%:*}
                observed_hash=$(/usr/bin/sha256sum -- "$file") || fail 'Recovery hashing failed.'
                /usr/bin/grep -F -x -- "${observed_hash%% *}|$actual_mode|$actual_size|$file" "$authority" >/dev/null || fail "External recovery bytes: $file."
                set -- "$@" "$file"
            fi
        done <<LMG_RECOVERY_ROWS
$recovery_rows
LMG_RECOVERY_ROWS
        registered_paths "$@"
    }

    transition_owned() {
        if [ -e /run/local-media-gallery-update/authority ]; then
            recovery_owned
        else
            verify_owned
        fi
    }

    verify_owned() {
        registered_state
        case "$package_state" in
            installed|half-installed|unpacked|half-configured|triggers-awaited|triggers-pending) ;;
            *) fail "Incomplete/unowned package state: $package_state." ;;
        esac
        check_visible_command
        walk_files owned
    }

#_______________________________________________________________________________
# Declare Variables and Arrays

    # POSIX protocol inputs, not an operator flag parser.
    checked_parents='
'
    operation=${1:-}
    [ -z "${DPKG_ROOT:-}" ] || fail 'Non-chroot script execution is unsupported.'

#_______________________________________________________________________________
# Execute Operations

@OPERATIONS@

#_______________________________________________________________________________
# End of script
