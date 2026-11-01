// SPDX-License-Identifier: Apache-2.0
fn main() {
    println!(
        "cargo:rustc-env=LMG_BUILD_TARGET={}",
        std::env::var("TARGET").expect("Cargo build target")
    );
    let manifest = std::path::PathBuf::from(
        std::env::var_os("CARGO_MANIFEST_DIR").expect("Cargo manifest directory"),
    );
    let matrix = manifest
        .join("../../../schemas")
        .join(format!("v{}", env!("CARGO_PKG_VERSION")))
        .join("platform-matrix.json");
    println!("cargo:rerun-if-changed={}", matrix.display());
    let output =
        std::path::PathBuf::from(std::env::var_os("OUT_DIR").expect("Cargo output directory"));
    std::fs::copy(&matrix, output.join("platform-matrix.json"))
        .expect("Stage elected product platform policy");
    tauri_build::build()
}
