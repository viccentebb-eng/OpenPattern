import { createPattern, touchPattern } from '../src/core/pattern.mjs';
import { mirrorHorizontal, setCell } from '../src/core/grid.mjs';
import { listTechniques } from '../src/techniques/registry.mjs';
import { pixelsToPatternData } from '../src/image/image-to-grid.mjs';

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const technique = document.querySelector('#technique');
const imageInput = document.querySelector('#image');
const widthInput = document.querySelector('#width');
const colorsInput = document.querySelector('#colors');
const paletteEl = document.querySelector('#palette');
const statusEl = document.querySelector('#status');

let pattern = createPattern({ techniqueId: 'tapestry-crochet', width: 32, height: 24 });
let activeColor = 1;

for (const item of listTechniques()) {
  const option = document.createElement('option');
  option.value = item.id;
  option.textContent = item.name;
  technique.append(option);
}

technique.addEventListener('change', () => {
  pattern.techniqueId = technique.value;
  touchPattern(pattern);
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
  wctx.imageSmoothingEnabled = true;
  wctx.drawImage(bitmap, 0, 0, width, height);
  const data = wctx.getImageData(0, 0, width, height);
  const converted = pixelsToPatternData({ rgba: data.data, width, height, maxColors: Number(colorsInput.value) || 8 });

  pattern = createPattern({ techniqueId: technique.value, width, height, title: file.name.replace(/\.[^.]+$/, ''), palette: converted.palette });
  pattern.grid.cells = converted.cells;
  activeColor = 0;
  renderPalette();
  render();
  statusEl.textContent = `${width}×${height} · ${pattern.palette.length} colores · ${technique.options[technique.selectedIndex].text}`;
});

document.querySelector('#mirror').addEventListener('click', () => {
  mirrorHorizontal(pattern.grid);
  touchPattern(pattern);
  render();
});

document.querySelector('#download').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(pattern, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName(pattern.title)}.openpattern.json`;
  a.click();
  URL.revokeObjectURL(url);
});

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const px = (event.clientX - rect.left) * canvas.width / rect.width;
  const py = (event.clientY - rect.top) * canvas.height / rect.height;
  const layout = getLayout();
  const x = Math.floor((px - layout.offsetX) / layout.cell);
  const y = Math.floor((py - layout.offsetY) / layout.cell);
  if (x >= 0 && y >= 0 && x < pattern.grid.width && y < pattern.grid.height) {
    setCell(pattern.grid, x, y, activeColor);
    touchPattern(pattern);
    render();
  }
});

function renderPalette() {
  paletteEl.replaceChildren();
  pattern.palette.forEach((color, index) => {
    const button = document.createElement('button');
    button.className = `swatch${index === activeColor ? ' active' : ''}`;
    button.style.background = `rgb(${color.rgb.join(',')})`;
    button.title = color.name;
    button.addEventListener('click', () => {
      activeColor = index;
      renderPalette();
    });
    paletteEl.append(button);
  });
}

function getLayout() {
  const pad = 24;
  const cell = Math.max(1, Math.floor(Math.min((canvas.width - pad * 2) / pattern.grid.width, (canvas.height - pad * 2) / pattern.grid.height)));
  const drawWidth = cell * pattern.grid.width;
  const drawHeight = cell * pattern.grid.height;
  return { cell, offsetX: Math.floor((canvas.width - drawWidth) / 2), offsetY: Math.floor((canvas.height - drawHeight) / 2) };
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const { cell, offsetX, offsetY } = getLayout();

  for (let y = 0; y < pattern.grid.height; y += 1) {
    for (let x = 0; x < pattern.grid.width; x += 1) {
      const index = pattern.grid.cells[y * pattern.grid.width + x];
      const color = pattern.palette[index]?.rgb ?? [255, 0, 255];
      ctx.fillStyle = `rgb(${color.join(',')})`;
      ctx.fillRect(offsetX + x * cell, offsetY + y * cell, cell, cell);
    }
  }

  if (cell >= 7) {
    ctx.strokeStyle = 'rgba(0,0,0,.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= pattern.grid.width; x += 1) {
      const px = offsetX + x * cell + 0.5;
      ctx.moveTo(px, offsetY);
      ctx.lineTo(px, offsetY + pattern.grid.height * cell);
    }
    for (let y = 0; y <= pattern.grid.height; y += 1) {
      const py = offsetY + y * cell + 0.5;
      ctx.moveTo(offsetX, py);
      ctx.lineTo(offsetX + pattern.grid.width * cell, py);
    }
    ctx.stroke();
  }
}

function safeName(value) {
  return (value || 'pattern').toLowerCase().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'pattern';
}

renderPalette();
render();
