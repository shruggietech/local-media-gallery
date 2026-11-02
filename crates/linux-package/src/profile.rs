// SPDX-License-Identifier: Apache-2.0
use std::path::{Path, PathBuf};

pub(super) fn paths(
    home: &Path,
    config: Option<PathBuf>,
    state: Option<PathBuf>,
) -> (PathBuf, PathBuf) {
    let config = config.unwrap_or_else(|| home.join(".config"));
    let state = state.unwrap_or_else(|| home.join(".local/state"));
    (
        config.join("tech.shruggie.local-media-gallery/settings.json"),
        state.join("tech.shruggie.local-media-gallery/history.sqlite3"),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn history_uses_state_home_with_default_and_custom_profile_locations() {
        let home = Path::new("/recipient");
        let (settings, history) = paths(home, None, None);
        assert_eq!(
            settings,
            home.join(".config/tech.shruggie.local-media-gallery/settings.json")
        );
        assert_eq!(
            history,
            home.join(".local/state/tech.shruggie.local-media-gallery/history.sqlite3")
        );
        let (_, history) = paths(
            home,
            Some(PathBuf::from("/custom/config")),
            Some(PathBuf::from("/custom/state")),
        );
        assert_eq!(
            history,
            Path::new("/custom/state/tech.shruggie.local-media-gallery/history.sqlite3")
        );
        assert!(!history.starts_with("/custom/config"));
        assert!(!history.starts_with(home.join(".local/share")));
    }
}
