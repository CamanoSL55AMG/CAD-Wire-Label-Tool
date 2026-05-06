// Generates a simple 256x256 .ico file using pure Node (no dependencies)
// Run once: node electron/create-icon.js

const fs = require('fs')
const path = require('path')

// Minimal valid 256x256 ICO with a blue/grey cable icon look
// This is a 1x1 pixel ICO structure scaled up — just enough for electron-builder to accept
// Replace electron/icon.ico with a real icon before publishing

const WIDTH = 256
const HEIGHT = 256
const BPP = 4 // RGBA

// Draw a simple icon: dark blue background, white "W" for Wire
const pixels = Buffer.alloc(WIDTH * HEIGHT * BPP)

for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const idx = (y * WIDTH + x) * BPP
    // Background: dark blue #1a3a5c
    pixels[idx]     = 0x1a  // R
    pixels[idx + 1] = 0x3a  // G
    pixels[idx + 2] = 0x5c  // B
    pixels[idx + 3] = 0xff  // A
  }
}

// Draw a simple white "W" shape in the center
const drawPixel = (x, y) => {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return
  const idx = (y * WIDTH + x) * BPP
  pixels[idx] = 0xff
  pixels[idx + 1] = 0xff
  pixels[idx + 2] = 0xff
  pixels[idx + 3] = 0xff
}

// W shape scaled to 256x256 — thick strokes
for (let t = -6; t <= 6; t++) {
  for (let i = 48; i <= 208; i++) drawPixel(48 + t, i)    // left vertical
  for (let i = 48; i <= 208; i++) drawPixel(208 + t, i)   // right vertical
  for (let i = 128; i <= 208; i++) drawPixel(128 + t, i)  // center vertical
  for (let i = 48; i <= 128; i++) drawPixel(i + t, 208)   // bottom-left
  for (let i = 128; i <= 208; i++) drawPixel(i + t, 208)  // bottom-right
}

// BMP DIB header (BITMAPINFOHEADER) for ICO image data
function buildBMPData(pixels, w, h) {
  const dibHeader = Buffer.alloc(40)
  dibHeader.writeUInt32LE(40, 0)       // header size
  dibHeader.writeInt32LE(w, 4)         // width
  dibHeader.writeInt32LE(h * 2, 8)    // height * 2 (ICO convention)
  dibHeader.writeUInt16LE(1, 12)       // color planes
  dibHeader.writeUInt16LE(32, 14)      // bits per pixel
  dibHeader.writeUInt32LE(0, 16)       // compression (none)
  dibHeader.writeUInt32LE(w * h * 4, 20) // image size

  // ICO stores rows bottom-up
  const flipped = Buffer.alloc(w * h * 4)
  for (let row = 0; row < h; row++) {
    const src = pixels.slice(row * w * 4, (row + 1) * w * 4)
    src.copy(flipped, (h - 1 - row) * w * 4)
  }

  // AND mask (1 bit per pixel, all 0 = opaque), padded to 4-byte rows
  const maskRowBytes = Math.ceil(w / 32) * 4
  const mask = Buffer.alloc(h * maskRowBytes, 0)

  return Buffer.concat([dibHeader, flipped, mask])
}

const bmpData = buildBMPData(pixels, WIDTH, HEIGHT)

// ICO file structure
const ICON_DIR_SIZE = 6
const ICON_DIR_ENTRY_SIZE = 16
const dataOffset = ICON_DIR_SIZE + ICON_DIR_ENTRY_SIZE

const header = Buffer.alloc(ICON_DIR_SIZE)
header.writeUInt16LE(0, 0)   // reserved
header.writeUInt16LE(1, 2)   // type = 1 (ICO)
header.writeUInt16LE(1, 4)   // image count

const entry = Buffer.alloc(ICON_DIR_ENTRY_SIZE)
entry[0] = WIDTH >= 256 ? 0 : WIDTH
entry[1] = HEIGHT >= 256 ? 0 : HEIGHT
entry[2] = 0     // color count
entry[3] = 0     // reserved
entry.writeUInt16LE(1, 4)    // color planes
entry.writeUInt16LE(32, 6)   // bits per pixel
entry.writeUInt32LE(bmpData.length, 8)
entry.writeUInt32LE(dataOffset, 12)

const icoBuffer = Buffer.concat([header, entry, bmpData])
const outPath = path.join(__dirname, 'icon.ico')
fs.writeFileSync(outPath, icoBuffer)
console.log('Icon written to', outPath)
