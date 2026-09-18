import test from 'node:test';
import assert from 'node:assert/strict';
import { createPattern, validatePattern } from '../src/core/pattern.mjs';

test('new pattern validates', () => {
  const pattern = createPattern({ techniqueId: 'tapestry-crochet', width: 8, height: 6 });
  assert.deepEqual(validatePattern(pattern), []);
});

test('invalid palette index is detected', () => {
  const pattern = createPattern({ techniqueId: 'bead-loom', width: 2, height: 2 });
  pattern.grid.cells[0] = 999;
  assert.ok(validatePattern(pattern).some((error) => error.includes('palette indexes')));
});
