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

#include <signal.h>
#include <errno.h>

struct lmg_observer_fork_fixture { pid_t pid; int release_fd; };
static inline struct lmg_observer_fork_fixture lmg_observer_held_fork(void) {
    int ends[2];
    struct lmg_observer_fork_fixture result = { -1, -1 };
    if (pipe(ends) != 0) return result;
    pid_t pid = fork();
    if (pid == 0) {
        close(ends[1]);
        char byte;
        while (read(ends[0], &byte, 1) < 0 && errno == EINTR) {}
        _exit(0);
    }
    close(ends[0]);
    if (pid < 0) { close(ends[1]); return result; }
    result.pid = pid; result.release_fd = ends[1]; return result;
}
static inline void lmg_observer_reap_fork(struct lmg_observer_fork_fixture fixture) {
    close(fixture.release_fd);
    kill(fixture.pid, SIGKILL);
    int status;
    while (waitpid(fixture.pid, &status, 0) < 0 && errno == EINTR) {}
}
