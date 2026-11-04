// SPDX-License-Identifier: Apache-2.0
use gallery_core::GalleryError;
#[cfg(any(test, feature = "tooling-state", windows))]
use std::path::Path;
use std::path::PathBuf;
#[derive(Debug)]
pub struct Paths {
    pub config: PathBuf,
    pub local: PathBuf,
    pub cache: PathBuf,
    pub log: PathBuf,
}
#[cfg(any(test, all(windows, not(feature = "tooling-state"))))]
fn windows_paths(roaming: &Path, local: &Path) -> Paths {
    let local = local.join("local-media-gallery");
    Paths {
        config: roaming.join("local-media-gallery"),
        cache: local.join("cache"),
        log: local.join("logs"),
        local,
    }
}
#[cfg(any(feature = "tooling-state", test))]
fn tooling_paths(root: &Path, settings: Option<&Path>) -> Paths {
    Paths {
        config: settings
            .map(Path::to_path_buf)
            .unwrap_or_else(|| root.join("config")),
        local: root.join("local"),
        cache: root.join("cache"),
        log: root.join("logs"),
    }
}
#[cfg(feature = "tooling-state")]
fn tooling() -> Result<Paths, GalleryError> {
    let settings = std::env::var_os("GALLERY_TEST_SETTINGS_DIR").map(PathBuf::from);
    let history = std::env::var_os("GALLERY_TEST_HISTORY_DIR").map(PathBuf::from);
    let root = std::env::var_os("GALLERY_TOOLING_STATE_ROOT")
        .map(PathBuf::from)
        .or_else(|| {
            settings
                .as_ref()
                .or(history.as_ref())
                .and_then(|p| p.parent())
                .map(Path::to_path_buf)
        })
        .unwrap_or_else(|| {
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .ancestors()
                .nth(3)
                .unwrap()
                .join(".local/tooling-state")
        });
    if !root.is_absolute()
        || settings.as_ref().is_some_and(|p| !p.is_absolute())
        || history.as_ref().is_some_and(|p| !p.is_absolute())
    {
        return Err(GalleryError::new(
            "state_unavailable",
            "Tooling state directories must be absolute; production storage is never a fallback.",
        ));
    }
    Ok(tooling_paths(&root, settings.as_deref()))
}
pub fn paths() -> Result<Option<Paths>, GalleryError> {
    #[cfg(feature = "tooling-state")]
    {
        Ok(Some(tooling()?))
    }
    #[cfg(all(not(feature = "tooling-state"), windows))]
    {
        let roaming = dirs::config_dir().ok_or_else(|| {
            GalleryError::new(
                "state_unavailable",
                "The Windows roaming application directory is unavailable.",
            )
        })?;
        let local = dirs::data_local_dir().ok_or_else(|| {
            GalleryError::new(
                "state_unavailable",
                "The Windows local application directory is unavailable.",
            )
        })?;
        Ok(Some(windows_paths(&roaming, &local)))
    }
    #[cfg(all(not(feature = "tooling-state"), not(windows)))]
    {
        Ok(None)
    }
}
pub fn configure(context: &mut tauri::Context<tauri::Wry>) -> Result<(), GalleryError> {
    use tauri::utils::config::{AppDirectoriesOverride, AppDirectoryOverrides};
    if let Some(paths) = paths()? {
        context.config_mut().app.app_directories_override =
            Some(AppDirectoriesOverride::Directories(AppDirectoryOverrides {
                config: Some(paths.config.clone()),
                data: Some(paths.config),
                local_data: Some(paths.local),
                cache: Some(paths.cache),
                log: Some(paths.log),
            }));
    }
    Ok(())
}
pub fn cache_root() -> Result<PathBuf, GalleryError> {
    Ok(match paths()? {
        Some(paths) => paths.cache,
        None => dirs::cache_dir()
            .ok_or_else(|| {
                GalleryError::new(
                    "state_unavailable",
                    "The application cache directory is unavailable.",
                )
            })?
            .join(crate::launch::identifier(crate::launch::Edition::Full)),
    }
    .join("thumbnails-v1"))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn windows_layout_is_application_named_and_shared() {
        let paths = windows_paths(
            std::path::Path::new("C:/Roaming"),
            std::path::Path::new("C:/Local"),
        );
        assert_eq!(
            paths.config,
            std::path::Path::new("C:/Roaming/local-media-gallery")
        );
        assert_eq!(
            paths.local,
            std::path::Path::new("C:/Local/local-media-gallery")
        );
        assert_eq!(paths.cache, paths.local.join("cache"));
        assert_eq!(paths.log, paths.local.join("logs"));
    }
    #[test]
    fn tooling_layout_keeps_every_state_class_under_elected_root() {
        let root = std::path::Path::new("/owned/tooling");
        let paths = tooling_paths(root, None);
        assert_eq!(paths.config, root.join("config"));
        for p in [&paths.config, &paths.local, &paths.cache, &paths.log] {
            assert!(p.starts_with(root));
        }
        let settings = root.join("case/settings");
        let paths = tooling_paths(root, Some(&settings));
        assert_eq!(paths.config, settings);
        assert_eq!(paths.local, root.join("local"));
    }
}
