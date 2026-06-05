# Dual Captions for Streaming

Language: English | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md)

This fork is a no-build Manifest V3 Chrome extension for dual translated captions on Disney+ and Netflix.

The active extension is in `extension/`. Load that folder directly in Chrome. This fork does not use the original archived build workflow from the upstream project.

## What It Does

- Shows two translated caption lines at the same time.
- Defaults to German and Brazilian Portuguese output.
- Uses Chrome built-in AI translation when the experimental Translator API is available.
- Supports Disney+ by capturing WebVTT subtitle segments from network requests.
- Supports Netflix by reading the visible native Netflix subtitle text.
- Hides Netflix's native subtitle layer while keeping it enabled as the source text.
- Keeps the translated overlay visible in fullscreen.
- Lets you drag the overlay and adjust text size, text color, background color, and opacity.

## Install

1. Open `chrome://extensions` in Chrome.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the `extension/` folder from this repository.
5. Open Disney+ or Netflix and start a video.

More detailed Chrome AI setup notes are in [`extension/README.md`](extension/README.md).

## Enable Chrome AI Translation

![Chrome Prompt API flags enabled](extension/screenshots/chrome%20prompt%20api%20enable.png)

1. Open `chrome://flags`.
2. Set `Prompt API for Gemini Nano` to `Enabled Multilingual`.
3. Set `Prompt API for Gemini Nano with Multimodal Input` to `Enabled`.
4. If you see `Translation API streaming split by sentence`, leave it as `Default`; it is related but not the required switch.
5. Relaunch Chrome, reload the unpacked extension, and refresh Disney+ or Netflix.

## Netflix Guide

1. Start a Netflix video.
2. Open Netflix's subtitle menu.
3. Select `English` subtitles. Do not select `None`.
4. The extension reads that English text, hides Netflix's native subtitle layer, and shows the translated overlay.

### Step 1: Select English Subtitles On Netflix

![Select English subtitles on Netflix](extension/screenshots/netflix%20choosing%20eng%20sub%20so%20it%20works.png)

### Step 2: Use The Translated Overlay

![Netflix translated overlay working](extension/screenshots/netflix%20working%20well.png)

## Disney+ Guide

1. Start a Disney+ video.
2. Enable source subtitles, preferably English.
3. If the captions are out of sync because of an ad-supported timeline, type the visible show time into the sync field.
4. Click `Sync`.

### Disney+ Overlay Working

![Disney+ translated overlay working](extension/screenshots/disney%20working%20well.png)

### If Disney+ Captions Are Out Of Sync

![Disney+ captions out of sync](extension/screenshots/disney%20out%20of%20sync.png)

### After Manual Sync

![Disney+ manual sync fixed](extension/screenshots/disney%20sync.png)

## Current Limitations

- Netflix native subtitles must remain enabled because Netflix network subtitle parsing is not implemented yet.
- Netflix image-based subtitle layers are not readable by this MVP.
- Chrome built-in AI translation depends on experimental browser APIs and local model availability.
- Disney+ may change subtitle hosts or formats, which can require parser updates.
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
