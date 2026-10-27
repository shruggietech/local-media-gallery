// SPDX-License-Identifier: Apache-2.0
use std::{env, fs, path::PathBuf};
fn main() {
    for name in [
        "LMG_PACKAGE_PAYLOAD",
        "LMG_SETUP_INPUT",
        "LMG_SETUP_MACHINE",
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
    if env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows")
        && env::var_os("LMG_SETUP_INPUT").is_some()
    {
        let level = if env::var_os("LMG_SETUP_MACHINE").is_some() {
            "requireAdministrator"
        } else {
            "asInvoker"
        };
        let manifest = out.join("setup.manifest");
        fs::write(&manifest,format!(r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?><assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0"><trustInfo xmlns="urn:schemas-microsoft-com:asm.v3"><security><requestedPrivileges><requestedExecutionLevel level="{level}" uiAccess="false"/></requestedPrivileges></security></trustInfo></assembly>"#)).unwrap();
        println!("cargo:rustc-link-arg-bin=gallery-setup=/MANIFEST:EMBED");
        println!(
            "cargo:rustc-link-arg-bin=gallery-setup=/MANIFESTINPUT:{}",
            manifest.display()
        );
    }
}
