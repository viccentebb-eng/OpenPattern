import test from 'node:test';
import assert from 'node:assert/strict';
import { createGrid, setCell, getCell, mirrorHorizontal, floodFill } from '../src/core/grid.mjs';

test('grid stores cells by coordinates', () => {
  const grid = createGrid(3, 2, 0);
  setCell(grid, 2, 1, 7);
  assert.equal(getCell(grid, 2, 1), 7);
});

test('horizontal mirror reverses each row', () => {
  const grid = createGrid(3, 2);
  grid.cells = [1, 2, 3, 4, 5, 6];
  mirrorHorizontal(grid);
  assert.deepEqual(grid.cells, [3, 2, 1, 6, 5, 4]);
});

test('flood fill changes a connected region only', () => {
  const grid = createGrid(3, 3, 0);
  grid.cells = [0,0,1, 0,1,1, 0,0,1];
  floodFill(grid, 0, 0, 2);
  assert.deepEqual(grid.cells, [2,2,1, 2,1,1, 2,2,1]);
});
