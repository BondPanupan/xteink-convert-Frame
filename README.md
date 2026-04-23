# xteink-convert-Frame

Simple image processing for e-ink reading.

## What this does

This script converts scanned book pages into e-ink friendly frames:
- resizes images to fit `800px` width
- normalizes lighting and removes shadows
- converts to pure black-and-white for e-ink devices
- stitches vertical pages into a long canvas
- slices the canvas into scrolling frames for easier reading

## Requirements

- Node.js
- npm
- `sharp` dependency

## Install

From the project root:

```bash
npm install
```

## Usage

Place your source images in `images/imperfection/`.

Then run:

```bash
node index.js
```

Processed frames are written to `output/`.

## Configuration

You can adjust these values in `index.js`:

- `FRAME_WIDTH` — output width in pixels
- `FRAME_HEIGHT` — size of each extracted frame
- `SCROLL_STEP` — vertical scroll step between frames

## Notes

- This project is optimized for black-and-white e-ink reading.
- If your source images are not scanned in portrait orientation, `sharp.rotate()` will auto-orient them.
- Use the `output/` frames on your e-reader or further convert to EPUB if needed.
