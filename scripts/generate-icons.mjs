#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

// Minimal PNG encoder
function createPNG(width, height, pixels) {
  // pixels is a Uint8Array of RGBA values, row by row
  const SIGNATURE = Buffer.from([137,80,78,71,13,10,26,10])

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii')
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const crcData = Buffer.concat([typeBytes, data])
    const crc = crc32(crcData)
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc >>> 0)
    return Buffer.concat([len, typeBytes, data, crcBuf])
  }

  function crc32(buf) {
    let crc = 0xFFFFFFFF
    const table = makeCrcTable()
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
    }
    return (crc ^ 0xFFFFFFFF) >>> 0
  }

  let crcTable = null
  function makeCrcTable() {
    if (crcTable) return crcTable
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      }
      crcTable[n] = c
    }
    return crcTable
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // Image data (filter byte 0 before each row, RGB only)
  const rawSize = (1 + width * 3) * height
  const raw = Buffer.alloc(rawSize)
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0 // filter type None
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4
      const ri = y * (1 + width * 3) + 1 + x * 3
      raw[ri] = pixels[pi]
      raw[ri+1] = pixels[pi+1]
      raw[ri+2] = pixels[pi+2]
    }
  }

  const compressed = deflateSync(raw)

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function renderIcon(size, maskable = false) {
  const pixels = new Uint8Array(size * size * 4)
  const padding = maskable ? Math.floor(size * 0.15) : Math.floor(size * 0.08)

  // Background: #1e3a8a (dark blue)
  const bg = [30, 58, 138]
  // Rounded rect background: #1e3a8a with corner radius
  const radius = Math.floor(size * (maskable ? 0.0 : 0.22))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // Corner rounding
      const inCorner = (
        (x < radius && y < radius && Math.hypot(x - radius, y - radius) > radius) ||
        (x >= size - radius && y < radius && Math.hypot(x - (size - radius), y - radius) > radius) ||
        (x < radius && y >= size - radius && Math.hypot(x - radius, y - (size - radius)) > radius) ||
        (x >= size - radius && y >= size - radius && Math.hypot(x - (size - radius), y - (size - radius)) > radius)
      )
      if (inCorner) {
        pixels[i] = 8; pixels[i+1] = 11; pixels[i+2] = 18; pixels[i+3] = 255
      } else {
        pixels[i] = bg[0]; pixels[i+1] = bg[1]; pixels[i+2] = bg[2]; pixels[i+3] = 255
      }
    }
  }

  // Draw "HF" text using pixel art approach
  // Scale font size to icon size
  const fontSize = Math.floor((size - padding * 2) * 0.55)
  drawText(pixels, size, 'HF', padding, fontSize, [255, 255, 255])

  return pixels
}

function drawText(pixels, size, text, padding, fontSize, color) {
  // Simple block letter renderer for "HF"
  // Each letter is defined as a 5x7 pixel grid
  const H = [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ]
  const F = [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
  ]

  const letters = [H, F]
  const cols = 5
  const rows = 7
  const gap = Math.max(1, Math.floor(fontSize * 0.15))
  const totalWidth = letters.length * fontSize + (letters.length - 1) * gap
  const startX = Math.floor((size - totalWidth) / 2)
  const startY = Math.floor((size - Math.floor(fontSize * rows/cols)) / 2)

  letters.forEach((letter, li) => {
    const lx = startX + li * (fontSize + gap)
    const cellW = Math.floor(fontSize / cols)
    const cellH = Math.floor(fontSize * rows / cols / rows)

    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        if (!letter[ry][rx]) continue
        const px = lx + rx * cellW
        const py = startY + ry * cellH
        for (let dy = 0; dy < cellH; dy++) {
          for (let dx = 0; dx < cellW; dx++) {
            const nx = px + dx
            const ny = py + dy
            if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue
            const i = (ny * size + nx) * 4
            pixels[i] = color[0]; pixels[i+1] = color[1]; pixels[i+2] = color[2]; pixels[i+3] = 255
          }
        }
      }
    }
  })
}

mkdirSync('public/icons', { recursive: true })

const sizes = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
]

for (const { name, size, maskable } of sizes) {
  const pixels = renderIcon(size, maskable)
  const png = createPNG(size, size, pixels)
  writeFileSync(`public/icons/${name}`, png)
  console.log(`Generated public/icons/${name}`)
}
console.log('Icons generated successfully!')
