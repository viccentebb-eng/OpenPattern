import test from 'node:test';
import assert from 'node:assert/strict';
import { createGrid, floodFill, getCell, mirrorHorizontal, setCell } from '../src/core/grid.mjs';

test('grid reads and writes cells', () => {
  const grid = createGrid(3, 2, 0);
  setCell(grid, 1, 1, 4);
  assert.equal(getCell(grid, 1, 1), 4);
});

test('mirrorHorizontal mirrors each row', () => {
  const grid = createGrid(3, 1, 0);
  grid.cells = [1, 2, 3];
  mirrorHorizontal(grid);
  assert.deepEqual(grid.cells, [3, 2, 1]);
});

test('floodFill only replaces connected cells', () => {
  const grid = createGrid(3, 3, 0);
  grid.cells = [0,0,1, 0,1,1, 0,0,1];
  floodFill(grid, 0, 0, 2);
  assert.deepEqual(grid.cells, [2,2,1, 2,1,1, 2,2,1]);
});
