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
    palette: palette.map((rgb, i) => ({ id: `c${i}`, name: rgbName(rgb), rgb })),
    cells
  };
}

export function extractPalette(rgba, maxColors = 8) {
  const limit = Math.max(2, Math.min(64, Math.round(maxColors)));
  const histogram = buildHistogram(rgba);

  if (!histogram.length) return [[255, 255, 255], [0, 0, 0]];

  if (histogram.length <= limit) {
    return histogram
      .sort((a, b) => b.count - a.count)
      .map(({ rgb }) => rgb);
  }

  // Start with the dominant color (usually the background), then choose colors
  // that add actual visual diversity. This avoids spending an 8-color palette
  // on eight nearly-identical grays from JPEG antialiasing or grid lines.
  const seeds = [histogram.reduce((best, item) => item.count > best.count ? item : best)];
  const chosen = new Set([seeds[0].key]);

  while (seeds.length < limit) {
    let best = null;
    let bestScore = -1;

    for (const candidate of histogram) {
      if (chosen.has(candidate.key)) continue;

      let minDistance = Infinity;
      for (const seed of seeds) {
        minDistance = Math.min(minDistance, colorDistanceSq(candidate.rgb, seed.rgb));
      }

      const saturation = colorSaturation(candidate.rgb);
      const populationWeight = Math.sqrt(candidate.count);
      const score = minDistance * populationWeight * (1 + saturation * 1.75);

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (!best) break;
    seeds.push(best);
    chosen.add(best.key);
  }

  let centers = seeds.map(({ rgb }) => [...rgb]);

  // A few weighted k-means passes pull the diversity-aware seeds toward the
  // real colors in the image without letting huge neutral backgrounds dominate.
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const groups = centers.map(() => ({ count: 0, r: 0, g: 0, b: 0 }));

    for (const item of histogram) {
      const index = nearestColorIndex(item.rgb, centers);
      const group = groups[index];
      group.count += item.count;
      group.r += item.rgb[0] * item.count;
      group.g += item.rgb[1] * item.count;
      group.b += item.rgb[2] * item.count;
    }

    centers = centers.map((center, index) => {
      const group = groups[index];
      if (!group.count) return center;
      return [
        Math.round(group.r / group.count),
        Math.round(group.g / group.count),
        Math.round(group.b / group.count)
      ];
    });
  }

  const weights = centers.map(() => 0);
  for (const item of histogram) {
    weights[nearestColorIndex(item.rgb, centers)] += item.count;
  }

  return centers
    .map((rgb, index) => ({ rgb, weight: weights[index] }))
    .sort((a, b) => b.weight - a.weight)
    .map(({ rgb }) => rgb);
}

export function nearestColorIndex(rgb, palette) {
  let best = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < palette.length; i += 1) {
    const distance = colorDistanceSq(rgb, palette[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }

  return best;
}

function buildHistogram(rgba) {
  const buckets = new Map();

  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 16) continue;

    const qr = rgba[i] >> 3;
    const qg = rgba[i + 1] >> 3;
    const qb = rgba[i + 2] >> 3;
    const key = (qr << 10) | (qg << 5) | qb;
    const current = buckets.get(key) ?? { key, count: 0, r: 0, g: 0, b: 0 };

    current.count += 1;
    current.r += rgba[i];
    current.g += rgba[i + 1];
    current.b += rgba[i + 2];
    buckets.set(key, current);
  }

  return [...buckets.values()].map(({ key, count, r, g, b }) => ({
    key,
    count,
    rgb: [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
  }));
}

function colorDistanceSq(a, b) {
  const rMean = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];

  return (2 + rMean / 256) * dr * dr
    + 4 * dg * dg
    + (2 + (255 - rMean) / 256) * db * db;
}

function colorSaturation([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function rgbName([r, g, b]) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function toHex(value) {
  return value.toString(16).padStart(2, '0');
}
