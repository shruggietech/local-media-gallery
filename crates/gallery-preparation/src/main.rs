// SPDX-License-Identifier: Apache-2.0
//! Headless acceptance driver for the same native acquisition implementation
//! embedded in the application. It is not a recipient runtime dependency.
use gallery_preparation::{Prepared, Release};
use tokio_util::sync::CancellationToken;
fn run() -> Result<(), String> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    if args.len() != 2 {
        return Err("Usage: gallery-preparation DIRECTORY windows|linux|macos".into());
    }
    let root = cap_std::fs::Dir::open_ambient_dir(&args[0], cap_std::ambient_authority())
        .map_err(|e| e.to_string())?;
    let cancel = CancellationToken::new();
    let release = Release::resolve(&cancel, |_| {})?;
    let mut prepared = Prepared::acquire(&release, &args[1], &cancel, |_| {})?;
    prepared.inspect(&root, &cancel)?;
    prepared.commit(&root, &cancel, |_| {})?;
    println!(
        "{}",
        serde_json::to_string(&prepared.preview).map_err(|e| e.to_string())?
    );
    Ok(())
}
fn main() {
    if let Err(e) = run() {
        eprintln!("{e}");
        std::process::exit(1);
    }
}
