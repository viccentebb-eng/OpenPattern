// Bead crochet rope geometry.
//
// The corrected/simulation transforms are independent JavaScript adaptations
// of the BSD-2-Clause cl-beads scheme models, which are compatible with the
// JBead workflow. See THIRD_PARTY.md.

export function buildBeadCrochetRope(pattern, params = {}) {
  const grid = pattern?.grid ?? { width: 15, height: 1, cells: Array(15).fill(0) };
  const circumference = clampInt(params.circumference, 3, 64, grid.width || 15);
  const view = params.view ?? 'draft';
  const rotation = modulo(clampInt(params.rotation, -100000, 100000, 0), circumference);

  if (view === 'corrected') return buildCorrected(grid, circumference, rotation);
  if (view === 'rope') return buildFinishedRope(grid, circumference, rotation);
  return buildDraft(grid, circumference, rotation);
}

export function detectLinearRepeat(grid) {
  const cells = Array.isArray(grid?.cells) ? grid.cells : [];
  if (!cells.length) return 0;

  let used = cells.length;
  while (used > 0 && cells[used - 1] === 0) used -= 1;
  if (used === 0) return 0;

  for (let period = 1; period <= used; period += 1) {
    let ok = true;
    for (let i = period; i < used; i += 1) {
      if (cells[i] !== cells[i % period]) {
        ok = false;
        break;
      }
    }
    if (ok) return period;
  }
  return used;
}

export function beadRunsForRepeat(grid, repeat = detectLinearRepeat(grid)) {
  if (!repeat) return [];
  const cells = grid.cells.slice(0, repeat);
  const runs = [];
  for (const colorIndex of cells) {
    const last = runs[runs.length - 1];
    if (last && last.colorIndex === colorIndex) last.count += 1;
    else runs.push({ colorIndex, count: 1 });
  }
  return runs;
}

function buildDraft(grid, circumference, rotation) {
  const total = grid.cells.length;
  const rows = Math.ceil(total / circumference);
  const nodes = [];
  const edges = [];

  for (let index = 0; index < total; index += 1) {
    const logical = modulo(index + rotation, total);
    const row = Math.floor(index / circumference);
    const col = index % circumference;
    nodes.push({
      id: `draft-${index}`,
      index,
      sourceIndex: logical,
      x: col,
      y: row,
      rotation: 0,
      shape: 'cylinder',
      row,
      col,
      sequence: index + 1,
      defaultColorIndex: grid.cells[logical] ?? 0
    });
    if (index > 0) edges.push({ from: index - 1, to: index, kind: 'thread' });
  }

  return result('bead-crochet-rope', nodes, edges, {
    view: 'draft',
    circumference,
    rows,
    repeat: detectLinearRepeat(grid)
  });
}

function buildCorrected(grid, circumference, rotation) {
  const total = grid.cells.length;
  const nodes = [];
  const edges = [];
  const cycle = 1 + 2 * circumference;

  for (let sequenceIndex = 0; sequenceIndex < total; sequenceIndex += 1) {
    const sourceIndex = modulo(sequenceIndex + rotation, total);
    const q = Math.floor(sequenceIndex / cycle);
    const r = sequenceIndex % cycle;

    let x;
    let y;
    if (r < circumference) {
      // Short row, shifted half a bead.
      x = r + 0.5;
      y = q * 2;
    } else {
      // Long row.
      x = r - circumference;
      y = q * 2 + 1;
    }

    const node = {
      id: `corrected-${sequenceIndex}`,
      index: nodes.length,
      sourceIndex,
      x,
      y,
      rotation: 0,
      shape: 'cylinder',
      sequence: sequenceIndex + 1,
      defaultColorIndex: grid.cells[sourceIndex] ?? 0
    };
    nodes.push(node);
    if (nodes.length > 1) edges.push({ from: nodes[nodes.length - 2].index, to: node.index, kind: 'thread' });
  }

  return result('bead-crochet-rope', nodes, edges, {
    view: 'corrected',
    circumference,
    repeat: detectLinearRepeat(grid)
  });
}

function buildFinishedRope(grid, circumference, rotation) {
  const total = grid.cells.length;
  const nodes = [];
  const edges = [];
  const radius = Math.max(1.6, circumference / (Math.PI * 2));
  const pitch = 0.74;

  for (let index = 0; index < total; index += 1) {
    const sourceIndex = modulo(index + rotation, total);
    const round = Math.floor(index / circumference);
    const beadInRound = index % circumference;
    const angle = (beadInRound / circumference) * Math.PI * 2 - Math.PI / 2
      + (round % 2) * (Math.PI / circumference);

    const depth = Math.cos(angle);
    const x = Math.sin(angle) * radius;
    const y = round * pitch + Math.sin(angle) * 0.08;

    const node = {
      id: `rope-${index}`,
      index,
      sourceIndex,
      x,
      y,
      depth,
      rotation: angle * 0.18,
      shape: 'round',
      round,
      beadInRound,
      sequence: index + 1,
      defaultColorIndex: grid.cells[sourceIndex] ?? 0
    };
    nodes.push(node);
    if (index > 0) edges.push({ from: index - 1, to: index, kind: 'thread' });
  }

  return result('bead-crochet-rope', nodes, edges, {
    view: 'rope',
    circumference,
    rounds: Math.ceil(total / circumference),
    repeat: detectLinearRepeat(grid)
  });
}

function result(kind, nodes, edges, meta) {
  return { kind, nodes, edges, bounds: boundsFor(nodes), meta };
}

function boundsFor(nodes) {
  if (!nodes.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x - 0.7);
    maxX = Math.max(maxX, node.x + 0.7);
    minY = Math.min(minY, node.y - 0.7);
    maxY = Math.max(maxY, node.y + 0.7);
  }
  return { minX, minY, maxX, maxY };
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function modulo(value, divisor) {
  if (!divisor) return 0;
  return ((value % divisor) + divisor) % divisor;
}
