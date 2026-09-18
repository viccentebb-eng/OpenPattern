import { getBeadProfile } from './technique-renderers.mjs';

export function projectBeadLayout(layout, width, height, view = { zoom: 1, panX: 0, panY: 0 }, padding = 42) {
  const { minX, minY, maxX, maxY } = layout.bounds;
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const baseScale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const scale = baseScale * (view.zoom ?? 1);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const offsetX = width / 2 + (view.panX ?? 0);
  const offsetY = height / 2 + (view.panY ?? 0);

  return layout.nodes.map(node => ({
    ...node,
    sx: offsetX + (node.x - centerX) * scale,
    sy: offsetY + (node.y - centerY) * scale,
    scale,
    hitRadius: Math.max(5, scale * 0.62)
  }));
}

export function drawBeadLayout(ctx, layout, palette, options = {}, view = { zoom: 1, panX: 0, panY: 0 }) {
  const projected = projectBeadLayout(layout, ctx.canvas.width, ctx.canvas.height, view);
  const byIndex = new Map(projected.map(node => [node.index, node]));

  if (options.geometryShowPath !== false) {
    ctx.save();
    ctx.strokeStyle = options.geometryPathColor || 'rgba(26,52,110,.42)';
    ctx.lineWidth = Math.max(1, Math.min(3, projected[0]?.scale * 0.08 || 1));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const edge of layout.edges) {
      const a = byIndex.get(edge.from);
      const b = byIndex.get(edge.to);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
    ctx.restore();
  }

  const profile = getBeadProfile(options.beadProfile || 'delica11');
  const paintOrder = layout.meta?.view === 'rope'
    ? [...projected].sort((a,b) => (a.depth ?? 0) - (b.depth ?? 0))
    : projected;
  for (const node of paintOrder) {
    const rawColorIndex = resolveColorIndex(node, options);
    const colorIndex = palette.length ? ((rawColorIndex % palette.length) + palette.length) % palette.length : 0;
    const rgb = palette[colorIndex]?.rgb ?? [210, 210, 210];
    drawGeometryBead(ctx, node, rgb, profile, options);
  }

  return projected;
}

export function hitTestBeadLayout(projected, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const node of projected) {
    const dx = x - node.sx;
    const dy = y - node.sy;
    const d = Math.hypot(dx, dy);
    if (d <= node.hitRadius && d < bestDist) {
      best = node;
      bestDist = d;
    }
  }
  return best;
}

function resolveColorIndex(node, options) {
  const colors = options.geometryColors;
  if (Array.isArray(colors) && Number.isInteger(colors[node.index])) return colors[node.index];
  return Number.isInteger(node.defaultColorIndex) ? node.defaultColorIndex : 0;
}

function drawGeometryBead(ctx, node, rgb, profile, options) {
  ctx.save();
  ctx.translate(node.sx, node.sy);
  ctx.rotate(node.rotation || 0);

  const base = Math.max(4, node.scale * 0.9);
  let w = base * 1.12;
  let h = w / Math.max(1, profile.diameterMm / profile.widthMm);
  if (node.shape === 'round') {
    w = h = base * 0.82;
    drawRound(ctx, w, h, rgb, options);
  } else if (node.shape === 'teardrop') {
    w = base * 0.88;
    h = base * 1.08;
    drawTeardrop(ctx, w, h, rgb, options);
  } else if (node.shape === 'leaf') {
    w = base * 0.72;
    h = base * 1.05;
    drawLeaf(ctx, w, h, rgb, options);
  } else {
    drawCylinder(ctx, w, h, rgb, options);
  }

  if (options.geometryShowNumbers && node.scale >= 6) {
    ctx.rotate(-(node.rotation || 0));
    ctx.fillStyle = contrastText(rgb);
    ctx.font = `700 ${Math.max(7, Math.min(14, node.scale * .33))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(node.sequence ?? node.index + 1), 0, 0);
  }

  ctx.restore();
}

function drawCylinder(ctx, w, h, rgb, options) {
  const r = Math.min(h * .28, w * .2);
  roundedRect(ctx, -w/2, -h/2, w, h, r);
  ctx.fillStyle = css(rgb);
  ctx.fill();
  ctx.strokeStyle = shade(rgb, -.34);
  ctx.lineWidth = Math.max(.7, h * .06);
  ctx.stroke();

  if ((options.beadRender ?? 'realistic') === 'realistic') {
    roundedRect(ctx, -w*.41, -h*.39, w*.82, h*.2, r*.4);
    ctx.fillStyle = 'rgba(255,255,255,.24)';
    ctx.fill();
    roundedRect(ctx, -w*.42, h*.24, w*.84, h*.12, r*.3);
    ctx.fillStyle = 'rgba(0,0,0,.10)';
    ctx.fill();
  }

  if (options.beadHoles !== false && w > 10) {
    ctx.fillStyle = 'rgba(20,20,20,.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1,w*.055), Math.max(1,h*.19), 0, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawRound(ctx, w, h, rgb, options) {
  ctx.fillStyle = css(rgb);
  ctx.strokeStyle = shade(rgb,-.32);
  ctx.lineWidth = Math.max(.7,w*.05);
  ctx.beginPath();
  ctx.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();
  if ((options.beadRender ?? 'realistic') === 'realistic') {
    ctx.fillStyle='rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.ellipse(-w*.14,-h*.18,w*.17,h*.12,-.3,0,Math.PI*2);
    ctx.fill();
  }
}

function drawTeardrop(ctx, w, h, rgb) {
  ctx.fillStyle = css(rgb);
  ctx.strokeStyle = shade(rgb,-.34);
  ctx.lineWidth = Math.max(.7,w*.05);
  ctx.beginPath();
  ctx.moveTo(0,-h*.52);
  ctx.bezierCurveTo(w*.5,-h*.15,w*.48,h*.34,0,h*.5);
  ctx.bezierCurveTo(-w*.48,h*.34,-w*.5,-h*.15,0,-h*.52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawLeaf(ctx, w, h, rgb) {
  ctx.fillStyle = css(rgb);
  ctx.strokeStyle = shade(rgb,-.34);
  ctx.lineWidth = Math.max(.7,w*.05);
  ctx.beginPath();
  ctx.moveTo(0,-h*.52);
  ctx.quadraticCurveTo(w*.55,0,0,h*.52);
  ctx.quadraticCurveTo(-w*.55,0,0,-h*.52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function roundedRect(ctx,x,y,w,h,r) {
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

function css([r,g,b]) { return `rgb(${r},${g},${b})`; }
function luminance([r,g,b]) { return .2126*r+.7152*g+.0722*b; }
function contrastText(rgb){ return luminance(rgb)>145?'#111':'#fff'; }
function shade([r,g,b],a){
  const f=1+a;
  return `rgb(${Math.max(0,Math.round(r*f))},${Math.max(0,Math.round(g*f))},${Math.max(0,Math.round(b*f))})`;
}
