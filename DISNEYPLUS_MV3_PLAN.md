# Disney+ First MV3 Rebuild Plan

## Goal

Build a small, modern Manifest V3 extension focused only on Disney+ dual captions first. Use this fork as a reference, but avoid carrying over the old multi-package MV2 build system.

## Recommendation

Do not modernize the current extension in-place. Create a fresh MV3 extension shell and port only the useful Disney+ caption logic.

Keep from this repo:

- `site_integrations/disney-plus/parser.js`
- `site_integrations/disney-plus/caption-processor.js`
- the general adapter idea from `site_integrations/disney-plus/adapter.js`
- the caption timing/rendering concept from `content_script/src/Provider.js` and `content_script/src/Captions.js`

Avoid carrying over:

- Manifest V2 generation
- multi-package `yarn link` build flow
- old React 16 / CRA 1 setup
- popup redesign/legacy UI complexity
- bookmarks/download/settings features until the core caption loop works

## Phase 1: Minimal MV3 Shell

Create a new simple extension structure, preferably one package:

```text
extension/
  manifest.json
  src/
    background.js
    content.js
    disneyplus/
      parser.js
      captionProcessor.js
      adapter.js
    overlay.js
    styles.css
```

Initial manifest should include only Disney+ and the caption hosts needed for Disney+:

- content script match: `https://www.disneyplus.com/*`
- host permissions for Disney+ page access
- host permissions for Disney subtitle segment URLs once confirmed
- background service worker
- `webRequest` permission if request observation is still enough

Deliverable:

- Extension loads unpacked in Chrome.
- Content script runs on Disney+ pages.
- Background service worker logs subtitle segment requests.

## Phase 2: Confirm Current Disney+ Subtitle Network Flow

Use DevTools on Disney+ playback and verify current subtitle request URLs.

The old pattern is:

```text
https://*.dssott.com/*/disney/*/seg_*.vtt
```

Check whether Disney+ still uses:

- segmented `.vtt` files
- `dssott.com` hosts
- a different CDN/domain
- query parameters that need to be included in the match pattern
- separate subtitle tracks per language

Deliverable:

- Updated documented Disney+ caption URL pattern.
- Sample captured VTT response saved as a fixture for tests.

## Phase 3: Port And Fix Disney+ Parser

Port the existing Disney+ WebVTT parser, but fix known issues while keeping it small.

Required fixes:

- Accept captions starting at `0` seconds.
- Handle cue settings after the end time, such as `line`, `position`, or `align`.
- Strip HTML safely.
- Ignore `STYLE`, `NOTE`, and metadata blocks.
- Return an empty list only when the file is valid but has no cues.
- Throw useful parser errors for invalid files.

Deliverable:

- Parser unit tests with old and newly captured Disney+ VTT samples.
- Parser returns normalized captions:

```js
{
  startTime: number,
  endTime: number,
  text: string
}
```

## Phase 4: Caption Segment Store

Disney+ subtitles arrive in chunks, so maintain a per-video/per-language store.

The old processor only appends chunks. Replace that with minimal normalization:

- merge new captions into existing captions
- dedupe by `startTime`, `endTime`, and `text`
- sort by `startTime`
- optionally cap old captions if memory becomes a problem

Deliverable:

- Given multiple VTT segments, the store returns a stable sorted caption list.
- Duplicate network requests do not duplicate captions.

## Phase 5: Render Overlay On Disney+

Start with a simple fixed overlay rather than trying to match every Disney+ native subtitle style.

Use the page video element:

```js
const video = document.querySelector('video');
const currentTime = video.currentTime;
```

Render the second caption based on current time:

- fixed near bottom of viewport
- above or below the native Disney+ subtitle area
- high z-index
- pointer-events disabled
- readable text shadow/background
- works in fullscreen

Deliverable:

- Second captions appear in sync while playing Disney+.
- Overlay disappears when there is no active caption.
- Overlay survives route changes inside Disney+ SPA navigation.

## Phase 6: Minimal User Control

Do not rebuild the full old popup yet.

Start with one of these simple controls:

- extension popup with on/off and selected second language
- or temporary in-page debug panel

Minimum settings:

- enabled/disabled
- selected second subtitle language if multiple tracks can be detected
- optional text size

Deliverable:

- User can turn dual captions on/off.
- User can choose which captured language to render.

## Phase 7: Hardening

Handle common Disney+ failure cases:

- user changes episode/movie without full page reload
- subtitles disabled on Disney+
- selected second language has not been captured yet
- network request captured before content script is ready
- caption segment fetch fails
- Disney+ changes DOM roots/fullscreen containers

Deliverable:

- Clear debug logs in development mode.
- No repeated duplicate processing loops.
- No uncaught exceptions during navigation/playback.

## Phase 8: Package The Disney+ MVP

Before adding Netflix, make Disney+ stable enough to use daily.

Checklist:

- MV3 extension loads cleanly.
- Disney+ content script runs only on Disney+.
- Captions are captured, parsed, deduped, and rendered.
- Basic settings persist via `chrome.storage`.
- No dependency on the old build script.
- README has local install instructions.

## Defer Until After Disney+ MVP

Do not do these until Disney+ works end-to-end:

- Netflix support
- YouTube/Kanopy support
- bookmarks
- subtitle download
- full redesigned popup
- translation features
- complex styling controls
- publishing to Chrome Web Store

## Main Technical Risk

The biggest risk is not rendering; it is whether MV3 can still reliably capture and refetch Disney+ subtitle segment URLs with the user session credentials. Confirm that first with a minimal background/content proof of concept.

## Success Criteria

Disney+ MVP is successful when:

- opening a Disney+ video with subtitles enabled causes subtitle segment URLs to be detected
- VTT segment contents are parsed into caption objects
- captions from multiple segments are merged without duplicates
- a selected second-language caption renders in sync over the video
- the extension survives Disney+ SPA navigation without reloading the extension
