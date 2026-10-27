// SPDX-License-Identifier: Apache-2.0
use crate::Engine;
use axum::{
    Router,
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, Method, Response, StatusCode},
    routing::get,
};
use futures_util::StreamExt;
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use tokio_util::io::ReaderStream;

/// (offset, length, partial). A zero-byte whole response is valid; a range is not.
pub fn byte_range(value: Option<&str>, size: u64) -> Result<(u64, u64, bool), &'static str> {
    let Some(value) = value else {
        return Ok((0, size, false));
    };
    let value = value.strip_prefix("bytes=").ok_or("Invalid range unit")?;
    if size == 0 || value.contains(',') {
        return Err("Unsatisfiable range");
    }
    let (start, end) = value.split_once('-').ok_or("Invalid range")?;
    if start.is_empty() {
        let suffix = end.parse::<u64>().map_err(|_| "Invalid suffix")?;
        if suffix == 0 {
            return Err("Empty suffix");
        }
        let count = suffix.min(size);
        return Ok((size - count, count, true));
    }
    let start = start.parse::<u64>().map_err(|_| "Invalid offset")?;
    let end = if end.is_empty() {
        size - 1
    } else {
        end.parse::<u64>().map_err(|_| "Invalid end")?.min(size - 1)
    };
    if start >= size || end < start {
        return Err("Unsatisfiable range");
    }
    Ok((start, end - start + 1, true))
}

#[derive(Clone)]
struct MediaState {
    engine: Engine,
    host: String,
}
pub fn media_router(engine: Engine, host: String) -> Router {
    Router::new()
        .route("/media/{session}/{item}/{revision}", get(media))
        .route(
            "/thumbnail/{session}/{item}/{revision}/{interest}",
            get(thumbnail),
        )
        .with_state(MediaState { engine, host })
}
pub async fn serve_media(engine: Engine) -> std::io::Result<()> {
    let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0)).await?;
    let host = listener.local_addr()?.to_string();
    engine.set_media_origin(format!("http://{host}"));
    axum::serve(listener, media_router(engine, host)).await
}
/// Serve a listener bound by the host before its initial UI snapshot.
pub async fn serve_media_listener(
    engine: Engine,
    listener: std::net::TcpListener,
) -> std::io::Result<()> {
    let host = listener.local_addr()?.to_string();
    let listener = tokio::net::TcpListener::from_std(listener)?;
    axum::serve(listener, media_router(engine, host)).await
}
fn allowed_origin(origin: &str) -> bool {
    matches!(
        origin,
        "http://tauri.localhost" | "https://tauri.localhost" | "tauri://localhost"
    ) || (cfg!(debug_assertions)
        && matches!(origin, "http://localhost:3000" | "http://127.0.0.1:3000"))
}
async fn media(
    State(state): State<MediaState>,
    Path((session, item, revision)): Path<(String, String, String)>,
    method: Method,
    headers: HeaderMap,
) -> Response<Body> {
    let error = |status| {
        Response::builder()
            .status(status)
            .header("Cache-Control", "no-store")
            .body(Body::empty())
            .unwrap()
    };
    if headers.get("host").and_then(|v| v.to_str().ok()) != Some(state.host.as_str()) {
        return error(StatusCode::FORBIDDEN);
    }
    let origin = headers.get("origin").and_then(|v| v.to_str().ok());
    if headers.contains_key("origin") && origin.is_none_or(|o| !allowed_origin(o)) {
        return error(StatusCode::FORBIDDEN);
    }
    let Ok(permit) = state
        .engine
        .inner
        .media_admission
        .clone()
        .try_acquire_owned()
    else {
        return error(StatusCode::SERVICE_UNAVAILABLE);
    };
    let diagnostics = state.engine.diagnostics();
    let source_context = (session.clone(), item.clone());
    let opened = tokio::task::spawn_blocking(move || {
        state
            .engine
            .open_media(&session, &item, &revision)
            .inspect_err(|e| {
                state.engine.diagnostics().scoped(
                    crate::diagnostics::Event::from_code(&e.code),
                    None,
                    Some(&session),
                    Some(&item),
                    None,
                    None,
                )
            })
    })
    .await;
    let Ok(Ok(resource)) = opened else {
        return error(StatusCode::NOT_FOUND);
    };
    let range_header = headers.get("range");
    let range = if let Some(value) = range_header {
        match value.to_str() {
            Ok(v) => Some(v),
            Err(_) => return error(StatusCode::RANGE_NOT_SATISFIABLE),
        }
    } else {
        None
    };
    let Ok((offset, length, partial)) = byte_range(range, resource.size) else {
        return Response::builder()
            .status(416)
            .header("Content-Range", format!("bytes */{}", resource.size))
            .header("Cache-Control", "no-store")
            .body(Body::empty())
            .unwrap();
    };
    let mut builder = Response::builder()
        .status(if partial { 206 } else { 200 })
        .header("Content-Type", &resource.mime)
        .header("Content-Length", length)
        .header("Accept-Ranges", "bytes")
        .header("Cache-Control", "no-store")
        .header("X-Content-Type-Options", "nosniff")
        .header("Referrer-Policy", "no-referrer")
        .header("Vary", "Origin");
    if let Some(origin) = origin {
        builder = builder
            .header("Access-Control-Allow-Origin", origin)
            .header(
                "Access-Control-Expose-Headers",
                "Content-Length, Content-Range, Accept-Ranges",
            );
    }
    if partial {
        builder = builder.header(
            "Content-Range",
            format!("bytes {}-{}/{}", offset, offset + length - 1, resource.size),
        );
    }
    if method == Method::HEAD {
        return builder.body(Body::empty()).unwrap();
    }
    let mut file = tokio::fs::File::from_std(resource.file);
    if file.seek(std::io::SeekFrom::Start(offset)).await.is_err() {
        diagnostics.scoped(
            crate::diagnostics::Event::MediaRead,
            None,
            Some(&source_context.0),
            Some(&source_context.1),
            None,
            None,
        );
        return error(StatusCode::INTERNAL_SERVER_ERROR);
    }
    let stream = ReaderStream::with_capacity(file.take(length), 64 * 1024)
        .take_until(resource.cancel.cancelled_owned())
        .map(move |result| {
            let _lease = &permit;
            if result.is_err() {
                diagnostics.record(crate::diagnostics::Event::MediaRead);
            }
            result
        });
    builder.body(Body::from_stream(stream)).unwrap()
}

async fn thumbnail(
    State(state): State<MediaState>,
    Path((session, item, revision, interest)): Path<(String, String, String, String)>,
    headers: HeaderMap,
) -> Response<Body> {
    let fail = |status| {
        Response::builder()
            .status(status)
            .header("Cache-Control", "no-store")
            .body(Body::empty())
            .unwrap()
    };
    if headers.get("host").and_then(|v| v.to_str().ok()) != Some(state.host.as_str()) {
        return fail(StatusCode::FORBIDDEN);
    }
    let origin = headers
        .get("origin")
        .and_then(|v| v.to_str().ok())
        .map(str::to_owned);
    if headers.contains_key("origin") && origin.as_deref().is_none_or(|o| !allowed_origin(o)) {
        return fail(StatusCode::FORBIDDEN);
    }
    let Some(service) = state.engine.inner.preparation.lock().unwrap().upgrade() else {
        return fail(StatusCode::NOT_FOUND);
    };
    let Ok(permit) = service.validation_permit() else {
        return fail(StatusCode::SERVICE_UNAVAILABLE);
    };
    let result = tokio::task::spawn_blocking(move || {
        service.lookup_interest(&session, &item, &revision, &interest, permit)
    })
    .await;
    let Ok(Ok(Some(png))) = result else {
        return fail(StatusCode::NOT_FOUND);
    };
    let mut response = Response::builder()
        .status(200)
        .header("Cache-Control", "no-store")
        .header("Content-Type", "image/png")
        .header("Content-Length", png.len())
        .header("X-Content-Type-Options", "nosniff")
        .header("Referrer-Policy", "no-referrer")
        .header("Vary", "Origin");
    if let Some(origin) = origin {
        response = response.header("Access-Control-Allow-Origin", origin)
    }
    response.body(Body::from(png)).unwrap()
}
