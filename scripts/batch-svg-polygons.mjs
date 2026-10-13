const styleKey = (polygon) => `${polygon.fill}|${polygon.stroke}|${polygon.strokeWidth}`;

// Reordena somente faces sem sobreposição. Toda sobreposição preserva a ordem
// do algoritmo do pintor, permitindo unir mais faces da mesma cor em um path.
export function batchSvgPolygons(polygons) {
  const cells = new Map();
  const bounds = polygons.map(({ pts }) => ({
    left: Math.min(...pts.map((p) => p[0])), right: Math.max(...pts.map((p) => p[0])),
    top: Math.min(...pts.map((p) => p[1])), bottom: Math.max(...pts.map((p) => p[1])),
  }));
  const dependents = polygons.map(() => []);
  const pending = new Uint32Array(polygons.length);
  const ready = new Map();
  const enqueue = (index) => {
    const key = styleKey(polygons[index]);
    if (!ready.has(key)) ready.set(key, new Set());
    ready.get(key).add(index);
  };
  for (let index = 0; index < polygons.length; index++) {
    const box = bounds[index];
    const occupied = [];
    const neighbors = new Set();
    // Margem cobre o arredondamento de coordenadas, antialiasing e strokes.
    for (let x = Math.floor((box.left - 2) / 32); x <= Math.floor((box.right + 2) / 32); x++) {
      for (let y = Math.floor((box.top - 2) / 32); y <= Math.floor((box.bottom + 2) / 32); y++) {
        const key = `${x},${y}`;
        if (!cells.has(key)) cells.set(key, []);
        const cell = cells.get(key);
        for (const other of cell) neighbors.add(other);
        occupied.push(cell);
      }
    }
    for (const other of neighbors) {
      const previous = bounds[other];
      if (box.left <= previous.right + 4 && box.right + 4 >= previous.left &&
          box.top <= previous.bottom + 4 && box.bottom + 4 >= previous.top) {
        pending[index]++;
        dependents[other].push(index);
      }
    }
    for (const cell of occupied) cell.push(index);
    if (pending[index] === 0) enqueue(index);
  }
  const result = [];
  let preferredStyle;
  while (ready.size) {
    const key = ready.has(preferredStyle) ? preferredStyle : ready.keys().next().value;
    const bucket = ready.get(key);
    const index = bucket.values().next().value;
    bucket.delete(index);
    if (bucket.size === 0) ready.delete(key);
    result.push(polygons[index]);
    preferredStyle = key;
    for (const next of dependents[index]) {
      if (--pending[next] === 0) enqueue(next);
    }
  }
  return result;
}
