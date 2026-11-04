// SPDX-License-Identifier: Apache-2.0
use std::{env, fs, path::PathBuf};
fn main() {
    for name in [
        "LMG_RUNTIME_INPUT",
        "LMG_RUNTIME_SHA256",
        "LMG_PACKAGE_PAYLOAD",
        "LMG_SETUP_INPUT",
        "LMG_SETUP_MACHINE",
        "LMG_SETUP_FILES",
    ] {
        println!("cargo:rerun-if-env-changed={name}");
    }
    let out = PathBuf::from(env::var_os("OUT_DIR").unwrap());
    for (name, key) in [
        ("payload.json", "LMG_PACKAGE_PAYLOAD"),
        ("setup.json", "LMG_SETUP_INPUT"),
    ] {
        let bytes = env::var_os(key)
            .map(|p| {
                println!("cargo:rerun-if-changed={}", PathBuf::from(&p).display());
                fs::read(p).expect("package input")
            })
            .unwrap_or_else(|| b"null".to_vec());
        fs::write(out.join(name), bytes).unwrap();
    }
    let runtime = env::var_os("LMG_RUNTIME_INPUT")
        .map(|p| {
            println!("cargo:rerun-if-changed={}", PathBuf::from(&p).display());
            fs::read(p).expect("offline runtime input")
        })
        .unwrap_or_default();
    fs::write(out.join("runtime.exe"), runtime).expect("embedded offline runtime");
    fs::write(
        out.join("runtime.sha256"),
        env::var("LMG_RUNTIME_SHA256").unwrap_or_default(),
    )
    .unwrap();
    let mut packed = Vec::new();
    if let Some(input) = env::var_os("LMG_SETUP_FILES") {
        println!("cargo:rerun-if-changed={}", PathBuf::from(&input).display());
        let inputs: serde_json::Value =
            serde_json::from_slice(&fs::read(input).expect("installer inputs"))
                .expect("installer index");
        let rows = inputs.as_array().expect("installer rows");
        let index: Vec<_> = rows.iter().map(|r| r["record"].clone()).collect();
        let header =
            serde_json::to_vec(&serde_json::json!({"format_version":1,"files":index})).unwrap();
        packed.extend((header.len() as u64).to_le_bytes());
        packed.extend(header);
        for row in rows {
            let input = row["input"].as_str().expect("input path");
            println!("cargo:rerun-if-changed={input}");
            packed.extend(fs::read(input).expect("embedded payload"));
        }
    }
    fs::write(out.join("installer.bin"), packed).expect("embedded installer");
    if env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows")
        && env::var_os("LMG_SETUP_INPUT").is_some()
    {
        let level = if env::var_os("LMG_SETUP_MACHINE").is_some() {
            "requireAdministrator"
        } else {
            "asInvoker"
        };
        println!("cargo:rustc-link-arg-bin=gallery-setup=/MANIFEST:EMBED");
        // Use LINK's single selected UAC fragment, not competing manifests.
        println!(
            "cargo:rustc-link-arg-bin=gallery-setup=/MANIFESTUAC:level='{level}' uiAccess='false'"
        );
    }
}
