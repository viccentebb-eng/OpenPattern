const CROSS_STITCH_SYMBOLS = ['●','×','+','■','▲','◆','○','✦','♢','⊙','▴','◩','✚','◇','□','△','✕','✳','◒','◐','⬟','✤','◉','▽'];

export function drawTechniqueCell(ctx, techniqueId, rect, rgb, paletteIndex) {
  switch (techniqueId) {
    case 'cross-stitch':
      drawCrossStitch(ctx, rect, rgb, paletteIndex);
      break;
    case 'bead-loom':
      drawBead(ctx, rect, rgb);
      break;
    case 'knitting-colorwork':
      drawKnitting(ctx, rect, rgb);
      break;
    case 'c2c-crochet':
      drawC2C(ctx, rect, rgb);
      break;
    default:
      drawSolid(ctx, rect, rgb);
  }
}

export function techniqueLegendMeta(techniqueId, paletteIndex) {
  switch (techniqueId) {
    case 'cross-stitch':
      return {
        symbol: CROSS_STITCH_SYMBOLS[paletteIndex % CROSS_STITCH_SYMBOLS.length],
        unit: 'puntadas',
        catalog: 'DMC/Anchor: pendiente'
      };
    case 'bead-loom':
      return {
        symbol: '●',
        unit: 'cuentas',
        catalog: 'Miyuki/TOHO: pendiente'
      };
    case 'knitting-colorwork':
      return {
        symbol: '∨',
        unit: 'puntos',
        catalog: 'hilo: pendiente'
      };
    case 'c2c-crochet':
      return {
        symbol: '◩',
        unit: 'bloques',
        catalog: 'hilo: pendiente'
      };
    default:
      return {
        symbol: '■',
        unit: 'puntos',
        catalog: 'hilo: pendiente'
      };
  }
}

function drawSolid(ctx, { x, y, width, height }, rgb) {
  ctx.fillStyle = css(rgb);
  ctx.fillRect(x, y, Math.ceil(width), Math.ceil(height));
}

function drawC2C(ctx, rect, rgb) {
  drawSolid(ctx, rect, rgb);
  if (rect.width < 12 || rect.height < 12) return;

  ctx.strokeStyle = contrastColor(rgb, .28);
  ctx.lineWidth = Math.max(1, rect.width * .05);
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width * .2, rect.y + rect.height * .8);
  ctx.lineTo(rect.x + rect.width * .8, rect.y + rect.height * .2);
  ctx.stroke();
}

function drawCrossStitch(ctx, rect, rgb, paletteIndex) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(rect.x, rect.y, Math.ceil(rect.width), Math.ceil(rect.height));

  const pad = Math.max(1.5, rect.width * .16);
  ctx.strokeStyle = css(rgb);
  ctx.lineWidth = Math.max(1.5, rect.width * .13);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rect.x + pad, rect.y + pad);
  ctx.lineTo(rect.x + rect.width - pad, rect.y + rect.height - pad);
  ctx.moveTo(rect.x + rect.width - pad, rect.y + pad);
  ctx.lineTo(rect.x + pad, rect.y + rect.height - pad);
  ctx.stroke();
  ctx.lineCap = 'butt';

  if (rect.width >= 24) {
    ctx.fillStyle = contrastText(rgb);
    ctx.font = `600 ${Math.max(8, Math.floor(rect.width * .34))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      CROSS_STITCH_SYMBOLS[paletteIndex % CROSS_STITCH_SYMBOLS.length],
      rect.x + rect.width / 2,
      rect.y + rect.height / 2
    );
  }
}

function drawBead(ctx, rect, rgb) {
  const gap = Math.max(.7, Math.min(rect.width, rect.height) * .08);
  const x = rect.x + gap;
  const y = rect.y + gap;
  const width = Math.max(1, rect.width - gap * 2);
  const height = Math.max(1, rect.height - gap * 2);
  const radius = Math.min(width, height) * .42;

  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = css(rgb);
  ctx.fill();

  if (width >= 14) {
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    roundedRect(ctx, x + width * .12, y + height * .12, width * .2, height * .55, radius * .5);
    ctx.fill();

    ctx.fillStyle = contrastColor(rgb, .35);
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, Math.max(1, width * .07), Math.max(1, height * .18), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawKnitting(ctx, rect, rgb) {
  drawSolid(ctx, rect, rgb);
  if (rect.width < 13) return;

  ctx.strokeStyle = contrastColor(rgb, .4);
  ctx.lineWidth = Math.max(1, rect.width * .07);
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width * .27, rect.y + rect.height * .3);
  ctx.lineTo(rect.x + rect.width * .5, rect.y + rect.height * .75);
  ctx.lineTo(rect.x + rect.width * .73, rect.y + rect.height * .3);
  ctx.stroke();
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function css(rgb) {
  return `rgb(${rgb.join(',')})`;
}

function luminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastText(rgb) {
  return luminance(rgb) > 145 ? '#111' : '#fff';
}

function contrastColor(rgb, alpha) {
  return luminance(rgb) > 145 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
}
