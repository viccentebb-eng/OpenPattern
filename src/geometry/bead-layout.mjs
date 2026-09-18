// Bead geometry layouts for techniques that are not rectangular grids.
//
// Flat peyote row staggering is adapted from the Apache-2.0 project
// gilesknap/peyote-pattern (2026). Star and rosette layouts are original
// OpenPattern geometry built on the same explicit-node model.

export function isGeometryTechnique(id) {
  return id === 'peyote-flat' || id === 'peyote-star' || id === 'bead-rosette';
}

export function buildBeadLayout(techniqueId, pattern, params = {}) {
  switch (techniqueId) {
    case 'peyote-flat':
      return buildFlatPeyote(pattern, params);
    case 'peyote-star':
      return buildPeyoteStar(params);
    case 'bead-rosette':
      return buildRosette(params);
    default:
      return { nodes: [], edges: [], bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, kind: techniqueId };
  }
}

export function activePeyoteColumns(columns, rowIndex) {
  const oddRow = (rowIndex + 1) % 2 === 1;
  const oddStart = columns % 2 === 1 ? 0 : 1;
  const evenStart = columns % 2 === 1 ? 1 : 0;
  const start = oddRow ? oddStart : evenStart;
  const out = [];
  for (let col = start; col < columns; col += 2) out.push(col);
  return out;
}

function buildFlatPeyote(pattern, params) {
  const columns = Math.max(1, pattern?.grid?.width ?? 10);
  const rows = Math.max(1, pattern?.grid?.height ?? 12);
  const beadW = finite(params.beadWidth, 1.55);
  const beadH = finite(params.beadHeight, 0.92);
  const slotX = beadW * 0.63;
  const stepY = beadH * 0.52;
  const nodes = [];
  const edges = [];
  let previousNode = null;

  for (let row = 0; row < rows; row += 1) {
    const cols = activePeyoteColumns(columns, row);
    const traversal = row % 2 === 0 ? cols : [...cols].reverse();

    for (const col of traversal) {
      const index = nodes.length;
      const sourceIndex = row * columns + col;
      const node = {
        id: `r${row}-c${col}`,
        index,
        x: col * slotX,
        y: row * stepY,
        rotation: 0,
        shape: 'cylinder',
        row,
        col,
        sourceIndex,
        defaultColorIndex: pattern?.grid?.cells?.[sourceIndex] ?? 0,
        sequence: index + 1
      };
      nodes.push(node);
      if (previousNode) edges.push({ from: previousNode.index, to: node.index, kind: 'thread' });
      previousNode = node;
    }
  }

  return layoutResult('peyote-flat', nodes, edges, { rowCount: rows, columns });
}

function buildPeyoteStar(params) {
  const arms = clampInt(params.arms, 3, 12, 5);
  const levels = clampInt(params.levels, 4, 32, 13);
  const baseWidth = clampInt(params.baseWidth, 3, 18, 9);
  const innerRadius = finite(params.innerRadius, 1.8);
  const armLength = finite(params.armLength, Math.max(7, levels * 0.85));
  const spacing = finite(params.spacing, 0.9);
  const nodes = [];
  const edges = [];
  let sequence = 1;

  for (let arm = 0; arm < arms; arm += 1) {
    const angle = -Math.PI / 2 + arm * (Math.PI * 2 / arms);
    const radialX = Math.cos(angle);
    const radialY = Math.sin(angle);
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);
    let previousRow = [];

    for (let level = 0; level < levels; level += 1) {
      const t = level / Math.max(1, levels - 1);
      let count = Math.max(1, Math.round(baseWidth * (1 - t) + 1));
      if (count > 1 && count % 2 === 0) count += 1;
      const radius = innerRadius + t * armLength;
      const row = [];

      for (let j = 0; j < count; j += 1) {
        const offset = (j - (count - 1) / 2) * spacing;
        const index = nodes.length;
        const border = j === 0 || j === count - 1 || level === levels - 1;
        const node = {
          id: `a${arm}-l${level}-b${j}`,
          index,
          x: radialX * radius + tangentX * offset,
          y: radialY * radius + tangentY * offset,
          rotation: angle + Math.PI / 2,
          shape: 'cylinder',
          arm,
          level,
          slot: j,
          sequence: sequence++,
          defaultColorIndex: border ? 1 : ((level + arm) % 7 === 0 ? 2 : 0)
        };
        nodes.push(node);
        row.push(node);
      }

      if (previousRow.length) {
        const direction = level % 2 === 0 ? row : [...row].reverse();
        const prevEnd = previousRow[previousRow.length - 1];
        if (direction.length) edges.push({ from: prevEnd.index, to: direction[0].index, kind: 'thread' });
      }

      const traversal = level % 2 === 0 ? row : [...row].reverse();
      for (let i = 1; i < traversal.length; i += 1) {
        edges.push({ from: traversal[i - 1].index, to: traversal[i].index, kind: 'thread' });
      }
      previousRow = traversal;
    }
  }

  // Link the innermost row of adjacent arms so the star reads as one object.
  const roots = [];
  for (let arm = 0; arm < arms; arm += 1) {
    const root = nodes.find(n => n.arm === arm && n.level === 0 && n.slot === Math.floor(baseWidth / 2));
    if (root) roots.push(root);
  }
  for (let i = 0; i < roots.length; i += 1) {
    edges.push({ from: roots[i].index, to: roots[(i + 1) % roots.length].index, kind: 'join' });
  }

  return layoutResult('peyote-star', nodes, edges, { arms, levels, baseWidth });
}

function buildRosette(params) {
  const rings = clampInt(params.rings, 2, 10, 5);
  const baseCount = clampInt(params.baseCount, 4, 16, 6);
  const ringGap = finite(params.ringGap, 1.85);
  const nodes = [{
    id: 'center',
    index: 0,
    x: 0,
    y: 0,
    rotation: 0,
    shape: 'round',
    ring: 0,
    position: 0,
    sequence: 1,
    defaultColorIndex: 0
  }];
  const edges = [];
  let sequence = 2;
  const ringNodes = [[nodes[0]]];

  for (let ring = 1; ring <= rings; ring += 1) {
    const count = baseCount * ring;
    const radius = ringGap * ring;
    const phase = ring % 2 ? -Math.PI / 2 : -Math.PI / 2 + Math.PI / count;
    const current = [];

    for (let i = 0; i < count; i += 1) {
      const angle = phase + i * (Math.PI * 2 / count);
      const index = nodes.length;
      const shape = ring === rings
        ? (i % 3 === 0 ? 'teardrop' : 'round')
        : (ring % 2 === 0 && i % 2 === 1 ? 'leaf' : 'round');
      const node = {
        id: `ring${ring}-${i}`,
        index,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        rotation: angle,
        shape,
        ring,
        position: i,
        sequence: sequence++,
        defaultColorIndex: ring % 3
      };
      nodes.push(node);
      current.push(node);
    }

    for (let i = 0; i < current.length; i += 1) {
      edges.push({ from: current[i].index, to: current[(i + 1) % current.length].index, kind: 'ring' });
    }

    const previous = ringNodes[ring - 1];
    if (ring === 1) {
      for (const node of current) edges.push({ from: 0, to: node.index, kind: 'radial' });
    } else {
      for (let i = 0; i < current.length; i += 1) {
        const parent = previous[Math.round(i * previous.length / current.length) % previous.length];
        edges.push({ from: parent.index, to: current[i].index, kind: 'radial' });
      }
    }

    ringNodes.push(current);
  }

  return layoutResult('bead-rosette', nodes, edges, { rings, baseCount });
}

function layoutResult(kind, nodes, edges, meta = {}) {
  const bounds = boundsFor(nodes);
  return { kind, nodes, edges, bounds, meta };
}

function boundsFor(nodes) {
  if (!nodes.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x - 0.8);
    maxX = Math.max(maxX, node.x + 0.8);
    minY = Math.min(minY, node.y - 0.8);
    maxY = Math.max(maxY, node.y + 0.8);
  }
  return { minX, minY, maxX, maxY };
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function finite(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
