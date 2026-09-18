export function pixelsToPatternData({ rgba, width, height, maxColors = 8 }) {
  if (!(rgba instanceof Uint8ClampedArray) || rgba.length !== width * height * 4) {
    throw new TypeError('rgba must be a Uint8ClampedArray matching width*height*4.');
  }
  const palette = extractPalette(rgba, maxColors);
  const cells = new Array(width * height);

  for (let i = 0, cell = 0; i < rgba.length; i += 4, cell += 1) {
    if (rgba[i + 3] < 16) {
      cells[cell] = 0;
      continue;
    }
    cells[cell] = nearestColorIndex([rgba[i], rgba[i + 1], rgba[i + 2]], palette);
  }

  return {
    palette: palette.map((rgb, i) => ({ id: `c${i}`, name: `Color ${i + 1}`, rgb })),
    cells
  };
}

export function extractPalette(rgba, maxColors = 8) {
  const limit = Math.max(2, Math.min(64, Math.round(maxColors)));
  const buckets = new Map();

  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 16) continue;
    const r = rgba[i] >> 3;
    const g = rgba[i + 1] >> 3;
    const b = rgba[i + 2] >> 3;
    const key = (r << 10) | (g << 5) | b;
    const current = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    current.count += 1;
    current.r += rgba[i];
    current.g += rgba[i + 1];
    current.b += rgba[i + 2];
    buckets.set(key, current);
  }

  const colors = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ count, r, g, b }) => [Math.round(r / count), Math.round(g / count), Math.round(b / count)]);

  return colors.length ? colors : [[255, 255, 255], [0, 0, 0]];
}

export function nearestColorIndex(rgb, palette) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < palette.length; i += 1) {
    const dr = rgb[0] - palette[i][0];
    const dg = rgb[1] - palette[i][1];
    const db = rgb[2] - palette[i][2];
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}
