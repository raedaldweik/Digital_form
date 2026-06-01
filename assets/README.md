# assets

The **full welcome screen** image lives here, named **exactly**:

```
welcome_full.png
```

This is the entire welcome screen (logos + skyline + gate + the painted
title, "Continue" button, and language toggle). The app shows it full-bleed
and overlays invisible click-zones on the Continue and language controls.
For the click-zones to line up, export it at the phone's aspect ratio
(roughly 9 : 19.5, e.g. 1179 × 2556 or 393 × 852).

`welcome_bg.png` (the top-only photo) is kept for reference but no longer used.

It's used as the full-bleed background of the welcome/login screen
(`.scene-photo` in `styles.css`). If the file is missing, the screen
gracefully falls back to the CSS-drawn dusk skyline scene.

Recommended: a portrait (tall) JPG of the Kuwait skyline / border gate,
roughly 1000–1800px wide. Keep it under ~500 KB if you can, so the page
loads fast on mobile.
