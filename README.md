# ASCII MOTION LAB

Local, browser-based ASCII motion tool for turning images, animated GIFs, and
browser-playable video into white-on-black animated character art.

## Current milestone

`001` is a self-contained no-build prototype. It supports image/GIF/video
upload, live ASCII conversion, character-build / terminal / pixel-sort / scanline
/ edge reveal modes; terminal-rain, particle, waveform, and ASCII-orb overlays;
prompt-driven styling controls; 2–5 color palettes, source-color sampling and
background gradients; built-in character libraries and text-weave glyphs; PNG
frame export; and one-shot WebM build export.

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
  is formed from that text. Glyph Size changes physical character size and
  density, while Text Repeat controls how long each pasted character repeats.

## Viewport and edit history

Use **Attach Source** to select image/video files; clicking the viewport no
longer opens the file picker. Once loaded, drag the viewport to pan, use the
mouse wheel/trackpad to zoom, and choose **Fit View** to reset it. The top bar
contains Undo/Redo buttons for settings, text changes, and viewport moves;
`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, and `Alt+Left`/`Alt+Right` work outside text
fields.

## Text Foundation

Choose **Text Foundation** to use custom writing as the ASCII material rather
than the brightness character ramp. Paste any amount of text or import a
`.txt`, `.md`, or `.csv` file. Continuous Flow uses the whole text stream,
Preserve Lines maps supplied lines across the glyph rows, and Reverse Flow
runs the stream backward. Brightness now controls the text alpha, so the source
image forms a readable mask rather than a flat wall of letters.

## Copyable ASCII / text art

**Generate Current Frame** creates a literal monospace text representation of
the active output frame; **Copy Text** puts it on the clipboard. Dense ASCII,
English, and Binary libraries produce strict 7-bit ASCII. Blocks, katakana, and
symbols remain copyable text art but intentionally contain Unicode characters.
Canvas-only color, scanlines, overlays, and jitter do not exist in the plain
text version, because it is actual characters rather than an image.

## Build sound

Output now makes the sound choice explicit: **None**, **Classic Tick**, or
**Data Texture**. Classic Tick is the default and fires a short one-shot from
the click source for each rendered build step; it is not a passive loop. Use
6–12 FPS for intentionally chunky, sparse arrivals. Data Texture keeps the
optional *Memory Leak*, *Cache Miss*, and *Heap Clack* ambient layer separate,
so it never plays on top of Classic Tick. Sound is included in Chrome/desktop
WebM exports when the browser exposes Web Audio capture. The click source was
derived from Johnmode's CC0 Freesound sound 826671, source page:
https://freesound.org/people/Johnmode/sounds/826671/

## Resolve Sound Lab

`sound-lab.html` is a small phone-friendly audition board containing 20
browser-synthesized **Algorithmic Data Texture** candidates for character
arrivals. The current sound DNA is dense, dry micro-events: comparison clicks,
packet ticks, unstable pitch clusters, and short noise bursts inspired by a
user-supplied sorting-algorithm reference. It has no samples or external
dependencies; choose a sound code there before integrating that sound DNA into
the main converter.

The pack is divided into Sort Ticks, Data Swarms, and System Events. Each tile
uses a different synthesis path—hard-gated noise, fixed-pitch packets, pulse
trains, FM warble, and filtered static—rather than a shared falling-pitch
impact or vocal decay.

## Output controls

At **100%** with **Source Native** selected, output keeps the uploaded source's
native pixel width and height. Output also provides aspect-ratio presets,
native/720/1080/1440/1920/2160/3840 long-edge choices, custom long-edge input,
and a separate 25–200% multiplier. There is no fixed vertical-resolution cap:
for example, a 9:16 output with a 3840 long edge renders at 2160 × 3840.

Glyph Size controls the physical size and density of every ASCII character and
now ranges from 5–180. Text Repeat only controls repeated pasted characters in
Text Weave; it does not alter character size.

**Glyph Collapse** is a separate build style: it begins at the maximum 180px
glyph scale, then smoothly resolves down to the Glyph Size you selected. It
does not hide characters during the transition, so the whole coarse image
progressively gains detail and ends on the exact requested final density.

Animated presets are build-and-hold: the resolve runs once, then freezes on
the final fully resolved frame so settings can be changed and inspected. The
Play control becomes **Replay** after completion. Glyph Size ranges from 5 to
180 for deliberately large ASCII, while output settings change file dimensions.

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
