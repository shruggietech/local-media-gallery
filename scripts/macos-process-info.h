// SPDX-License-Identifier: Apache-2.0
// SDK-owned layouts for the isolated maintainer observer, never product code.
#include <libproc.h>
#include <sys/proc_info.h>
#include <sys/proc.h>

#include <unistd.h>
#include <sys/wait.h>

/* The child enters no Swift runtime: retain one owned unreaped exit for the
 * SDK query regression, then let the Swift parent inspect and reap it. */
static inline pid_t lmg_observer_exited_fixture(void) {
    pid_t pid = fork();
    if (pid == 0) _exit(0);
    return pid;
}
