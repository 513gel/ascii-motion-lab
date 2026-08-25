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
- Git is configured **locally for this repository only** as `513gel` using
  `299465158+513gel@users.noreply.github.com`; do not add any co-author line.
- Not yet visually tested in Chrome. MP4 export and AI-video handoff are future
  additions; FFmpeg should remain optional and local.

## Run

```powershell
cd C:\Users\xxxye\Documents\Codex\2026-08-02\files-mentioned-by-the-user-codex\ascii-motion-lab
py -m http.server 8080
```

Open `http://localhost:8080`.
