export function applyImageAdjustments(rgba, options = {}) {
  if (!(rgba instanceof Uint8ClampedArray)) {
    throw new TypeError('rgba must be a Uint8ClampedArray.');
  }

  const brightness = clamp(Number(options.brightness ?? 0), -100, 100) * 2.55;
  const contrastValue = clamp(Number(options.contrast ?? 0), -100, 100) * 2.55;
  const saturation = 1 + clamp(Number(options.saturation ?? 0), -100, 100) / 100;
  const removeLightGrid = Boolean(options.removeLightGrid);
  const lightThreshold = clamp(Number(options.lightThreshold ?? 215), 120, 255);
  const neutralTolerance = clamp(Number(options.neutralTolerance ?? 20), 0, 80);
  const contrast = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));

  const out = new Uint8ClampedArray(rgba);

  for (let i = 0; i < out.length; i += 4) {
    let r = out[i];
    let g = out[i + 1];
    let b = out[i + 2];

    r = contrast * (r - 128) + 128 + brightness;
    g = contrast * (g - 128) + 128 + brightness;
    b = contrast * (b - 128) + 128 + brightness;

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = luminance + (r - luminance) * saturation;
    g = luminance + (g - luminance) * saturation;
    b = luminance + (b - luminance) * saturation;

    r = clamp(Math.round(r), 0, 255);
    g = clamp(Math.round(g), 0, 255);
    b = clamp(Math.round(b), 0, 255);

    if (removeLightGrid) {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const average = (r + g + b) / 3;
      if (max - min <= neutralTolerance && average >= lightThreshold) {
        r = 255;
        g = 255;
        b = 255;
      }
    }

    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
  }

  return out;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
