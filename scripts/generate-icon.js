import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height, drawFn) {
  // RGBA buffer
  const stride = width * 4;
  const rawData = Buffer.alloc(height * (1 + stride));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + stride);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // Helper to create PNG chunks
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Precomputed CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // No interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function drawLogicBench(x, y, w, h) {
  // Center coordinates (-1 to 1)
  const cx = (x - w / 2) / (w / 2);
  const cy = (y - h / 2) / (h / 2);

  // Background rounded rect with glowing border
  const cornerRadius = 0.22;
  const qx = Math.abs(cx) - (0.88 - cornerRadius);
  const qy = Math.abs(cy) - (0.88 - cornerRadius);
  const dist = Math.sqrt(Math.max(0, qx) ** 2 + Math.max(0, qy) ** 2) + Math.min(0, Math.max(qx, qy)) - cornerRadius;

  if (dist > 0.04) {
    return [0, 0, 0, 0]; // Transparent outer edge
  }

  // Border glow
  if (dist > -0.04) {
    const alpha = Math.min(255, Math.max(0, Math.floor((0.04 - dist) * 3000)));
    return [6, 182, 212, alpha]; // Cyan border #06b6d4
  }

  // Inner background CRT dark navy gradient
  const bgGrad = 14 + Math.floor((1 - cy) * 12);
  let red = 10;
  let green = 15;
  let blue = bgGrad;
  let alpha = 255;

  // Grid lines
  const gridStep = Math.max(16, Math.floor(w / 16));
  if (x % gridStep === 0 || y % gridStep === 0) {
    red += 14;
    green += 24;
    blue += 36;
  }

  // Waveform 1: Square clock signal
  const wave1Y = Math.floor(h * 0.40);
  const step = Math.max(12, Math.floor(w / 10));
  const wave1High = (Math.floor(x / step) % 2 === 0);
  const amp = Math.floor(h * 0.09);
  const targetY1 = wave1High ? wave1Y - amp : wave1Y + amp;
  const distY1 = Math.abs(y - targetY1);
  const pad = Math.floor(w * 0.16);

  if (distY1 < 3 && x > pad && x < w - pad) {
    const intensity = 1 - distY1 / 3;
    return [
      Math.floor(6 + intensity * 20),
      Math.floor(182 + intensity * 73),
      Math.floor(212 + intensity * 43),
      255
    ];
  }

  // Vertical transitions for square wave
  if ((x % step < 2) && Math.abs(y - wave1Y) <= amp && x > pad && x < w - pad) {
    return [16, 230, 255, 255];
  }

  // Waveform 2: Amber analog sine trace
  const nx = (x - pad) / (w - 2 * pad);
  if (nx >= 0 && nx <= 1) {
    const targetY2 = Math.floor(h * 0.65) + Math.sin(nx * Math.PI * 4) * Math.floor(h * 0.08);
    const distY2 = Math.abs(y - targetY2);
    if (distY2 < 3) {
      const intensity = 1 - distY2 / 3;
      return [
        Math.floor(245 + intensity * 10),
        Math.floor(158 + intensity * 60),
        Math.floor(11 + intensity * 50),
        255
      ];
    }
  }

  // LogicBench emblem accent in the center
  const logoDist = Math.sqrt((x - w / 2) ** 2 + (y - h / 2) ** 2);
  if (logoDist < Math.max(4, Math.floor(w * 0.04))) {
    return [16, 185, 129, 230]; // Emerald center dot
  }

  return [red, green, blue, alpha];
}

const buildDir = path.resolve('/build');
const publicDir = path.resolve('/public');

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// 1. Generate 512x512
const png512 = createPng(512, 512, drawLogicBench);
fs.writeFileSync(path.join(buildDir, 'icon.png'), png512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

// 2. Generate 192x192
const png192 = createPng(192, 192, drawLogicBench);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);

// 3. Generate 64x64 favicon
const png64 = createPng(64, 64, drawLogicBench);
fs.writeFileSync(path.join(publicDir, 'favicon.png'), png64);

console.log('Successfully generated all icons for web & desktop in /public and /build');
