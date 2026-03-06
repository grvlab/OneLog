/**
 * Generate a 256x256 PNG icon for the app.
 * Pure Node.js — no native dependencies.
 * Creates a diary / notebook icon with a teal gradient.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
const pixels = Buffer.alloc(SIZE * SIZE * 4);

// ── Helpers ──
function setPixel(x, y, r, g, b, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const idx = (y * SIZE + x) * 4;
  if (a < 255 && pixels[idx + 3] > 0) {
    // alpha blend
    const srcA = a / 255, dstA = pixels[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    pixels[idx]     = Math.round((r * srcA + pixels[idx]     * dstA * (1 - srcA)) / outA);
    pixels[idx + 1] = Math.round((g * srcA + pixels[idx + 1] * dstA * (1 - srcA)) / outA);
    pixels[idx + 2] = Math.round((b * srcA + pixels[idx + 2] * dstA * (1 - srcA)) / outA);
    pixels[idx + 3] = Math.round(outA * 255);
  } else {
    pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b; pixels[idx + 3] = a;
  }
}

function fillRect(x1, y1, w, h, r, g, b, a = 255) {
  for (let y = y1; y < y1 + h; y++)
    for (let x = x1; x < x1 + w; x++)
      setPixel(x, y, r, g, b, a);
}

function fillRoundedRect(x1, y1, w, h, rad, r, g, b, a = 255) {
  for (let y = y1; y < y1 + h; y++) {
    for (let x = x1; x < x1 + w; x++) {
      let inside = true;
      // Check each corner
      const lx = x - x1, ly = y - y1;
      if (lx < rad && ly < rad && Math.hypot(lx - rad, ly - rad) > rad) inside = false;
      if (lx > w - rad - 1 && ly < rad && Math.hypot(lx - (w - rad - 1), ly - rad) > rad) inside = false;
      if (lx < rad && ly > h - rad - 1 && Math.hypot(lx - rad, ly - (h - rad - 1)) > rad) inside = false;
      if (lx > w - rad - 1 && ly > h - rad - 1 && Math.hypot(lx - (w - rad - 1), ly - (h - rad - 1)) > rad) inside = false;
      if (inside) setPixel(x, y, r, g, b, a);
    }
  }
}

function fillCircle(cx, cy, radius, r, g, b, a = 255) {
  for (let y = cy - radius; y <= cy + radius; y++)
    for (let x = cx - radius; x <= cx + radius; x++)
      if (Math.hypot(x - cx, y - cy) <= radius)
        setPixel(x, y, r, g, b, a);
}

// ── Draw the diary icon ──

// Diary body — main book shape with gradient
const bookX = 50, bookY = 24, bookW = 170, bookH = 208, bookR = 14;

for (let y = bookY; y < bookY + bookH; y++) {
  for (let x = bookX; x < bookX + bookW; x++) {
    const lx = x - bookX, ly = y - bookY;
    let inside = true;
    if (lx < bookR && ly < bookR && Math.hypot(lx - bookR, ly - bookR) > bookR) inside = false;
    if (lx > bookW - bookR - 1 && ly < bookR && Math.hypot(lx - (bookW - bookR - 1), ly - bookR) > bookR) inside = false;
    if (lx < bookR && ly > bookH - bookR - 1 && Math.hypot(lx - bookR, ly - (bookH - bookR - 1)) > bookR) inside = false;
    if (lx > bookW - bookR - 1 && ly > bookH - bookR - 1 && Math.hypot(lx - (bookW - bookR - 1), ly - (bookH - bookR - 1)) > bookR) inside = false;
    if (inside) {
      const t = ly / bookH;
      const r = Math.round(10 + (15 - 10) * t);
      const g = Math.round(38 + (100 - 38) * t);
      const b = Math.round(35 + (90 - 35) * t);
      setPixel(x, y, r, g, b);
    }
  }
}

// Spine — a darker strip on the left edge of the book
fillRoundedRect(bookX, bookY, 28, bookH, bookR, 8, 30, 28);

// Spine decorative bands (gold/amber accents)
fillRect(bookX, bookY + 28, 28, 4, 212, 165, 50);
fillRect(bookX, bookY + bookH - 32, 28, 4, 212, 165, 50);

// Elastic band / bookmark ribbon (red accent down the middle)
const ribbonX = bookX + bookW / 2 + 10;
fillRect(ribbonX, bookY, 4, bookH + 12, 200, 50, 60);
// Small triangle at the bottom of the ribbon
for (let i = 0; i < 8; i++) {
  fillRect(ribbonX - i, bookY + bookH + 12 + i, 4 + i * 2, 1, 200, 50, 60);
}

// Page edges — light lines visible on the right side
for (let i = 0; i < 3; i++) {
  const px = bookX + bookW - 6 + i * 2;
  fillRect(px, bookY + 10, 1, bookH - 20, 180, 195, 220);
}

// Cover label area — lighter rectangle on the front cover
const labelX = bookX + 42, labelY = bookY + 50, labelW = 115, labelH = 65;
fillRoundedRect(labelX, labelY, labelW, labelH, 6, 13, 148, 136, 180);

// Horizontal "text" lines on the label (simulating title text)
for (let i = 0; i < 4; i++) {
  const lineY = labelY + 14 + i * 13;
  const lineW = i === 0 ? 85 : i === 1 ? 70 : i === 2 ? 60 : 40;
  const lineX = labelX + Math.floor((labelW - lineW) / 2);
  fillRoundedRect(lineX, lineY, lineW, 5, 2, 220, 230, 245);
}

// Pen / pencil — angled across the bottom-right corner
// Draw a simple diagonal pen from bottom-right
const penStartX = 155, penStartY = 185;
const penLen = 70;
const angle = -Math.PI / 4; // 45 degrees
const cosA = Math.cos(angle), sinA = Math.sin(angle);

for (let i = 0; i < penLen; i++) {
  const px = penStartX + cosA * i;
  const py = penStartY + sinA * i;
  // Pen body (wider)
  for (let w = -2; w <= 2; w++) {
    const wx = px + sinA * w;
    const wy = py - cosA * w;
    if (i < 10) {
      // Pen tip — gold/amber
      setPixel(wx, wy, 230, 185, 60);
    } else if (i < 14) {
      // Metal ferrule
      setPixel(wx, wy, 160, 170, 185);
    } else {
      // Pen body — dark teal
      setPixel(wx, wy, 15, 60, 55);
    }
  }
}
// Pen tip point
for (let i = 0; i < 5; i++) {
  const px = penStartX + cosA * (-i);
  const py = penStartY + sinA * (-i);
  for (let w = -(2 - Math.floor(i / 2)); w <= (2 - Math.floor(i / 2)); w++) {
    setPixel(px + sinA * w, py - cosA * w, 60, 60, 60);
  }
}

// Small circle dot at the very tip
setPixel(penStartX - cosA * 5, penStartY - sinA * 5, 30, 30, 30);

// Encode as PNG
function crc32(buf) {
  let crc = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const combined = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(combined));
  return Buffer.concat([len, combined, crc]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type: RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// IDAT — add filter byte (0 = none) to each row
const rawData = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  rawData[y * (SIZE * 4 + 1)] = 0; // filter: none
  pixels.copy(rawData, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const compressed = zlib.deflateSync(rawData);

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const iend = chunk('IEND', Buffer.alloc(0));

const png = Buffer.concat([
  signature,
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  iend,
]);

const outPath = path.join(__dirname, '..', 'build', 'icon.png');
fs.writeFileSync(outPath, png);
console.log(`Icon written to ${outPath} (${png.length} bytes)`);
