# EMERGENCY CHAT TRANSFER

Last updated: `2026-08-26 America/New_York`

## Objective

Build **GLYPHSHIFT**, a local-first browser motion-design tool that takes
still images, animated GIFs, and browser-playable videos and renders animated
ASCII art. Main requested aesthetic: white characters on a black background,
with character-by-character reveal and pixel-sort-like transitions.

## Location

`C:\Users\xxxye\Documents\Codex\2026-08-02\files-mentioned-by-the-user-codex\ascii-motion-lab`

Remote: `https://github.com/513gel/ascii-motion-lab`

Live app: `https://513gel.github.io/ascii-motion-lab/`

13th Oni host source: `C:\Users\xxxye\Documents\Codex\2026-08-02\files-mentioned-by-the-user-codex\13thoni-site`

GLYPHSHIFT is copied into `13thoni-site\public\GLYPHSHIFT\` and is linked
from the home terminal as `/GLYPHSHIFT/`, alongside MOTTLE.

## Current state

- `001` implemented as dependency-free `index.html`, `styles.css`, and `app.js`.
- Imports image/GIF/video, maps luminance to a customizable character ramp, and
  renders direct, decode, pixel-sort, scanline, edge, and terminal modes.
- Prompt box maps art-direction keywords to local settings and procedural
  terminal-rain, particle, waveform, and ASCII-orb overlays; it is not a
  generative AI model.
- Exports PNG stills and canvas-recorded WebM loops.
- Published from `main` with GitHub Pages branch publishing; live build returned
  HTTP 200. The project is public so the user can test it from a phone at work.
- Mobile upload uses a transparent native file-picker target over the entire
  preview. The empty-state overlay must retain `.empty-state[hidden]` so it
  does not obscure a successfully loaded source.
- Mobile UI has been verified at 390 × 844. The mobile-first path is the six
  Quick Start presets (Direct, Build In, Pixel Sort, Scanline, Terminal, Red
  Rain); the text field is an optional settings shortcut only.
- The transparent mobile file target is a child of `.stage-shell`, which must
  remain `position: relative`; otherwise it covers the entire page and steals
  control-panel taps. Verified that a Direct preset tap does not open it.
- Every newly selected source is explicitly reset to `Direct ASCII — Still`
  and paused, avoiding Chrome form-state restoration of a prior animation mode.
- Each upload resets Output to **Source Native**, source aspect ratio, and
  **100%** multiplier. Output has source/16:9/9:16/1:1/4:5/4:3/3:2 aspect
  choices plus native/720/1080/1440/1920/2160/3840/custom long-edge choices.
  There is no app-specific vertical cap: 9:16 at long-edge 3840 is 2160 ×
  3840, and Custom accepts larger values at the browser/device canvas limit.
  Changed aspect ratios use a center crop rather than stretching.
- Glyph Size now ranges **5–180** and is genuinely physical character size.
  A prior `fit()` function enlarged small grids back to its 220 × 260 maximum,
  defeating the size slider. It now only clamps oversized grids down. `Text
  Repeat` only repeats pasted Text Weave characters; it does not affect size.
- New **Glyph Collapse** build style starts at the maximum 180 glyph size and
  smoothly resolves down to the current Glyph Size setting. It samples a new
  grid every real render frame and always shows the entire coarse image, so it
  gains visual detail instead of revealing pixels. The Quick Start tile sets it
  to 12 FPS; the output selector exposes it as `glyph-build`.
- The viewport is no longer a transparent upload target. `ATTACH SOURCE` opens
  the source picker; the loaded canvas supports pointer drag panning, wheel
  zoom (0.25–8×), and `FIT VIEW`. The viewport plus all controls use an 80-step
  Undo/Redo history with buttons, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, and
  Alt+Left/Alt+Right outside editable fields. Loading a new source resets its
  history baseline and viewport.
- Text Weave was renamed **Text Foundation**. It retains raw pasted line breaks,
  supports Continuous/Preserve Lines/Reverse layouts, displays a character
  count, imports `.txt`, `.md`, or `.csv` with the local File API, and uses
  source brightness as glyph alpha so it reads as an image mask. `TEXT REPEAT`
  still controls character advancement.
- Output has **Copyable Text Art**: Generate Current Frame serializes the real
  output grid to a textarea and Copy Text sends it to the clipboard (with an
  `execCommand` fallback). Dense ASCII/English/Binary are strict 7-bit output;
  the other character libraries intentionally yield copyable Unicode text art.
  Canvas-only color, scanlines, overlays, and jitter are omitted by design.
- Classic Tick is now tied to actual generation: render counts newly visible
  non-space glyph cells and fires one sound only when that count increases,
  with a modest loudness change based on the number added. It is no longer
  driven by an arbitrary timer. Avoid one sound per individual cell because
  a dense frame can add thousands at once; each audible event is a real
  rendering batch.
- Branding is now **GLYPHSHIFT**. The static app ships an original SVG icon
  suite (favicon, app mark, and maskable mark) plus a web manifest.
- The build selector now includes Line Printer, Glyph Scatter, Threshold Flood,
  Coarse Mosaic, Horizontal Sync, Vertical Terminal Rain, Edge Skeleton, Word
  Reveal, Compression Decode, and Corruption Repair, while retaining the older
  direct, pixel-sort, scanline, terminal, and glyph-collapse tools.
- Pattern controls provide original procedural hatch, wave, cross-stitch, maze,
  checker, and custom-tile glyph patterns for background, text fill, or both.
  The app also includes original single/double/corner/wave/terminal borders,
  dividers, safe-area control, build-linked border drawing/distortion, and a
  simple title/image/footer Poster Mode.
- Generation audio now classifies real batches: rows have printer-like ticks,
  scattered arrivals have short ticks, dark masses clack low, highlights ping
  high, and final arrivals lock. First and final ticks can be muted independently.
- Text Foundation now supports multiple local documents in one import, left,
  right, vertical, and spiral traversal, a literal locked sentence, text/ramp
  blend, weighted bold words, local find/replace, and a browser-local reusable
  text preset.
- Copyable text output has a source/40/80/120-column selector plus optional
  box border and direct .txt, HTML `<pre>`, Markdown, and ANSI-text downloads.
- `13thoni-site` was cloned fresh on 2026-08-26, GLYPHSHIFT was copied into its
  `public/GLYPHSHIFT` folder, its terminal node was changed to an online link,
  and `npm run build` passed locally after `npm ci`. Commit `bd4295b` was pushed
  and production verification returned HTTP 200 with GLYPHSHIFT controls at
  `https://13thoni.com/GLYPHSHIFT/`; the home terminal also contains the link.
- Animated presets are now build-and-hold: once the duration completes, the
  renderer freezes on the fully resolved final frame, stops resolve audio,
  pauses any video source, and changes Play to Replay. Restart resets the
  completed state without losing settings.
- Output is now the full delivery panel: aspect ratio, resolution/long edge,
  custom long edge, output multiplier, build length (0.5–20s), and actual
  renderer/export FPS (6–60). The render loop is frame-gated, so low FPS is
  visibly chunky rather than a mere recording label.
- Build sound is mutually exclusive: **None**, default **Classic Tick**, or
  optional **Data Texture**. Classic no longer passively loops: it decodes the
  existing `assets/ascii-resolve-click-loop.mp3` (Johnmode Freesound 826671,
  CC0) and plays a short one-shot for every rendered build step. Data Texture
  is the old Memory Leak/Cache Miss/Heap Clack ambient composition; it never
  layers with Classic. The shared Web Audio graph exposes a capture MediaStream
  for WebM export where supported.
- Color control now supports a single editable foreground color, 2–5 color
  brightness palettes, and real RGB source-color sampling. Palette presets:
  Monochrome, Oni Blood, Cobalt Signal, Phosphor Green, Amber Terminal, Game
  Boy, Thermal, Auto Source, and Custom. The background supports solid,
  vertical-gradient, and radial-glow fills with two editable colors.
- Character libraries now provide dense ASCII, English, binary/terminal,
  blocks, Japanese katakana, symbols/runes, and a custom ramp. Text Weave can
  build the visible source from pasted lyrics or another text block; Text Repeat
  controls character repetition while Glyph Size controls physical size/density.
- On phone-width layouts, the header and preview stage are sticky. Scrolling
  through controls leaves the active source/output visibly pinned below the
  header; mobile `main` must remain block layout for sticky containment.
- `sound-lab.html` is a dependency-free mobile audition board with exactly 20
  local Web Audio **Algorithmic Data Texture** candidates for ASCII arrivals.
  All prior detail, organic, signal, resolve, magnetic-click, and pseudo-speech
  candidates were removed at the user's request. The current pack is based on
  the user's local 11.47-second `Sorting Algorithms be like....wav` reference:
  its waveform/spectrogram has a continuous dry, broadband stream of dense
  micro-events rather than a discrete vocal or bouncy impact sound. The board
  is now divided into 8 Sort Ticks, 6 Data Swarms, and 6 System Events using
  hard-gated noise, fixed-pitch packets, pulse trains, FM warble, and filtered
  static. It is deliberately separate from the converter until the user selects
  a sound DNA. The page requires a tap before audio can start (browser autoplay
  policy).
- Git is configured **locally for this repository only** as `513gel` using
  `299465158+513gel@users.noreply.github.com`; do not add any co-author line.
- Browser-verified before the newest output/audio rework: local image load, Oni
  palette/radial background, katakana library, pasted-text weave, Text Repeat,
  and Auto Source all worked without console errors. Sticky mobile preview was
  verified at 390 × 844 after a 650px page scroll (stage remained at top 50px).
  The pre-reference Chatter replacement parsed with Node and was
  browser-checked. The current data-texture replacement parses with Node, has
  20 entries, and validates that every tile references a real recipe. The
  connected browser still reported no controllable tabs after the change, so
  post-edit audio audition must be done manually from the live Sound Lab. The
  The newest output/audio rework passes `node --check app.js`, `git diff
  --check`, and a script confirming every JavaScript DOM lookup has a matching
  HTML id. It still needs a visual/audible desktop test and a WebM-export test
  from the user. MP4 export and AI-video handoff are future additions; FFmpeg
  should remain optional and local.

## Run

```powershell
cd C:\Users\xxxye\Documents\Codex\2026-08-02\files-mentioned-by-the-user-codex\ascii-motion-lab
py -m http.server 8080
```

Open `http://localhost:8080`.
