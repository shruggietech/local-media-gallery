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
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        // A directly delivered Mach-O has no neighbouring .app/Info.plist.
        // Keep its native application identity inside the executable itself.
        let lite = std::env::var_os("CARGO_FEATURE_LITE").is_some();
        let identifier = if lite {
            "tech.shruggie.local-media-gallery.lite"
        } else {
            "tech.shruggie.local-media-gallery"
        };
        let plist = output.join("embedded-info.plist");
        std::fs::write(&plist, format!("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<plist version=\"1.0\"><dict><key>CFBundleIdentifier</key><string>{identifier}</string><key>CFBundleName</key><string>Local Media Gallery</string><key>CFBundleExecutable</key><string>local-media-gallery</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>{}</string><key>CFBundleShortVersionString</key><string>{}</string><key>LSMinimumSystemVersion</key><string>15.0</string><key>NSHighResolutionCapable</key><true/></dict></plist>\n", env!("CARGO_PKG_VERSION"), env!("CARGO_PKG_VERSION"))).expect("Embed native application identity");
        println!(
            "cargo:rustc-link-arg=-Wl,-sectcreate,__TEXT,__info_plist,{}",
            plist.display()
        );
    }
    tauri_build::build()
}
