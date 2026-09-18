import test from 'node:test';
import assert from 'node:assert/strict';
import { activePeyoteColumns, buildBeadLayout } from '../src/geometry/bead-layout.mjs';

test('even-count flat peyote alternates active columns', () => {
  assert.deepEqual(activePeyoteColumns(6,0), [1,3,5]);
  assert.deepEqual(activePeyoteColumns(6,1), [0,2,4]);
});

test('odd-count flat peyote gives first row the higher bead count', () => {
  assert.deepEqual(activePeyoteColumns(5,0), [0,2,4]);
  assert.deepEqual(activePeyoteColumns(5,1), [1,3]);
});

test('peyote star creates requested arms and thread edges', () => {
  const layout = buildBeadLayout('peyote-star', null, { arms:5, levels:8, baseWidth:7 });
  assert.equal(layout.kind, 'peyote-star');
  assert.ok(layout.nodes.length > 5 * 8);
  assert.ok(layout.edges.length > layout.nodes.length / 2);
  assert.equal(new Set(layout.nodes.map(n => n.arm)).size, 5);
});

test('rosette creates concentric rings with mixed bead shapes', () => {
  const layout = buildBeadLayout('bead-rosette', null, { rings:4, baseCount:6 });
  assert.equal(layout.nodes.length, 1 + 6 + 12 + 18 + 24);
  assert.ok(layout.nodes.some(n => n.shape === 'teardrop'));
  assert.ok(layout.nodes.some(n => n.shape === 'leaf'));
  assert.ok(layout.edges.some(e => e.kind === 'radial'));
});

test('flat peyote maps grid colors while preserving zig-zag thread order', () => {
  const pattern = {
    grid: { width:4, height:2, cells:[0,1,2,3, 4,5,6,7] }
  };
  const layout = buildBeadLayout('peyote-flat', pattern);

  // Node order follows the working thread direction, so row 2 is reversed.
  assert.deepEqual(layout.nodes.map(n => n.defaultColorIndex), [1,3,6,4]);

  // Coordinate mapping still points back to the correct source cells.
  const bySource = [...layout.nodes].sort((a,b) => a.sourceIndex - b.sourceIndex);
  assert.deepEqual(bySource.map(n => [n.sourceIndex,n.defaultColorIndex]), [[1,1],[3,3],[4,4],[6,6]]);
});
