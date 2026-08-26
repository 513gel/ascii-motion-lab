# EMERGENCY CHAT TRANSFER

Last updated: `2026-08-25 America/New_York`

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
- `assets/ascii-resolve-click-loop.mp3` is a 3.500-second loop-safe cue made
  from Johnmode Freesound 826671 (CC0). Animated presets restart and loop it in
  sync with the resolve cycle; Output has a mute toggle and level control.
- Color control now supports a single editable foreground color, 2–5 color
  brightness palettes, and real RGB source-color sampling. Palette presets:
  Monochrome, Oni Blood, Cobalt Signal, Phosphor Green, Amber Terminal, Game
  Boy, Thermal, Auto Source, and Custom. The background supports solid,
  vertical-gradient, and radial-glow fills with two editable colors.
- Character libraries now provide dense ASCII, English, binary/terminal,
  blocks, Japanese katakana, symbols/runes, and a custom ramp. Text Weave can
  build the visible source from pasted lyrics or another text block; Text Scale
  controls character repetition while Glyph Size controls image density.
- On phone-width layouts, the header and preview stage are sticky. Scrolling
  through controls leaves the active source/output visibly pinned below the
  header; mobile `main` must remain block layout for sticky containment.
- `sound-lab.html` is a dependency-free mobile audition board with exactly 20
  local Web Audio **Chunky Chatter** candidates for ASCII arrivals. All prior
  detail, organic, signal, resolve, and magnetic-click candidates were removed
  at the user's request. It is now divided into 8 Low Data Textures, 6 Crunch
  Mouths, and 6 Datamosh Beasts. The common falling sub-thump and decaying
  formant recipe was removed after the user correctly identified it as making
  every tile sound like a PS1 ball bounce. The 20 current tiles use distinct
  hard-gated noise, constant-pitch formants, pulse trains, FM warble, clipped
  radio speech, or filtered-static paths instead. It is deliberately separate
  from the converter until the user selects a sound DNA. The page requires a
  tap before audio can start (browser autoplay policy).
- Git is configured **locally for this repository only** as `513gel` using
  `299465158+513gel@users.noreply.github.com`; do not add any co-author line.
- Browser-verified after these controls were added: local image load, Oni
  palette/radial background, katakana library, pasted-text weave, Text Scale,
  and Auto Source all worked without console errors. Sticky mobile preview was
  verified at 390 × 844 after a 650px page scroll (stage remained at top 50px).
  The first 20-item Chatter replacement parsed with Node and was
  browser-checked. The current distinct-engine replacement parses with Node,
  has 20 entries, and validates that every tile references a real recipe, but
  its post-edit browser audition could not run because the connected browser
  reported no controllable tabs. Re-audition the new pack manually after
  opening the live Sound Lab. MP4 export and AI-video handoff are future
  additions; FFmpeg should remain optional and local.

## Run

```powershell
cd C:\Users\xxxye\Documents\Codex\2026-08-02\files-mentioned-by-the-user-codex\ascii-motion-lab
py -m http.server 8080
```

Open `http://localhost:8080`.
