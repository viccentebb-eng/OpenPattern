import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPalette, nearestColorIndex, pixelsToPatternData } from '../src/image/image-to-grid.mjs';

test('nearestColorIndex selects nearest RGB entry', () => {
  assert.equal(nearestColorIndex([250, 10, 10], [[255,0,0], [0,0,255]]), 0);
});

test('pixelsToPatternData returns one cell per pixel', () => {
  const rgba = new Uint8ClampedArray([255,0,0,255, 0,0,255,255]);
  const result = pixelsToPatternData({ rgba, width: 2, height: 1, maxColors: 2 });
  assert.equal(result.cells.length, 2);
  assert.ok(result.palette.length >= 2);
});

test('palette keeps distinctive colors when neutral background dominates', () => {
  const pixels = [];

  const add = (count, r, g, b) => {
    for (let i = 0; i < count; i += 1) pixels.push(r, g, b, 255);
  };

  add(500, 250, 250, 250);
  add(260, 224, 224, 224);
  add(180, 190, 190, 190);
  add(80, 10, 10, 10);
  add(45, 242, 25, 65);
  add(35, 20, 165, 75);

  const palette = extractPalette(new Uint8ClampedArray(pixels), 6);

  assert.ok(palette.some(([r, g, b]) => r > 180 && g < 100 && b < 120), 'red should survive quantization');
  assert.ok(palette.some(([r, g, b]) => g > 110 && r < 100 && b < 130), 'green should survive quantization');
});
