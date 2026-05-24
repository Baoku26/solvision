import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcVal]);
}

function makePNG(w, h, colorFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB

  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3);
    row[0] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const [r, g, b] = colorFn(x, y, w, h);
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }

  const idat = deflateSync(Buffer.concat(rows));
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

// Color function: Solana-style gradient icon (cyan → purple)
function iconColor(x, y, w, h) {
  const margin = Math.floor(w * 0.15);
  const barH = Math.floor(h * 0.09);
  const gap = Math.floor(h * 0.065);
  const startY = Math.floor(h * 0.25);

  // Three horizontal bars (Solana logo style)
  for (let i = 0; i < 3; i++) {
    const barTop = startY + i * (barH + gap);
    if (y >= barTop && y < barTop + barH && x >= margin && x < w - margin) {
      return i === 1 ? [153, 69, 255] : [0, 255, 163]; // purple middle, cyan outer
    }
  }
  return [0, 0, 0]; // black background (transparent on additive display)
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-64.png', makePNG(64, 64, iconColor));
writeFileSync('public/icons/icon-192.png', makePNG(192, 192, iconColor));
console.log('Icons generated: public/icons/icon-64.png, public/icons/icon-192.png');
