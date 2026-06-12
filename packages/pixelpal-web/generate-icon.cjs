// Generate a simple 256x256 PNG and convert to ICO
const fs = require('fs');
const path = require('path');

// Create a simple 256x256 purple gradient PNG
// PNG file structure: signature + IHDR + IDAT + IEND

function createPNG(width, height, r, g, b) {
  // Create raw pixel data (RGBA)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte for each row
    for (let x = 0; x < width; x++) {
      // Purple gradient with pixel pal theme color #9B7FD4
      const factor = 1 - (y / height) * 0.3;
      rawData.push(Math.floor(r * factor));
      rawData.push(Math.floor(g * factor));
      rawData.push(Math.floor(b * factor));
      rawData.push(255);
    }
  }
  return Buffer.from(rawData);
}

// Simple PNG encoder (uncompressed, for small icon)
function encodePNG(width, height, rgbaData) {
  const zlib = require('zlib');
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrChunk = createChunk('IHDR', ihdrData);
  
  // IDAT chunk (compressed pixel data)
  const rawData = Buffer.from(rgbaData);
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = makeCRCTable();
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }
  return crc ^ 0xFFFFFFFF;
}

function makeCRCTable() {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

// Create ICO file from PNG
function createICO(pngBuffers) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);  // reserved
  header.writeUInt16LE(1, 2);  // type (1 = ICO)
  header.writeUInt16LE(pngBuffers.length, 4);  // image count
  
  // Directory entries: 16 bytes each
  const entries = [];
  let offset = 6 + pngBuffers.length * 16;
  
  for (const { width, height, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = width === 256 ? 0 : width;   // width (0 = 256)
    entry[1] = height === 256 ? 0 : height; // height (0 = 256)
    entry[2] = 0;  // color palette
    entry[3] = 0;  // reserved
    entry.writeUInt16LE(1, 4);  // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);  // size of PNG data
    entry.writeUInt32LE(offset, 12);  // offset to PNG data
    entries.push(entry);
    offset += data.length;
  }
  
  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.data)]);
}

// Generate icons at multiple sizes
const sizes = [256, 128, 64, 48, 32, 16];
const pngBuffers = sizes.map(size => {
  const rgbaData = createPNG(size, size, 155, 127, 212); // #9B7FD4
  const pngData = encodePNG(size, size, rgbaData);
  return { width: size, height: size, data: pngData };
});

// Create ICO
const icoBuffer = createICO(pngBuffers);

// Save files
fs.writeFileSync(path.join(__dirname, 'public', 'icon.ico'), icoBuffer);
console.log('Created public/icon.ico');

// Also save a PNG for reference
const png256 = pngBuffers.find(p => p.width === 256).data;
fs.writeFileSync(path.join(__dirname, 'public', 'icon.png'), png256);
console.log('Created public/icon.png');
