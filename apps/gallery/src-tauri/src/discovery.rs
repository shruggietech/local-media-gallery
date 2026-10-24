// SPDX-License-Identifier: Apache-2.0
//! One native worker and one newest pending request, including under stalled I/O.
use gallery_core::{DiscoveryRequest, Engine, GalleryError};
use std::sync::{Arc, Condvar, Mutex};

#[derive(Default)]
struct Pending {
    request: Option<DiscoveryRequest>,
    newest: u64,
    stopped: bool,
}
impl Pending {
    fn put(&mut self, request: DiscoveryRequest) -> bool {
        if self.stopped || request.generation <= self.newest {
            return false;
        }
        self.newest = request.generation;
        self.request = Some(request);
        true
    }
}
#[derive(Default)]
struct Queue {
    pending: Mutex<Pending>,
    wake: Condvar,
}

pub struct DiscoveryWorker {
    queue: Arc<Queue>,
    engine: Engine,
}
impl DiscoveryWorker {
    pub fn start(
        engine: Engine,
        mut observer: impl FnMut() + Send + 'static,
    ) -> Result<Self, GalleryError> {
        let queue = Arc::new(Queue::default());
        let shared = queue.clone();
        let worker_engine = engine.clone();
        std::thread::Builder::new()
            .name("gallery-discovery".into())
            .spawn(move || {
                loop {
                    let request = {
                        let mut pending = shared.pending.lock().unwrap();
                        while pending.request.is_none() && !pending.stopped {
                            pending = shared.wake.wait(pending).unwrap();
                        }
                        if pending.stopped {
                            break;
                        }
                        pending.request.take().unwrap()
                    };
                    let _ = worker_engine.run_discovery(&request, || {
                        if !shared.pending.lock().unwrap().stopped {
                            observer();
                        }
                    });
                }
            })
            .map_err(|_| {
                GalleryError::new(
                    "internal",
                    "Discovery could not start. Restart the application to retry.",
                )
            })?;
        Ok(Self { queue, engine })
    }
    pub fn submit(&self, request: DiscoveryRequest) -> bool {
        let id = request.id.clone();
        let mut pending = self.queue.pending.lock().unwrap();
        let stopped = pending.stopped;
        let accepted = pending.put(request);
        if accepted {
            self.queue.wake.notify_one();
        }
        drop(pending);
        if stopped {
            let _ = self.engine.cancel_discovery(&id);
        }
        accepted
    }
    pub fn shutdown(&self) {
        let mut pending = self.queue.pending.lock().unwrap();
        pending.stopped = true;
        pending.request = None;
        drop(pending);
        self.engine.cancel_pending();
        self.queue.wake.notify_one();
        // A blocked OS call may still be running. Never join it on the UI thread.
    }
}
impl Drop for DiscoveryWorker {
    fn drop(&mut self) {
        self.shutdown();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    #[test]
    fn pending_slot_replaces_work_and_retains_watermark_after_take() {
        let engine = Engine::new();
        let a = engine.begin_open(Path::new("a"));
        let b = engine.begin_open(Path::new("b"));
        let mut slot = Pending::default();
        assert!(slot.put(b.clone()));
        assert!(!slot.put(a.clone()));
        assert_eq!(slot.request.take().unwrap().id, b.id);
        assert!(!slot.put(a));
        assert!(!slot.put(b));
        slot.stopped = true;
        assert!(!slot.put(engine.begin_open(Path::new("c"))));
    }
    #[test]
    fn shutdown_does_not_wait_for_a_worker_callback() {
        use std::sync::{Barrier, mpsc};
        let engine = Engine::new();
        let root = tempfile::TempDir::new().unwrap();
        let entered = Arc::new(Barrier::new(2));
        let release = Arc::new(Barrier::new(2));
        let wait = entered.clone();
        let finish = release.clone();
        let (sent, received) = mpsc::channel();
        let worker = DiscoveryWorker::start(engine.clone(), move || {
            wait.wait();
            finish.wait();
            sent.send(()).unwrap();
        })
        .unwrap();
        worker.submit(engine.begin_open(root.path()));
        entered.wait();
        worker.shutdown();
        assert!(engine.snapshot().discovery.is_none());
        release.wait();
        received
            .recv_timeout(std::time::Duration::from_secs(2))
            .unwrap();
        assert_eq!(engine.snapshot().items.len(), 0);
    }
}
