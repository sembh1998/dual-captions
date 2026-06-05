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

## Chrome Built-In AI Translation

The AI translation mode uses Chrome's experimental built-in AI APIs when available.

To use local AI translation, each user must enable Chrome's experimental AI flags first:

1. Open `chrome://flags`.
2. Search for `Prompt API for Gemini Nano` and set it to `Enabled`.
3. Search for `Translator API` and set it to `Enabled` if it appears in your Chrome build.
4. Search for `Language Detection API` and set it to `Enabled` if it appears.
5. Enable multilingual support if Chrome exposes a separate multilingual AI flag.
6. Relaunch Chrome.
7. Open `chrome://components` and check whether any Gemini Nano / optimization guide model component can be updated or downloaded.
8. Reload the unpacked extension in `chrome://extensions`.
9. Hard-refresh Disney+.

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
- Uses visible/native subtitle text for Netflix translation.
- Netflix image-based subtitle layers are not readable by this MVP; use a text/native subtitle track when available.
- Parses, dedupes, sorts, and renders captions in an overlay.
- Can translate the active captured caption with Chrome's experimental built-in AI APIs.
- Stores basic settings in `chrome.storage.local`.

## Known Limitations

- Disney+ may use different subtitle CDN hosts than the current patterns.
- If the background service worker cannot refetch segment URLs, request capture will need a different strategy.
- AI translation depends on experimental Chrome APIs and may not be available in all Chrome builds.
- Prompt API translation can be slower or less consistent than the dedicated Translator API.
- The panel is intentionally simple and will be replaced after the Disney+ capture/render pipeline is proven.
