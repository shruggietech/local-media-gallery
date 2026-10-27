use gallery_core::diagnostics::{DiagnosticContext, DiagnosticStore, Event};
#[test]
fn bounded_allowlisted_report_has_no_raw_native_details() {
    let store = DiagnosticStore::new(DiagnosticContext::native("full", None, None));
    for _ in 0..1000 {
        store.record(Event::CacheInvalid);
    }
    let report = store.snapshot();
    assert!(report.records.len() <= 256);
    assert!(report.serialized_bytes.parse::<usize>().unwrap() <= 262144);
    assert!(report.dropped.parse::<u64>().unwrap() > 0);
    let bytes = serde_json::to_string(&report).unwrap();
    assert!(bytes.contains("cache_invalid"));
    assert!(!bytes.contains("PRIVATE_PATH"));
    assert!(report.context.runtime.is_none());
}
