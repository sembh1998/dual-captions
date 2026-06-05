# Dual Captions for Streaming

This fork is a new no-build Manifest V3 Chrome extension for dual translated captions on Disney+ and Netflix.

It is not the original archived YouTube/Netflix/Disney+/Kanopy extension workflow. The actively developed extension lives in `extension/` and is loaded directly as an unpacked Chrome extension.

## What Works

- Disney+ WebVTT subtitle capture from network requests.
- Disney+ manual subtitle sync for ad-supported playback timelines.
- Netflix translation from the visible native subtitle text.
- German and Brazilian Portuguese translated overlays by default.
- Chrome built-in AI translation through the experimental Translator API when available.
- Draggable fullscreen-compatible overlay with per-row text size/color and background opacity controls.
- Native Netflix subtitles are visually hidden while the translated overlay is active, but they must remain enabled as the source text.

## Install Locally

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select the `extension/` directory from this repository.
5. Open Disney+ or Netflix and start a video.

More detailed usage and Chrome AI setup notes are in [`extension/README.md`](extension/README.md).

## Screenshots

### Netflix Working Well

![Netflix working well](extension/screenshots/netflix%20working%20well.png)

### Netflix English Subtitle Selection

![Netflix choosing English subtitle so it works](extension/screenshots/netflix%20choosing%20eng%20sub%20so%20it%20works.png)

### Disney+ Working Well

![Disney+ working well](extension/screenshots/disney%20working%20well.png)

### Disney+ Manual Sync

![Disney+ sync](extension/screenshots/disney%20sync.png)

## Current Limitations

- Netflix subtitles must remain enabled in Netflix's own subtitle menu, preferably English.
- Netflix network subtitle parsing is not implemented yet.
- Netflix image-based subtitle layers are not readable by this MVP.
- Chrome built-in AI translation depends on experimental browser APIs and local model availability.
- The old root-level build system and legacy directories are from the original project and are not the active extension path for this fork.

## Project Layout

- `extension/`: active MV3 extension.
- `extension/src/content.js`: overlay, settings, source detection, sync, translation coordination.
- `extension/src/background.js`: Disney+ request capture and caption segment fetching.
- `extension/src/page-translation-bridge.js`: main-world bridge to Chrome built-in AI APIs.
- `extension/src/disneyplus/`: WebVTT parsing and caption store.
- `extension/screenshots/`: README screenshots.

## Attribution

This repository is a fork of the original `dual-captions` project by Mike Steele. The original project was archived upstream in 2022; this fork currently focuses on a separate MV3 extension workflow for Disney+ and Netflix.

## License

MIT
