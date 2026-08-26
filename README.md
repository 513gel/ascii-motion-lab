# ASCII MOTION LAB

Local, browser-based ASCII motion tool for turning images, animated GIFs, and
browser-playable video into white-on-black animated character art.

## Current milestone

`001` is a self-contained no-build prototype. It supports image/GIF/video
upload, live ASCII conversion, character-build / terminal / pixel-sort / scanline
/ edge reveal modes; terminal-rain, particle, waveform, and ASCII-orb overlays;
prompt-driven styling controls; 2–5 color palettes, source-color sampling and
background gradients; built-in character libraries and text-weave glyphs; PNG
frame export; and WebM loop export.

The default after upload is **Direct ASCII — Still**, so the source is visible
before anything animates. Use a Quick Start animation preset or **Play** to
start motion. On mobile, use **Quick Start** first. The typing field is optional and merely
maps a few obvious phrases to the same visible controls—it is not an AI model.

## Color and character controls

- **Color behavior:** one-color, a 2–5 color brightness palette, or actual
  RGB colors sampled from the source image/video.
- **Palette presets:** Monochrome, Oni Blood, Cobalt Signal, Phosphor Green,
  Amber Terminal, Game Boy, Thermal, Auto Source, plus fully custom colors.
- **Background fill:** solid, vertical gradient, or radial glow using two
  editable background colors.
- **Character libraries:** dense ASCII, English A–Z, binary/terminal, blocks,
  Japanese katakana, symbols/runes, or a custom character ramp.
- **Text Weave:** paste lyrics, a quote, or any text block; the visible image
  is formed from that text. Glyph Size changes image density, while Text Scale
  controls how long each pasted character repeats.

## Resolve sound

Animated presets can play a 3.5-second, loop-safe click/glitch cue precisely
from the beginning of each resolve cycle. It is enabled by default, can be
muted or level-adjusted in Output, and is included in Chrome/desktop WebM
exports when the browser exposes audio capture. The cue was derived from
Johnmode's CC0 Freesound sound 826671; source page:
https://freesound.org/people/Johnmode/sounds/826671/

## Resolve Sound Lab

`sound-lab.html` is a small phone-friendly audition board containing 20
browser-synthesized **Chunky Chatter** candidates for character arrivals:
crunchy fictional pseudo-speech built from formant chirps, square-wave edges,
pitch jumps, noise, and stutters. It has no samples or external dependencies;
choose a sound code there before integrating that sound DNA into the main
converter.

## Run locally

```powershell
cd C:\Users\xxxye\Documents\Codex\2026-08-02\files-mentioned-by-the-user-codex\ascii-motion-lab
py -m http.server 8080
```

Then open `http://localhost:8080` in Chrome.

## Media support

- Still images: browser-supported formats, including PNG/JPG/WebP and usually
  GIF/APNG.
- Animated GIF: live animation is sampled directly by the browser.
- Mobile upload uses the native picker over the full preview area; tap anywhere
  in the empty preview to choose a photo or video.
- Video: MP4/WebM are the dependable choices. MOV/MKV support depends on the
  codecs inside the file and the installed browser codecs.
- Export: native browser `MediaRecorder` produces a high-quality WebM loop.
  MP4 export needs an FFmpeg companion (planned for the next local-app pass).

## Explicit non-goal in 001

Text prompting adjusts the procedural treatment of the uploaded asset; it does
not generate a completely new AI video. That requires a connected local model
such as ComfyUI/Wan and should be a separate opt-in feature.
