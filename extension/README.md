# Dual Captions for Disney+

Minimal Manifest V3 Disney+ dual-caption MVP.

## Install Locally

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click Load unpacked.
4. Select this `extension/` directory.

## Use

1. Open Disney+ and start a video.
2. Enable Disney+ subtitles for the language you want to capture.
3. The in-page panel should show captured subtitle languages.
4. Choose the captured source language, preferably `en` if available.
5. Choose the first and second output languages. Defaults are `Deutsch` and `Português (Brasil)`.
6. Keep AI translate enabled to translate the source caption into both output languages.

## Chrome Built-In AI Translation

The AI translation mode uses Chrome's experimental built-in AI APIs when available.

To try it locally:

1. Open `chrome://flags`.
2. Enable the Prompt API / Gemini Nano flags you are testing with.
3. Enable multilingual support if Chrome exposes it for your build.
4. Relaunch Chrome.
5. Reload the unpacked extension and hard-refresh Disney+.

The extension checks these APIs in order:

- `window.Translator.create(...)`
- `window.ai.translator.create(...)`
- `window.LanguageModel.create(...)`
- `window.ai.languageModel.create(...)`

If the dedicated Translator API is available, it is used. If only Prompt API is available, the extension prompts the local model to translate the current subtitle. Translations are cached per source language, target language, and caption text.

## Current Scope

- Disney+ only.
- Captures WebVTT subtitle segments from Disney CDN hosts.
- Parses, dedupes, sorts, and renders captions in an overlay.
- Can translate the active captured caption with Chrome's experimental built-in AI APIs.
- Stores basic settings in `chrome.storage.local`.

## Known Limitations

- Disney+ may use different subtitle CDN hosts than the current patterns.
- If the background service worker cannot refetch segment URLs, request capture will need a different strategy.
- AI translation depends on experimental Chrome APIs and may not be available in all Chrome builds.
- Prompt API translation can be slower or less consistent than the dedicated Translator API.
- The panel is intentionally simple and will be replaced after the Disney+ capture/render pipeline is proven.
