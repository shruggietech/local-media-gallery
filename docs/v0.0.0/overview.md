# Overview

## Purpose and audience

Local Media Gallery is a lightweight, interactive gallery for browsing local images and videos. It serves someone opening an unfamiliar directory, someone maintaining a preferred view of a collection, and someone sharing media with another person. The primary unit is a directory the user chooses, rather than a mandatory imported library or a managed account.

**OV-01:** Users MUST be able to open a directory and browse its media without first generating thumbnails, constructing a manifest or adopting a prescribed collection structure. Preparation can add convenience and performance without becoming a prerequisite for browsing.

The product targets Windows, Linux and macOS. Rust and Tauri own the native application; a static Next.js export supplies the interface. The [architecture](architecture.md) defines these responsibilities without making a developer toolchain a recipient prerequisite.

## Editions

| Distribution | Agreed role | State and dependency expectations |
| --- | --- | --- |
| Full installation | Frequent use, command availability and system integration | Installed user settings and remembered-location state; installer handles the declared dependency footprint |
| Lite | Lightweight, on-demand opening and sharing of galleries | Runs in place on a supported host; portable presentation settings can travel with the gallery |

**OV-02:** Both editions MUST provide the common gallery browsing and relocation behavior. Lite MUST remain useful without installing Full. Full may carry a larger installation footprint; its documentation MUST state required dependencies and sizes honestly. Lite MUST NOT be described as a universal package containing every dependency of Full.

No file-count cap, media-content eligibility rule, account requirement or arbitrary browsing restriction is implied by the edition names. Differences must correspond to an explicitly specified capability, integration or dependency. Exact edition boundaries are open under U-02; optional thumbnail generation is not permission to require thumbnails in Lite.

## Principal journeys

### Explore a directory

An installed user invokes the application with a directory, or chooses one through the application. The gallery discovers its contents and makes available items browsable while discovery progresses. Sorting, filtering, inspection and playback operate against the last requested discovery result. Explicit Refresh updates additions, removals and changed observations while the gallery is open; no background scanning runs. Remembered choices may be reapplied according to [configuration and state](configuration-and-state.md).

**OV-03:** The user MUST be able to distinguish an empty directory from an incomplete scan, an inaccessible directory and a filter yielding no matches. A missing or malformed sidecar MUST NOT make otherwise usable media disappear.

### Prepare and share a gallery

A sender optionally prepares gallery-local settings, generates thumbnails and includes native Lite applications for selected recipient platforms. They share the media directory. A recipient extracts it and opens the appropriate launcher on a supported host. Relative gallery relationships and fresh discovery replace dependence on the sender's machine-local history.

**OV-04:** Moving a gallery MUST NOT require manual regeneration of the media listing. The recipient MUST NOT need the sender's username, absolute directory path or remembered-location database. Adding or removing media MUST be reflected by opening or explicitly refreshing the gallery without rerunning a generator. [Gallery lifecycle](gallery-lifecycle.md) owns the detailed behavior.

### Install for continued use

The user chooses Full installation when they want persistent user-level integration and dependency provisioning. The platform installer checks for relevant existing installations and collisions. MSI is an allowed Windows format. Installation and subsequent removal follow the preservation requirements in [installation and distribution](installation-and-distribution.md).

## Browsing scope

**OV-05:** The gallery MUST support image/video browsing, sorting and filtering by media type, configurable presentation, aspect-aware cards and metadata inspection for every item. Adaptive loading and optional thumbnails address collections containing thousands of files. Exact performance budgets are set through measured scenarios, not by treating the collection size as a hard limit.

Sidecar metadata may be arbitrary JSON. Recognition of familiar fields improves presentation but does not establish an obligatory external schema. Settings and internal application messages can have their own versioned contracts without constraining the source metadata.

Initial editing stays limited. Opening, scanning and rendering MUST NOT implicitly authorize renaming, deleting, moving or rewriting originals or sidecars. Such operations require an explicit, separately specified user action. The exact initial editing feature set is U-13; this boundary does not prohibit later owner-approved editing features.

## Product boundaries

The specified experience is a local gallery application and a separate public website. The website is not required to host the user's media. Remote sharing services, tunneling, cloud synchronization, multi-user administration and a general media-management suite are not defined here. This records the current scope without prohibiting future extensions.

The product does not require the user to select a browser brand or open an HTML file. Its native host still has platform prerequisites, documented per edition. Electron is excluded. A package name alone is not evidence that a particular machine is supported.

## Open decisions

U-02 owns the detailed Full/Lite capability matrix. Resolve it with actual package and dependency measurements while preserving their agreed common browsing behavior. U-13 owns the initial editing actions and any corresponding write/undo contracts. Both remain product decisions; neither is settled by choosing a library or by an illustrative command.

See the [specification index](index.md) for the complete decision register and the [glossary](glossary.md) for terminology.
