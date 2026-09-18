import { createGrid } from './grid.mjs';

export const CURRENT_SCHEMA_VERSION = 1;

export function createPattern({ techniqueId, width, height, title = 'Untitled', palette = defaultPalette() }) {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    techniqueId,
    title,
    grid: createGrid(width, height, 0),
    palette,
    metadata: { createdAt: now, updatedAt: now }
  };
}

export function validatePattern(pattern) {
  const errors = [];
  if (!pattern || typeof pattern !== 'object') return ['Pattern must be an object.'];
  if (!Number.isInteger(pattern.schemaVersion)) errors.push('schemaVersion is required.');
  if (typeof pattern.techniqueId !== 'string' || !pattern.techniqueId) errors.push('techniqueId is required.');
  const grid = pattern.grid;
  if (!grid || !Number.isInteger(grid.width) || !Number.isInteger(grid.height)) errors.push('Valid grid dimensions are required.');
  if (!Array.isArray(grid?.cells) || grid.cells.length !== grid.width * grid.height) errors.push('grid.cells length does not match dimensions.');
  if (!Array.isArray(pattern.palette) || pattern.palette.length === 0) errors.push('Palette must contain at least one color.');
  if (Array.isArray(grid?.cells) && Array.isArray(pattern.palette)) {
    const max = pattern.palette.length - 1;
    if (grid.cells.some((value) => !Number.isInteger(value) || value < 0 || value > max)) {
      errors.push('Grid contains palette indexes out of range.');
    }
  }
  return errors;
}

export function touchPattern(pattern) {
  pattern.metadata.updatedAt = new Date().toISOString();
  return pattern;
}

function defaultPalette() {
  return [
    { id: 'c0', name: 'White', rgb: [255, 255, 255] },
    { id: 'c1', name: 'Black', rgb: [0, 0, 0] }
  ];
}
