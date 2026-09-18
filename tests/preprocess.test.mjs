import test from 'node:test';
import assert from 'node:assert/strict';
import { applyImageAdjustments } from '../src/image/preprocess.mjs';

test('light neutral grid cleanup turns light gray into white', () => {
  const input = new Uint8ClampedArray([220, 221, 219, 255]);
  const output = applyImageAdjustments(input, {
    removeLightGrid: true,
    lightThreshold: 210,
    neutralTolerance: 10
  });

  assert.deepEqual([...output], [255, 255, 255, 255]);
});

test('grid cleanup keeps saturated colors', () => {
  const input = new Uint8ClampedArray([230, 40, 50, 255]);
  const output = applyImageAdjustments(input, {
    removeLightGrid: true,
    lightThreshold: 200,
    neutralTolerance: 20
  });

  assert.ok(output[0] > 200);
  assert.ok(output[1] < 100);
  assert.ok(output[2] < 100);
});

test('positive saturation separates a muted color further from gray', () => {
  const input = new Uint8ClampedArray([150, 120, 120, 255]);
  const output = applyImageAdjustments(input, { saturation: 80 });
  assert.ok(output[0] - output[1] > 30);
});
