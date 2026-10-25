// SPDX-License-Identifier: Apache-2.0
#![cfg(feature = "discovery-tests")]
use axum::{body::Body, http::Request};
use gallery_core::{Engine, MetadataRequest};
use std::fs;
use tempfile::TempDir;
use tower::ServiceExt;

#[tokio::test]
async fn resource_observations_follow_real_permit_ownership_without_opening_files() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.jpg"), b"synthetic bytes").unwrap();
    let engine = Engine::new();
    let snapshot = engine.open(dir.path()).unwrap();
    let initial = engine.test_resource_snapshot();
    assert_eq!(initial.media_responses_active, 0);
    assert_eq!(initial.metadata_active, 0);
    assert_eq!(initial.discovery_active, Some(0));
    let item = &snapshot.items[0];
    let held = engine
        .metadata_request(MetadataRequest {
            session_id: snapshot.session_id.clone().unwrap(),
            item_id: item.id.clone(),
            item_revision: item.revision.clone(),
            metadata_revision: snapshot.metadata_revision.clone(),
        })
        .unwrap();
    assert_eq!(engine.test_resource_snapshot().metadata_active, 1);
    drop(held);
    assert_eq!(engine.test_resource_snapshot().metadata_active, 0);
    let router = gallery_core::media_router(engine.clone(), "127.0.0.1:1234".into());
    let response = router
        .oneshot(
            Request::builder()
                .uri(format!(
                    "/media/{}/{}/{}",
                    snapshot.session_id.unwrap(),
                    item.id,
                    item.revision
                ))
                .header("Host", "127.0.0.1:1234")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    assert_eq!(engine.test_resource_snapshot().media_responses_active, 1);
    drop(response);
    assert_eq!(engine.test_resource_snapshot().media_responses_active, 0);
    assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
}
