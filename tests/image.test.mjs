import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestColorIndex, pixelsToPatternData } from '../src/image/image-to-grid.mjs';

test('nearestColorIndex selects nearest RGB entry', () => {
  assert.equal(nearestColorIndex([250, 10, 10], [[255,0,0], [0,0,255]]), 0);
});

test('pixelsToPatternData returns one cell per pixel', () => {
  const rgba = new Uint8ClampedArray([255,0,0,255, 0,0,255,255]);
  const result = pixelsToPatternData({ rgba, width: 2, height: 1, maxColors: 2 });
  assert.equal(result.cells.length, 2);
  assert.ok(result.palette.length >= 2);
});
