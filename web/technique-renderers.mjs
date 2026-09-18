const CROSS_STITCH_SYMBOLS = ['●','×','+','■','▲','◆','○','✦','♢','⊙','▴','◩','✚','◇','□','△','✕','✳','◒','◐','⬟','✤','◉','▽'];

export const BEAD_PROFILES = {
  delica11: { id:'delica11', label:'Miyuki Delica 11/0', diameterMm:1.6, widthMm:1.23, shape:'cylinder' },
  round11: { id:'round11', label:'Miyuki Round 11/0', diameterMm:2.0, widthMm:1.57, shape:'round' },
  toho11: { id:'toho11', label:'TOHO Round 11/0', diameterMm:2.2, widthMm:1.72, shape:'round' },
  aiko11: { id:'aiko11', label:'TOHO Aiko 11/0', diameterMm:1.8, widthMm:1.38, shape:'cylinder' }
};

export function getBeadProfile(id='delica11') {
  return BEAD_PROFILES[id] ?? BEAD_PROFILES.delica11;
}

export function drawTechniqueCell(ctx, techniqueId, rect, rgb, paletteIndex, options={}) {
  switch (techniqueId) {
    case 'cross-stitch': return drawCrossStitch(ctx, rect, rgb, paletteIndex, options);
    case 'bead-loom': return drawBead(ctx, rect, rgb, paletteIndex, options);
    case 'knitting-colorwork': return drawKnitting(ctx, rect, rgb, options);
    case 'c2c-crochet': return drawC2C(ctx, rect, rgb, options);
    default: return drawSolid(ctx, rect, rgb);
  }
}

export function techniqueLegendMeta(techniqueId, paletteIndex, options={}) {
  switch (techniqueId) {
    case 'cross-stitch':
      return { symbol:CROSS_STITCH_SYMBOLS[paletteIndex % CROSS_STITCH_SYMBOLS.length], unit:'puntadas', catalog:'DMC/Anchor: pendiente' };
    case 'bead-loom':
    case 'peyote-flat':
    case 'peyote-star':
    case 'bead-rosette': {
      const profile = getBeadProfile(options.beadProfile);
      return { symbol:beadSymbol(paletteIndex), unit:'cuentas', catalog:profile.label };
    }
    case 'knitting-colorwork':
      return { symbol:'∨', unit:'puntos', catalog:'hilo: pendiente' };
    case 'c2c-crochet':
      return { symbol:'◩', unit:'bloques', catalog:'hilo: pendiente' };
    default:
      return { symbol:'■', unit:'puntos', catalog:'hilo: pendiente' };
  }
}

export function estimateTechniqueSize(techniqueId, grid, options={}) {
  if (techniqueId !== 'bead-loom') return null;
  const profile = getBeadProfile(options.beadProfile);
  return {
    widthMm: grid.width * profile.diameterMm,
    heightMm: grid.height * profile.widthMm,
    label: profile.label
  };
}

function drawSolid(ctx, {x,y,width,height}, rgb) {
  ctx.fillStyle = css(rgb);
  ctx.fillRect(x, y, Math.ceil(width), Math.ceil(height));
}

function drawC2C(ctx, rect, rgb, options) {
  drawSolid(ctx, rect, rgb);
  if (rect.width < 11 || options.c2cDiagonal === false) return;
  ctx.strokeStyle = contrastColor(rgb, .3);
  ctx.lineWidth = Math.max(1, rect.width * .05);
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width * .18, rect.y + rect.height * .82);
  ctx.lineTo(rect.x + rect.width * .82, rect.y + rect.height * .18);
  ctx.stroke();
}

function drawCrossStitch(ctx, rect, rgb, paletteIndex, options) {
  const mode = options.crossStyle ?? 'color-symbol';
  ctx.fillStyle = '#fff';
  ctx.fillRect(rect.x, rect.y, Math.ceil(rect.width), Math.ceil(rect.height));

  if (mode !== 'symbol') {
    const pad = Math.max(1.5, rect.width * .16);
    ctx.strokeStyle = css(rgb);
    ctx.lineWidth = Math.max(1.4, rect.width * .12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rect.x + pad, rect.y + pad);
    ctx.lineTo(rect.x + rect.width - pad, rect.y + rect.height - pad);
    ctx.moveTo(rect.x + rect.width - pad, rect.y + pad);
    ctx.lineTo(rect.x + pad, rect.y + rect.height - pad);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  if ((mode === 'symbol' || mode === 'color-symbol') && rect.width >= 18) {
    ctx.fillStyle = mode === 'symbol' ? '#111' : contrastText(rgb);
    ctx.font = `700 ${Math.max(8, Math.floor(rect.width * .34))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(CROSS_STITCH_SYMBOLS[paletteIndex % CROSS_STITCH_SYMBOLS.length], rect.x + rect.width/2, rect.y + rect.height/2);
  }
}

function drawBead(ctx, rect, rgb, paletteIndex, options) {
  const profile = getBeadProfile(options.beadProfile);
  const realistic = (options.beadRender ?? 'realistic') === 'realistic';
  const showHole = options.beadHoles !== false;
  const showSymbol = options.beadSymbols === true;

  const ratio = profile.diameterMm / profile.widthMm;
  let beadW = rect.width * .9;
  let beadH = beadW / ratio;
  if (beadH > rect.height * .88) {
    beadH = rect.height * .88;
    beadW = beadH * ratio;
  }
  const x = rect.x + (rect.width - beadW)/2;
  const y = rect.y + (rect.height - beadH)/2;
  const radius = profile.shape === 'round' ? beadH * .45 : beadH * .22;

  roundedRect(ctx, x, y + beadH*.06, beadW, beadH, radius);
  ctx.fillStyle = realistic ? shade(rgb, -.22) : css(rgb);
  ctx.fill();

  roundedRect(ctx, x, y, beadW, beadH*.92, radius);
  ctx.fillStyle = css(rgb);
  ctx.fill();

  ctx.strokeStyle = realistic ? shade(rgb, -.35) : 'rgba(0,0,0,.22)';
  ctx.lineWidth = Math.max(.7, rect.width*.035);
  ctx.stroke();

  if (realistic && beadW >= 8) {
    roundedRect(ctx, x + beadW*.08, y + beadH*.08, beadW*.84, beadH*.22, radius*.45);
    ctx.fillStyle = 'rgba(255,255,255,.24)';
    ctx.fill();
    roundedRect(ctx, x + beadW*.06, y + beadH*.72, beadW*.88, beadH*.14, radius*.35);
    ctx.fillStyle = 'rgba(0,0,0,.11)';
    ctx.fill();
  }

  if (showHole && beadW >= 10) {
    ctx.fillStyle = realistic ? 'rgba(20,20,20,.42)' : 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(x + beadW/2, y + beadH/2, Math.max(1, beadW*.055), Math.max(1, beadH*.19), 0, 0, Math.PI*2);
    ctx.fill();
  }

  if (showSymbol && beadW >= 15) {
    ctx.fillStyle = contrastText(rgb);
    ctx.font = `700 ${Math.max(8, Math.floor(beadH*.42))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(beadSymbol(paletteIndex), x + beadW/2, y + beadH/2);
  }
}

function drawKnitting(ctx, rect, rgb, options) {
  const mode = options.knitStyle ?? 'color-v';
  if (mode !== 'symbol') drawSolid(ctx, rect, rgb);
  else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(rect.x, rect.y, Math.ceil(rect.width), Math.ceil(rect.height));
  }
  if (mode === 'block' || rect.width < 11) return;
  ctx.strokeStyle = mode === 'symbol' ? '#111' : contrastColor(rgb, .55);
  ctx.lineWidth = Math.max(1, rect.width*.07);
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width*.25, rect.y + rect.height*.28);
  ctx.lineTo(rect.x + rect.width*.5, rect.y + rect.height*.76);
  ctx.lineTo(rect.x + rect.width*.75, rect.y + rect.height*.28);
  ctx.stroke();
}

function roundedRect(ctx, x,y,width,height,radius) {
  const r = Math.min(radius,width/2,height/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+width,y,x+width,y+height,r);
  ctx.arcTo(x+width,y+height,x,y+height,r);
  ctx.arcTo(x,y+height,x,y,r);
  ctx.arcTo(x,y,x+width,y,r);
  ctx.closePath();
}

function beadSymbol(index) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < alphabet.length) return alphabet[index];
  return String(index + 1);
}
function css([r,g,b]) { return `rgb(${r},${g},${b})`; }
function luminance([r,g,b]) { return .2126*r + .7152*g + .0722*b; }
function contrastText(rgb) { return luminance(rgb)>145 ? '#111' : '#fff'; }
function contrastColor(rgb,alpha) { return luminance(rgb)>145 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`; }
function shade([r,g,b], amount) {
  const f = amount < 0 ? 1 + amount : 1;
  const add = amount > 0 ? 255*amount : 0;
  return `rgb(${Math.max(0,Math.min(255,Math.round(r*f+add)))},${Math.max(0,Math.min(255,Math.round(g*f+add)))},${Math.max(0,Math.min(255,Math.round(b*f+add)))})`;
}
