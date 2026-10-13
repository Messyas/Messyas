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
  const tx = Math.cos(phase) * 0.35, ty = Math.sin(phase) * 0.35;
  const px = x * 2.2, py = y * 4;
  const qx = snoise(px + tx, py + ty), qy = snoise(px + 5.2 + tx, py + 1.3 + ty);
  const rx = snoise(px + 0.45 * qx + 1.7 - ty, py + 0.45 * qy + 9.2 + tx);
  const ry = snoise(px + 0.45 * qx + 8.3 - ty, py + 0.45 * qy + 2.8 + tx);
  return snoise(px + 0.35 * rx, py + 0.35 * ry) * 0.2 + py * 0.8;
}
export function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
