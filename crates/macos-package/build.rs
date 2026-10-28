// SPDX-License-Identifier: Apache-2.0
fn main() {
    println!("cargo:rerun-if-env-changed=LMG_MACOS_PAYLOAD");
    let bytes = match std::env::var_os("LMG_MACOS_PAYLOAD") {
        Some(path) => {
            println!(
                "cargo:rerun-if-changed={}",
                std::path::Path::new(&path).display()
            );
            std::fs::read(path).expect("Read package payload")
        }
        None => b"null".to_vec(),
    };
    std::fs::write(
        std::path::Path::new(&std::env::var_os("OUT_DIR").unwrap()).join("payload.json"),
        bytes,
    )
    .unwrap();
}
