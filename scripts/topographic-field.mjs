const F2 = (Math.sqrt(3) - 1) / 2;
const G2 = (3 - Math.sqrt(3)) / 6;
const gradients = new Map();
function gradient(x, y) {
  const key = `${x},${y}`;
  if (!gradients.has(key)) {
    const hash = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    const angle = (hash - Math.floor(hash)) * Math.PI * 2;
    gradients.set(key, [Math.cos(angle), Math.sin(angle)]);
  }
  return gradients.get(key);
}
export function snoise(x, y) {
  const skew = (x + y) * F2;
  const ix = Math.floor(x + skew), iy = Math.floor(y + skew);
  const unskew = (ix + iy) * G2;
  const x0 = x - ix + unskew, y0 = y - iy + unskew;
  const dx = x0 > y0 ? 1 : 0, dy = 1 - dx;
  const corner = (gx, gy, px, py) => {
    const weight = Math.max(0, 0.5 - px * px - py * py);
    const g = gradient(gx, gy);
    return weight ** 4 * (g[0] * px + g[1] * py);
  };
  return 70 * (corner(ix, iy, x0, y0) + corner(ix + dx, iy + dy, x0 - dx + G2, y0 - dy + G2)
    + corner(ix + 1, iy + 1, x0 - 1 + 2 * G2, y0 - 1 + 2 * G2));
}
export function contourField(x, y, phase) {
  const tx = Math.cos(phase) * 0.22, ty = Math.sin(phase) * 0.22;
  const px = x * 3, py = y * 3.5;
  const qx = snoise(px + tx, py + ty), qy = snoise(px + 5.2 + tx, py + 1.3 + ty);
  const rx = snoise(px + 0.2 * qx + 1.7 - ty, py + 0.2 * qy + 9.2 + tx);
  const ry = snoise(px + 0.2 * qx + 8.3 - ty, py + 0.2 * qy + 2.8 + tx);
  return snoise(px + 0.2 * rx, py + 0.2 * ry) * 0.8 + py * 0.02;
}
export function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function renderContourFrame(config, phase) {
  const { width, height } = config;
  const pixels = Buffer.alloc(width * height * 4);
  const palette = config.colors.map((hex) => hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16)));
  const background = config.background?.slice(1).match(/../g).map((channel) => parseInt(channel, 16));
  const field = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const stY = (1 - (y + 0.5) / height) * 0.35;
    for (let x = 0; x < width; x++) field[y * width + x] = contourField((x + 0.5) / width, stY, phase);
  }
  for (let y = 0; y < height; y++) {
    const stY = (1 - (y + 0.5) / height) * 0.35;
    const fade = 1 - smoothstep(config.fadeStart, 0.35, stY);
    for (let x = 0; x < width; x++) {
      const stX = (x + 0.5) / width, index = y * width + x;
      // Faixa de antialiasing acompanha a variação local para evitar linhas serrilhadas.
      const dx = Math.abs(field[y * width + Math.min(width - 1, x + 1)] - field[index]);
      const dy = Math.abs(field[Math.min(height - 1, y + 1) * width + x] - field[index]);
      const aa = Math.min(0.35, Math.max(0.06, (dx + dy) * config.contourFrequency * 0.5));
      const band = Math.abs(Math.sin(field[index] * config.contourFrequency));
      const coverage = (1 - smoothstep(0.55 - aa, 0.55 + aa, band)) * fade;
      const levels = config.alphaLevels - 1;
      const alpha = Math.round(coverage * levels) / levels;
      const position = Math.min(1.999, stX * 2), colorIndex = Math.floor(position), mix = position - colorIndex;
      const offset = index * 4;
      for (let channel = 0; channel < 3; channel++) {
        const color = palette[colorIndex][channel] * (1 - mix) + palette[colorIndex + 1][channel] * mix;
        pixels[offset + channel] = Math.round(background ? background[channel] * (1 - alpha) + color * alpha : alpha === 0 ? 0 : color);
      }
      pixels[offset + 3] = background ? 255 : Math.round(alpha * 255);
    }
  }
  return pixels;
}
