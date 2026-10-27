// SPDX-License-Identifier: Apache-2.0
fn main() {
    println!(
        "cargo:rustc-env=LMG_BUILD_TARGET={}",
        std::env::var("TARGET").expect("Cargo build target")
    );
    tauri_build::build()
}
