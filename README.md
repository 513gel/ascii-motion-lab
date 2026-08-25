# ASCII MOTION LAB

Local, browser-based ASCII motion tool for turning images, animated GIFs, and
browser-playable video into white-on-black animated character art.

## Current milestone

`001` is a self-contained no-build prototype. It supports image/GIF/video
upload, live ASCII conversion, character-build / terminal / pixel-sort / scanline
/ edge reveal modes; terminal-rain, particle, waveform, and ASCII-orb overlays;
prompt-driven styling controls; PNG frame export; and WebM
loop export.

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
