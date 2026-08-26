# EMERGENCY CHAT TRANSFER

Last updated: `2026-08-26 America/New_York`

## Objective

Build **ASCII MOTION LAB**, a local-first browser motion-design tool that takes
still images, animated GIFs, and browser-playable videos and renders animated
ASCII art. Main requested aesthetic: white characters on a black background,
with character-by-character reveal and pixel-sort-like transitions.

## Location

`C:\Users\xxxye\Documents\Codex\2026-08-02\files-mentioned-by-the-user-codex\ascii-motion-lab`

Remote: `https://github.com/513gel/ascii-motion-lab`

Live app: `https://513gel.github.io/ascii-motion-lab/`

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
