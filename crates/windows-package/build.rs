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
        println!("cargo:rustc-link-arg-bin=gallery-setup=/MANIFEST:EMBED");
        // Use LINK's single selected UAC fragment, not competing manifests.
        println!(
            "cargo:rustc-link-arg-bin=gallery-setup=/MANIFESTUAC:level='{level}' uiAccess='false'"
        );
    }
}
