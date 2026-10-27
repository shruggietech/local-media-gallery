// SPDX-License-Identifier: Apache-2.0
//! Native-test-only facilities. Ordinary artifacts do not compile this module.
use gallery_core::GalleryError;
use serde_json::{Value, json};
use tauri::WebviewWindow;

fn error() -> GalleryError {
    GalleryError::new(
        "native_qualification_failed",
        "Native qualification facility failed.",
    )
}

#[tauri::command]
pub async fn test_native_qualification(
    window: WebviewWindow,
    action: String,
    key: Option<String>,
    width: Option<f64>,
    height: Option<f64>,
    zoom: Option<f64>,
) -> Result<Value, GalleryError> {
    crate::main_window(&window)?;
    match action.as_str() {
        "presentation" => {
            if let Some(z) = zoom {
                if ![1.0, 2.0].contains(&z) {
                    return Err(error());
                }
                window.set_zoom(z).map_err(|_| error())?;
            }
            if let (Some(w), Some(h)) = (width, height) {
                if ![480.0, 800.0, 1280.0].contains(&w) || ![600.0, 720.0, 900.0].contains(&h) {
                    return Err(error());
                }
                window
                    .set_size(tauri::LogicalSize::new(w, h))
                    .map_err(|_| error())?;
            }
            Ok(json!({"scaleFactor":window.scale_factor().map_err(|_|error())?}))
        }
        #[cfg(windows)]
        "window" => {
            Ok(json!({"handle":(window.hwnd().map_err(|_|error())?.0 as usize).to_string()}))
        }
        #[cfg(target_os = "macos")]
        "key" | "accessibility" => {
            let (send, receive) = tokio::sync::oneshot::channel();
            window
                .with_webview(move |webview| {
                    let result =
                        unsafe { macos::observe(webview.inner(), &action, key.as_deref()) };
                    let _ = send.send(result);
                })
                .map_err(|_| error())?;
            tokio::time::timeout(std::time::Duration::from_secs(8), receive)
                .await
                .map_err(|_| error())?
                .map_err(|_| error())?
        }
        _ => {
            let _ = key;
            Err(error())
        }
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::*;
    use objc2::{MainThreadMarker, msg_send, rc::Retained, runtime::AnyObject, sel};
    use objc2_app_kit::{NSApplication, NSEvent, NSEventModifierFlags, NSEventType};
    use objc2_foundation::{NSArray, NSPoint, NSProcessInfo, NSString};
    use std::collections::{HashSet, VecDeque};

    unsafe fn supports(node: &AnyObject, selector: objc2::runtime::Sel) -> bool {
        unsafe { msg_send![node, respondsToSelector:selector] }
    }
    unsafe fn attribute(
        node: &AnyObject,
        selector: objc2::runtime::Sel,
        legacy: &str,
    ) -> Option<Retained<AnyObject>> {
        unsafe {
            let modern: Option<Retained<AnyObject>> = if supports(node, selector) {
                msg_send![node, performSelector:selector]
            } else {
                None
            };
            if modern.is_some() {
                modern
            } else if supports(node, sel!(accessibilityAttributeValue:)) {
                msg_send![node, accessibilityAttributeValue:&*NSString::from_str(legacy)]
            } else {
                None
            }
        }
    }
    unsafe fn text(node: &AnyObject, selector: objc2::runtime::Sel, legacy: &str) -> String {
        unsafe {
            let Some(value) = attribute(node, selector, legacy) else {
                return String::new();
            };
            let string: Retained<NSString> = msg_send![&*value, description];
            string.to_string()
        }
    }
    pub unsafe fn observe(
        pointer: *mut std::ffi::c_void,
        action: &str,
        key: Option<&str>,
    ) -> Result<Value, GalleryError> {
        let mtm = MainThreadMarker::new().ok_or_else(error)?;
        let webview = unsafe { &*(pointer as *mut AnyObject) };
        if action == "key" {
            let (code, characters, shift) = match key {
                Some("Tab") => (48, "\t", false),
                Some("ShiftTab") => (48, "\t", true),
                Some("Space") => (49, " ", false),
                Some("Escape") => (53, "\u{1b}", false),
                Some("Enter") => (36, "\r", false),
                _ => return Err(error()),
            };
            let native_window: Option<Retained<objc2_app_kit::NSWindow>> =
                unsafe { msg_send![webview, window] };
            let native_window = native_window.ok_or_else(error)?;
            native_window.makeKeyAndOrderFront(None);
            let responder: &objc2_app_kit::NSResponder =
                unsafe { &*(pointer as *const objc2_app_kit::NSResponder) };
            if native_window.firstResponder().is_none() {
                native_window.makeFirstResponder(Some(responder));
            }
            let app = NSApplication::sharedApplication(mtm);
            for kind in [NSEventType::KeyDown, NSEventType::KeyUp] {
                let event=NSEvent::keyEventWithType_location_modifierFlags_timestamp_windowNumber_context_characters_charactersIgnoringModifiers_isARepeat_keyCode(kind,NSPoint::new(0.0,0.0),if shift {NSEventModifierFlags::Shift}else{NSEventModifierFlags::empty()},NSProcessInfo::processInfo().systemUptime(),native_window.windowNumber(),None,&NSString::from_str(characters),&NSString::from_str(characters),false,code).ok_or_else(error)?;
                app.postEvent_atStart(&event, false);
            }
            return Ok(json!({"method":"AppKit queued NSEvent"}));
        }
        let root = unsafe { Retained::retain(pointer as *mut AnyObject) }.ok_or_else(error)?;
        let mut queue = VecDeque::from([(root, 0usize)]);
        let mut seen = HashSet::new();
        let mut records = Vec::new();
        let mut overflow = false;
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
        while let Some((node, depth)) = queue.pop_front() {
            if records.len() >= 2048 || std::time::Instant::now() > deadline {
                overflow = true;
                break;
            }
            if !seen.insert((&*node as *const AnyObject) as usize) {
                continue;
            }
            let role = unsafe { text(&node, sel!(accessibilityRole), "AXRole") };
            let label = unsafe { text(&node, sel!(accessibilityLabel), "AXTitle") };
            let description = unsafe { text(&node, sel!(accessibilityTitle), "AXDescription") };
            let value = unsafe { text(&node, sel!(accessibilityValue), "AXValue") };
            records.push(json!({"role":role,"name":label,"description":description,"value":value,"depth":depth}));
            let children = unsafe { attribute(&node, sel!(accessibilityChildren), "AXChildren") };
            if let Some(children) = children {
                let array: &NSArray<AnyObject> =
                    unsafe { &*((&*children as *const AnyObject) as *const NSArray<AnyObject>) };
                if depth >= 32 && array.count() > 0 {
                    overflow = true;
                    continue;
                }
                for child in array.iter() {
                    if records.len() + queue.len() >= 2048 {
                        overflow = true;
                        break;
                    }
                    queue.push_back((child, depth + 1));
                }
            }
        }
        Ok(
            json!({"method":"AppKit/WKWebView provider","nodes":records.len(),"overflow":overflow,"records":records,"speech":"VoiceOver not exercised"}),
        )
    }
}
