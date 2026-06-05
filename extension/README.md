# Dual Captions for Streaming

Minimal Manifest V3 dual-caption MVP for Disney+ and Netflix.

## Install Locally

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click Load unpacked.
4. Select this `extension/` directory.

## Use

1. Open Disney+ or Netflix and start a video.
2. Enable native subtitles for the source language you want to translate, preferably English.
3. The in-page panel should show captured subtitle languages.
4. Choose the captured source language, preferably `en` if available.
5. Choose the first and second output languages. Defaults are `Deutsch` and `Português (Brasil)`.
6. Keep AI translate enabled to translate the source caption into both output languages.

For Netflix, keep Netflix's own subtitle menu set to English. The extension reads Netflix's visible native subtitle text and then visually hides Netflix's native subtitle layer while the translated overlay is active. If Netflix subtitles are set to `None`, the extension currently has no source text to translate.

The overlay is moved into the active fullscreen player element, so translated captions should remain visible in fullscreen mode.

## Screenshots

### Netflix Working Well

![Netflix working well](screenshots/netflix%20working%20well.png)

### Netflix English Subtitle Selection

![Netflix choosing English subtitle so it works](screenshots/netflix%20choosing%20eng%20sub%20so%20it%20works.png)

### Disney+ Working Well

![Disney+ working well](screenshots/disney%20working%20well.png)

### Disney+ Out Of Sync

![Disney+ out of sync](screenshots/disney%20out%20of%20sync.png)

### Disney+ Manual Sync

![Disney+ sync](screenshots/disney%20sync.png)

## Chrome Built-In AI Translation

The AI translation mode uses Chrome's experimental built-in AI APIs when available.

To use local AI translation, each user must enable Chrome's experimental AI flags first:

![Chrome Prompt API flags enabled](screenshots/chrome%20prompt%20api%20enable.png)

1. Open `chrome://flags`.
2. Search for `Prompt API for Gemini Nano` and set it to `Enabled Multilingual`.
3. Search for `Prompt API for Gemini Nano with Multimodal Input` and set it to `Enabled`.
4. If you see `Translation API streaming split by sentence`, leave it as `Default`; it is related but not the required switch.
5. Search for `Language Detection API` and set it to `Enabled` if it appears.
6. Relaunch Chrome.
7. Open `chrome://components` and check whether any Gemini Nano / optimization guide model component can be updated or downloaded.
8. Reload the unpacked extension in `chrome://extensions`.
9. Hard-refresh Disney+ or Netflix.

The panel should show:

```text
Bridge: ready. Translator yes, LM yes
```

If it shows `Translator no`, Chrome's dedicated Translator API is not available. The extension may still try the Prompt API, but Translator API is the preferred path for subtitle translation.

The extension checks these APIs in order:

- `window.Translator.create(...)`
- `window.ai.translator.create(...)`
- `window.LanguageModel.create(...)`
- `window.ai.languageModel.create(...)`

If the dedicated Translator API is available, it is used. If only Prompt API is available, the extension prompts the local model to translate the current subtitle. Translations are cached per source language, target language, and caption text.

## Current Scope

- Disney+ and Netflix MVP.
- Captures WebVTT subtitle segments from Disney CDN hosts.
- Uses visible/native subtitle text for Netflix translation and hides Netflix's native text layer while the overlay is active.
- Netflix image-based subtitle layers are not readable by this MVP; use a text/native subtitle track when available.
- Parses, dedupes, sorts, and renders captions in an overlay.
- Can translate the active captured caption with Chrome's experimental built-in AI APIs.
- Stores basic settings in `chrome.storage.local`.

## Known Limitations

- Disney+ may use different subtitle CDN hosts than the current patterns.
- If the background service worker cannot refetch segment URLs, request capture will need a different strategy.
- AI translation depends on experimental Chrome APIs and may not be available in all Chrome builds.
- Prompt API translation can be slower or less consistent than the dedicated Translator API.
- Netflix translation requires Netflix native subtitles to remain enabled because network subtitle parsing is not implemented yet.
- The panel is intentionally simple and may be replaced after the capture/render pipeline is proven.
