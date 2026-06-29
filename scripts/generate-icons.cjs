const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SVG_PATH = path.join(__dirname, '..', 'public', 'favicon.svg');
const BUILD_DIR = path.join(__dirname, '..', 'build');

async function generateIcons() {
  if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });

  const svgBuffer = fs.readFileSync(SVG_PATH);

  // Generate PNGs at multiple sizes
  const sizes = [16, 32, 48, 64, 128, 256, 512];
  const pngBuffers = {};

  for (const size of sizes) {
    const png = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers[size] = png;

    // Save 256x256 as icon.png for electron-builder
    if (size === 256) {
      fs.writeFileSync(path.join(BUILD_DIR, 'icon.png'), png);
      console.log('Created build/icon.png (256x256)');
    }
    // Save 512x512 for high-res
    if (size === 512) {
      fs.writeFileSync(path.join(BUILD_DIR, 'icon.png'), png);
      console.log('Updated build/icon.png (512x512)');
    }
  }

  // Generate ICO file (Windows icon) with multiple sizes
  // ICO format: header + directory entries + PNG data
  const icoSizes = [16, 32, 48, 256];
  const icoPngs = [];

  for (const size of icoSizes) {
    const png = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    icoPngs.push({ size, data: png });
  }

  // ICO header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type: ICO
  header.writeUInt16LE(icoPngs.length, 4); // Number of images

  // ICO directory entries (16 bytes each)
  const directory = Buffer.alloc(icoPngs.length * 16);
  let dataOffset = 6 + (icoPngs.length * 16);

  for (let i = 0; i < icoPngs.length; i++) {
    const { size, data } = icoPngs[i];
    const entryOffset = i * 16;
    directory.writeUInt8(size === 256 ? 0 : size, entryOffset);     // Width
    directory.writeUInt8(size === 256 ? 0 : size, entryOffset + 1); // Height
    directory.writeUInt8(0, entryOffset + 2);   // Color palette
    directory.writeUInt8(0, entryOffset + 3);   // Reserved
    directory.writeUInt16LE(1, entryOffset + 4); // Color planes
    directory.writeUInt16LE(32, entryOffset + 6); // Bits per pixel
    directory.writeUInt32LE(data.length, entryOffset + 8);  // Data size
    directory.writeUInt32LE(dataOffset, entryOffset + 12); // Data offset
    dataOffset += data.length;
  }

  // Combine all into ICO
  const ico = Buffer.concat([header, directory, ...icoPngs.map(p => p.data)]);
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), ico);
  console.log('Created build/icon.ico');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
