import { createPattern, touchPattern, validatePattern } from '../src/core/pattern.mjs';
import { floodFill, mirrorHorizontal, setCell } from '../src/core/grid.mjs';
import { listTechniques } from '../src/techniques/registry.mjs';
import { pixelsToPatternData } from '../src/image/image-to-grid.mjs';

const STORAGE_KEY = 'openpattern.current.v1';
const HISTORY_LIMIT = 50;

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const technique = document.querySelector('#technique');
const imageInput = document.querySelector('#image');
const widthInput = document.querySelector('#width');
const colorsInput = document.querySelector('#colors');
const pixelModeInput = document.querySelector('#pixelMode');
const paletteEl = document.querySelector('#palette');
const statusEl = document.querySelector('#status');
const saveStatusEl = document.querySelector('#saveStatus');
const undoButton = document.querySelector('#undo');
const redoButton = document.querySelector('#redo');

let pattern = loadPattern() ?? createPattern({ techniqueId: 'tapestry-crochet', width: 32, height: 24 });
let activeColor = Math.min(1, pattern.palette.length - 1);
let activeTool = 'pencil';
let spaceDown = false;
let gesture = null;
let lastPaintedCell = null;
let undoStack = [];
let redoStack = [];
let view = { zoom: 1, panX: 0, panY: 0 };

for (const item of listTechniques()) {
  const option = document.createElement('option');
  option.value = item.id;
  option.textContent = item.name;
  technique.append(option);
}
technique.value = pattern.techniqueId;

for (const button of document.querySelectorAll('.tool')) {
  button.addEventListener('click', () => setTool(button.dataset.tool));
}

technique.addEventListener('change', () => {
  beginMutation();
  pattern.techniqueId = technique.value;
  commitMutation();
});

imageInput.addEventListener('change', async () => {
  const file = imageInput.files?.[0];
  if (!file) return;

  const bitmap = await createImageBitmap(file);
  const width = Math.max(8, Math.min(300, Number(widthInput.value) || 48));
  const height = Math.max(1, Math.round(bitmap.height * width / bitmap.width));
  const work = document.createElement('canvas');
  work.width = width;
  work.height = height;

  const wctx = work.getContext('2d', { willReadFrequently: true });
  wctx.imageSmoothingEnabled = !pixelModeInput.checked;
  wctx.drawImage(bitmap, 0, 0, width, height);

  const data = wctx.getImageData(0, 0, width, height);
  const converted = pixelsToPatternData({
    rgba: data.data,
    width,
    height,
    maxColors: Number(colorsInput.value) || 8
  });

  beginMutation();
  pattern = createPattern({
    techniqueId: technique.value,
    width,
    height,
    title: file.name.replace(/\.[^.]+$/, ''),
    palette: converted.palette
  });
  pattern.grid.cells = converted.cells;
  activeColor = 0;
  view = { zoom: 1, panX: 0, panY: 0 };
  commitMutation();
  renderPalette();
  render();
});

document.querySelector('#mirror').addEventListener('click', () => {
  beginMutation();
  mirrorHorizontal(pattern.grid);
  commitMutation();
  render();
});

document.querySelector('#resetView').addEventListener('click', () => {
  view = { zoom: 1, panX: 0, panY: 0 };
  render();
});

undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);

document.querySelector('#download').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(pattern, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName(pattern.title)}.openpattern.json`;
  a.click();
  URL.revokeObjectURL(url);
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const point = pointerToCanvas(event);
  const oldLayout = getLayout();
  const gridX = (point.x - oldLayout.offsetX) / oldLayout.cell;
  const gridY = (point.y - oldLayout.offsetY) / oldLayout.cell;
  const nextZoom = clamp(view.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12), 0.2, 16);
  if (nextZoom === view.zoom) return;

  view.zoom = nextZoom;
  const nextBaseCell = getBaseCell();
  const nextCell = nextBaseCell * view.zoom;
  const baseOffsetX = (canvas.width - nextCell * pattern.grid.width) / 2;
  const baseOffsetY = (canvas.height - nextCell * pattern.grid.height) / 2;
  view.panX = point.x - baseOffsetX - gridX * nextCell;
  view.panY = point.y - baseOffsetY - gridY * nextCell;
  render();
}, { passive: false });

canvas.addEventListener('pointerdown', (event) => {
  const shouldPan = activeTool === 'pan' || spaceDown || event.button === 1;

  if (shouldPan) {
    gesture = {
      type: 'pan',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: view.panX,
      panY: view.panY
    };
    canvas.classList.add('panning');
    canvas.setPointerCapture(event.pointerId);
    return;
  }

  const cell = eventToCell(event);
  if (!cell) return;

  if (activeTool === 'fill') {
    beginMutation();
    floodFill(pattern.grid, cell.x, cell.y, activeColor);
    commitMutation();
    render();
    return;
  }

  beginMutation();
  gesture = { type: 'paint', pointerId: event.pointerId };
  lastPaintedCell = null;
  canvas.setPointerCapture(event.pointerId);
  paintCell(cell.x, cell.y);
});

canvas.addEventListener('pointermove', (event) => {
  if (!gesture || gesture.pointerId !== event.pointerId) return;

  if (gesture.type === 'pan') {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    view.panX = gesture.panX + (event.clientX - gesture.startX) * sx;
    view.panY = gesture.panY + (event.clientY - gesture.startY) * sy;
    render();
    return;
  }

  const cell = eventToCell(event);
  if (cell) paintCell(cell.x, cell.y);
});

canvas.addEventListener('pointerup', finishGesture);
canvas.addEventListener('pointercancel', finishGesture);

window.addEventListener('keydown', (event) => {
  const target = event.target;
  const typing = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
  const modifier = event.ctrlKey || event.metaKey;

  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
    return;
  }

  if (modifier && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redo();
    return;
  }

  if (typing) return;

  if (event.code === 'Space') {
    event.preventDefault();
    spaceDown = true;
    canvas.classList.add('panning');
    return;
  }

  const shortcuts = { b: 'pencil', e: 'eraser', g: 'fill', h: 'pan' };
  const tool = shortcuts[event.key.toLowerCase()];
  if (tool) setTool(tool);
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    spaceDown = false;
    if (gesture?.type !== 'pan') canvas.classList.remove('panning');
  }
});

window.addEventListener('beforeunload', savePattern);

function finishGesture(event) {
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  const wasPainting = gesture.type === 'paint';
  gesture = null;
  lastPaintedCell = null;
  canvas.classList.remove('panning');
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (wasPainting) commitMutation();
}

function paintCell(x, y) {
  const key = `${x}:${y}`;
  if (key === lastPaintedCell) return;
  lastPaintedCell = key;
  setCell(pattern.grid, x, y, activeTool === 'eraser' ? 0 : activeColor);
  render();
}

function setTool(tool) {
  activeTool = tool;
  canvas.dataset.tool = tool;
  for (const button of document.querySelectorAll('.tool')) {
    button.classList.toggle('active', button.dataset.tool === tool);
  }
  updateStatus();
}

function beginMutation() {
  undoStack.push(clone(pattern));
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  updateHistoryButtons();
}

function commitMutation() {
  touchPattern(pattern);
  savePattern();
  updateHistoryButtons();
  updateStatus();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(clone(pattern));
  pattern = undoStack.pop();
  afterPatternRestore();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(clone(pattern));
  pattern = redoStack.pop();
  afterPatternRestore();
}

function afterPatternRestore() {
  technique.value = pattern.techniqueId;
  activeColor = Math.min(activeColor, pattern.palette.length - 1);
  renderPalette();
  savePattern();
  updateHistoryButtons();
  render();
}

function updateHistoryButtons() {
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

function renderPalette() {
  paletteEl.replaceChildren();

  pattern.palette.forEach((color, index) => {
    const button = document.createElement('button');
    button.className = `swatch${index === activeColor ? ' active' : ''}`;
    button.style.background = `rgb(${color.rgb.join(',')})`;
    button.title = `${index + 1}. ${color.name}`;
    button.setAttribute('aria-label', color.name);
    button.addEventListener('click', () => {
      activeColor = index;
      if (activeTool === 'eraser') setTool('pencil');
      renderPalette();
      updateStatus();
    });
    paletteEl.append(button);
  });
}

function getBaseCell() {
  const pad = 52;
  return Math.max(1, Math.min(
    (canvas.width - pad * 2) / pattern.grid.width,
    (canvas.height - pad * 2) / pattern.grid.height
  ));
}

function getLayout() {
  const cell = getBaseCell() * view.zoom;
  const drawWidth = cell * pattern.grid.width;
  const drawHeight = cell * pattern.grid.height;
  return {
    cell,
    offsetX: (canvas.width - drawWidth) / 2 + view.panX,
    offsetY: (canvas.height - drawHeight) / 2 + view.panY
  };
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f7f7f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const { cell, offsetX, offsetY } = getLayout();
  const drawWidth = cell * pattern.grid.width;
  const drawHeight = cell * pattern.grid.height;

  ctx.fillStyle = '#fff';
  ctx.fillRect(offsetX, offsetY, drawWidth, drawHeight);

  const startX = clamp(Math.floor(-offsetX / cell), 0, pattern.grid.width);
  const startY = clamp(Math.floor(-offsetY / cell), 0, pattern.grid.height);
  const endX = clamp(Math.ceil((canvas.width - offsetX) / cell), 0, pattern.grid.width);
  const endY = clamp(Math.ceil((canvas.height - offsetY) / cell), 0, pattern.grid.height);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const index = pattern.grid.cells[y * pattern.grid.width + x];
      const color = pattern.palette[index]?.rgb ?? [255, 0, 255];
      ctx.fillStyle = `rgb(${color.join(',')})`;
      ctx.fillRect(offsetX + x * cell, offsetY + y * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }

  if (cell >= 7) drawGrid({ cell, offsetX, offsetY, startX, startY, endX, endY });

  ctx.strokeStyle = 'rgba(0,0,0,.32)';
  ctx.lineWidth = 1;
  ctx.strokeRect(offsetX + .5, offsetY + .5, drawWidth, drawHeight);

  updateStatus();
}

function drawGrid({ cell, offsetX, offsetY, startX, startY, endX, endY }) {
  ctx.strokeStyle = cell >= 18 ? 'rgba(0,0,0,.16)' : 'rgba(0,0,0,.09)';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = startX; x <= endX; x += 1) {
    const px = Math.round(offsetX + x * cell) + .5;
    ctx.moveTo(px, Math.max(0, offsetY + startY * cell));
    ctx.lineTo(px, Math.min(canvas.height, offsetY + endY * cell));
  }

  for (let y = startY; y <= endY; y += 1) {
    const py = Math.round(offsetY + y * cell) + .5;
    ctx.moveTo(Math.max(0, offsetX + startX * cell), py);
    ctx.lineTo(Math.min(canvas.width, offsetX + endX * cell), py);
  }

  ctx.stroke();
}

function eventToCell(event) {
  const point = pointerToCanvas(event);
  const layout = getLayout();
  const x = Math.floor((point.x - layout.offsetX) / layout.cell);
  const y = Math.floor((point.y - layout.offsetY) / layout.cell);
  return x >= 0 && y >= 0 && x < pattern.grid.width && y < pattern.grid.height ? { x, y } : null;
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height
  };
}

function updateStatus() {
  const toolNames = { pencil: 'Pincel', eraser: 'Borrador', fill: 'Relleno', pan: 'Mover' };
  statusEl.textContent = `${pattern.grid.width}×${pattern.grid.height} · ${pattern.palette.length} colores · ${toolNames[activeTool]} · ${Math.round(view.zoom * 100)}%`;
  document.querySelector('#resetView').textContent = `${Math.round(view.zoom * 100)}%`;
}

function savePattern() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pattern));
    saveStatusEl.textContent = 'Guardado local';
  } catch {
    saveStatusEl.textContent = 'No se pudo guardar localmente';
  }
}

function loadPattern() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const candidate = JSON.parse(raw);
    return validatePattern(candidate).length === 0 ? candidate : null;
  } catch {
    return null;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeName(value) {
  return (value || 'pattern').toLowerCase().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'pattern';
}

canvas.dataset.tool = activeTool;
renderPalette();
updateHistoryButtons();
render();
savePattern();
