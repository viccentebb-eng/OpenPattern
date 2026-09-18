export function createGrid(width, height, fill = 0) {
  assertSize(width, height);
  return { width, height, cells: Array(width * height).fill(fill) };
}

export function indexOf(grid, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    throw new RangeError(`Cell out of bounds: ${x},${y}`);
  }
  return y * grid.width + x;
}

export function getCell(grid, x, y) {
  return grid.cells[indexOf(grid, x, y)];
}

export function setCell(grid, x, y, value) {
  grid.cells[indexOf(grid, x, y)] = value;
  return grid;
}

export function fillRect(grid, x, y, width, height, value) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      if (xx >= 0 && yy >= 0 && xx < grid.width && yy < grid.height) {
        grid.cells[yy * grid.width + xx] = value;
      }
    }
  }
  return grid;
}

export function floodFill(grid, startX, startY, value) {
  const target = getCell(grid, startX, startY);
  if (target === value) return grid;

  const stack = [[startX, startY]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) continue;
    const i = y * grid.width + x;
    if (grid.cells[i] !== target) continue;
    grid.cells[i] = value;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return grid;
}

export function mirrorHorizontal(grid) {
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < Math.floor(grid.width / 2); x += 1) {
      const left = y * grid.width + x;
      const right = y * grid.width + (grid.width - 1 - x);
      [grid.cells[left], grid.cells[right]] = [grid.cells[right], grid.cells[left]];
    }
  }
  return grid;
}

function assertSize(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('Grid dimensions must be positive integers.');
  }
}
