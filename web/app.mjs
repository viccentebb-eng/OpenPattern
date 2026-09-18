import { createPattern, touchPattern, validatePattern } from '../src/core/pattern.mjs';
import { fillRect, floodFill, mirrorHorizontal } from '../src/core/grid.mjs';
import { pixelsToPatternData } from '../src/image/image-to-grid.mjs';
import { applyImageAdjustments } from '../src/image/preprocess.mjs';
import { getTechnique, listTechniques } from '../src/techniques/registry.mjs';
import { BEAD_PROFILES, drawTechniqueCell, estimateTechniqueSize, techniqueLegendMeta } from './technique-renderers.mjs';
import { buildBeadLayout, isGeometryTechnique } from '../src/geometry/bead-layout.mjs';
import { beadRunsForRepeat, detectLinearRepeat } from '../src/geometry/bead-rope.mjs';
import { drawBeadLayout, hitTestBeadLayout, projectBeadLayout } from './bead-geometry-renderer.mjs';
import { buildAmigurumi, buildRadialCrochetChart, CROCHET_STITCHES, validateRoundSequence } from '../src/crochet/round-engine.mjs';
import { drawCrochetTechnique } from './crochet-renderer.mjs';
import { toCrochetParadeDsl } from '../src/crochet/crochetparade-adapter.mjs';
import { CROCHET_SYMBOLS, addCrochetEdge, addCrochetNode, chartToRoundText, createCrochetChart, generateCrochetTemplate, moveCrochetNode, nearestGuidePoint, parseRoundText, removeCrochetNode, summarizeCrochetChart, updateCrochetNode } from '../src/crochet/chart-model.mjs';
import { drawCrochetChart, hitTestCrochetChart, projectCrochetChart, screenToCrochetModel } from './crochet-chart-renderer.mjs';

const STORAGE_KEY='openpattern.current.v1';
const VIEW_KEY='openpattern.view.v1';
const HISTORY_LIMIT=50;
const $=s=>document.querySelector(s);

const canvas=$('#canvas'),ctx=canvas.getContext('2d');
const sourcePreview=$('#sourcePreview'),sourceCtx=sourcePreview.getContext('2d');
const patternViewer=$('#patternViewer'),viewerCtx=patternViewer.getContext('2d');
const technique=$('#technique'),imageInput=$('#image'),widthInput=$('#width'),colorsInput=$('#colors');
const pixelModeInput=$('#pixelMode'),cleanGridInput=$('#cleanGrid'),lightThresholdInput=$('#lightThreshold');
const brightnessInput=$('#brightness'),contrastInput=$('#contrast'),saturationInput=$('#saturation'),autoRegenerateInput=$('#autoRegenerate');
const paletteEl=$('#palette'),paletteColorInput=$('#paletteColor'),techniqueLegendEl=$('#techniqueLegend'),techniqueOptionsEl=$('#techniqueOptions');
const statusEl=$('#status'),sourceStatusEl=$('#sourceStatus'),saveStatusEl=$('#saveStatus'),projectMetaEl=$('#projectMeta');
const undoButton=$('#undo'),redoButton=$('#redo'),historyEl=$('#history'),historyMetaEl=$('#historyMeta');
const brushSizeInput=$('#brushSize'),eraserSizeInput=$('#eraserSize'),brushSizeValue=$('#brushSizeValue'),eraserSizeValue=$('#eraserSizeValue');
const conversionPanel=$('#imageConversionPanel');
const techniqueNameEl=$('#techniqueName'),techniqueSourceModeEl=$('#techniqueSourceMode'),techniqueSourceHelpEl=$('#techniqueSourceHelp');
const rightPanel=document.querySelector('.right-panel');
const crochetStudioPanel=$('#crochetStudioPanel'),crochetSymbolPalette=$('#crochetSymbolPalette'),crochetSelectionInfo=$('#crochetSelectionInfo');

let pattern=loadPattern()??createPattern({techniqueId:'tapestry-crochet',width:32,height:24});
let sourceBitmap=null,sourceName='',activeColor=Math.min(1,pattern.palette.length-1),activeTool='pencil',brushSize=1,eraserSize=1;
let spaceDown=false,gesture=null,lastPaintedCell=null,pendingMutation=null,undoStack=[],redoStack=[],regenerateTimer=null;
let view={zoom:1,panX:0,panY:0};
let renderOptions=loadViewOptions();
let lastGeometryProjection=[];
let crochetTool='select',crochetStitch='sc',crochetSelectedId=null,crochetConnectFrom=null,crochetDrag=null,lastCrochetProjection=[];

{
  const groups=new Map();
  for(const item of listTechniques()){
    const group=item.group||'Other';
    if(!groups.has(group)){
      const optgroup=document.createElement('optgroup');
      optgroup.label=group;
      groups.set(group,optgroup);
      technique.append(optgroup);
    }
    const o=document.createElement('option');
    o.value=item.id;
    o.textContent=item.name;
    groups.get(group).append(o);
  }
}
technique.value=pattern.techniqueId;
for(const b of document.querySelectorAll('.tool'))b.addEventListener('click',()=>setTool(b.dataset.tool));
setupCrochetStudio();

brushSizeInput.addEventListener('input',()=>{brushSize=+brushSizeInput.value;brushSizeValue.value=`${brushSize}×${brushSize}`;updateStatus()});
eraserSizeInput.addEventListener('input',()=>{eraserSize=+eraserSizeInput.value;eraserSizeValue.value=`${eraserSize}×${eraserSize}`;updateStatus()});

technique.addEventListener('change',()=>{
  beginMutation('Cambiar técnica');
  pattern.techniqueId=technique.value;
  if(isGeometryTechnique(pattern.techniqueId)) ensureGeometryState();
  if(isStructuredCrochetTechnique(pattern.techniqueId)) ensureCrochetState();
  crochetSelectedId=null;crochetConnectFrom=null;
  commitMutation();
  updateSourcePanelVisibility();
  if(rightPanel) rightPanel.scrollTop=0;
  renderTechniqueControls();
  renderTechniqueLegend();
  render();
});

imageInput.addEventListener('change',async()=>{
  const f=imageInput.files?.[0];
  if(!f)return;
  sourceBitmap?.close?.();
  sourceBitmap=await createImageBitmap(f);
  sourceName=f.name;
  sourceStatusEl.textContent=`${f.name} · ${sourceBitmap.width}×${sourceBitmap.height}`;
  drawSourcePreview();
  if(currentTechnique()?.sourceMode==='image-grid'){
    await regeneratePattern('Importar imagen',true);
  }
});

for(const c of [widthInput,colorsInput,pixelModeInput,cleanGridInput,lightThresholdInput,brightnessInput,contrastInput,saturationInput]){
  c.addEventListener('input',()=>{syncConversionLabels();scheduleRegenerate()});
  c.addEventListener('change',scheduleRegenerate);
}

$('#regenerate').addEventListener('click',()=>regeneratePattern('Regenerar diseño'));
$('#resetConversion').addEventListener('click',()=>{
  widthInput.value=48;colorsInput.value=8;pixelModeInput.checked=false;cleanGridInput.checked=false;
  lightThresholdInput.value=215;brightnessInput.value=0;contrastInput.value=0;saturationInput.value=0;
  syncConversionLabels();
  if(sourceBitmap)regeneratePattern('Restablecer conversión');
});
$('#mirror').addEventListener('click',()=>{beginMutation('Espejar horizontal');mirrorHorizontal(pattern.grid);commitMutation();render()});
$('#clearAll').addEventListener('click',()=>{
  beginMutation('Limpiar lienzo');
  if(pattern.techniqueId==='crochet-round-chart'){
    ensureCrochetState();
    pattern.crochet.chart=createCrochetChart({layout:renderOptions.crochetLayout});
    crochetSelectedId=null;crochetConnectFrom=null;
  }else{
    pattern.grid.cells.fill(0);
  }
  commitMutation();renderTechniqueControls();updateCrochetStudioUI();render();
});
$('#addColor').addEventListener('click',()=>{
  if(pattern.palette.length>=64)return;
  beginMutation('Añadir color');
  pattern.palette.push({id:`c${Date.now().toString(36)}`,name:paletteColorInput.value.toUpperCase(),rgb:hexToRgb(paletteColorInput.value)});
  activeColor=pattern.palette.length-1;
  commitMutation();renderPalette();renderTechniqueLegend();render();
});
$('#updateColor').addEventListener('click',()=>{
  if(!pattern.palette[activeColor])return;
  beginMutation('Editar color');
  pattern.palette[activeColor]={...pattern.palette[activeColor],name:paletteColorInput.value.toUpperCase(),rgb:hexToRgb(paletteColorInput.value)};
  commitMutation();renderPalette();renderTechniqueLegend();render();
});
$('#resetView').addEventListener('click',()=>{view={zoom:1,panX:0,panY:0};render()});
undoButton.addEventListener('click',undo);
redoButton.addEventListener('click',redo);

$('#showGuides').checked=renderOptions.showGuides;
$('#guideSpacing').value=renderOptions.guideSpacing;
$('#showCoordinates').checked=renderOptions.showCoordinates;
$('#trackMode').checked=renderOptions.trackMode;

for(const id of ['showGuides','showCoordinates','trackMode']){
  $(`#${id}`).addEventListener('change',e=>{renderOptions[id]=e.target.checked;saveViewOptions();render()});
}
$('#guideSpacing').addEventListener('change',e=>{
  renderOptions.guideSpacing=Math.max(2,Math.min(50,+e.target.value||10));
  saveViewOptions();render();
});
$('#trackPrev').addEventListener('click',()=>{renderOptions.trackIndex=Math.max(0,renderOptions.trackIndex-1);saveViewOptions();render()});
$('#trackNext').addEventListener('click',()=>{renderOptions.trackIndex=Math.min(pattern.grid.height-1,renderOptions.trackIndex+1);saveViewOptions();render()});

$('#download').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(pattern,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`${safeName(pattern.title)}.openpattern.json`;a.click();URL.revokeObjectURL(url);
});

canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  if(isStructuredCrochetTechnique(pattern.techniqueId)){
    view.zoom=clamp(view.zoom*(e.deltaY<0?1.12:1/1.12),.3,8);
    render();
    return;
  }
  const p=pointerToCanvas(e),old=getLayout(),gx=(p.x-old.offsetX)/old.cell,gy=(p.y-old.offsetY)/old.cell;
  const nz=clamp(view.zoom*(e.deltaY<0?1.12:1/1.12),.2,16);
  if(nz===view.zoom)return;
  view.zoom=nz;
  const nc=getBaseCell()*view.zoom;
  view.panX=p.x-(canvas.width-nc*pattern.grid.width)/2-gx*nc;
  view.panY=p.y-(canvas.height-nc*pattern.grid.height)/2-gy*nc;
  render();
},{passive:false});

canvas.addEventListener('pointerdown',e=>{
  const pan=activeTool==='pan'||spaceDown||e.button===1;
  if(pan){
    gesture={type:'pan',pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,panX:view.panX,panY:view.panY};
    canvas.classList.add('panning');canvas.setPointerCapture(e.pointerId);return;
  }

  if(pattern.techniqueId==='crochet-round-chart'){
    const chart=currentCrochetChart();
    const hit=eventToCrochetNode(e);

    if(crochetTool==='place'){
      const raw=eventToCrochetModel(e);
      const snapped=nearestGuidePoint(chart,raw.x,raw.y,{segments:Math.max(6,renderOptions.crochetGuideSpokes)});
      beginMutation('Insertar puntada');
      const node=addCrochetNode(chart,{
        type:crochetStitch,
        x:snapped.x,
        y:snapped.y,
        round:Number.isFinite(snapped.round)?Math.max(1,Math.round(snapped.round)):null,
        colorIndex:activeColor,
        rotation:chart.layout==='radial'?Math.atan2(snapped.y,snapped.x)+Math.PI/2:0
      });
      crochetSelectedId=node.id;
      commitMutation();renderTechniqueControls();updateCrochetStudioUI();render();return;
    }

    if(crochetTool==='delete'){
      if(!hit)return;
      beginMutation('Borrar puntada');
      removeCrochetNode(chart,hit.id);
      if(crochetSelectedId===hit.id)crochetSelectedId=null;
      if(crochetConnectFrom===hit.id)crochetConnectFrom=null;
      commitMutation();renderTechniqueControls();updateCrochetStudioUI();render();return;
    }

    if(crochetTool==='connect'){
      if(!hit)return;
      if(!crochetConnectFrom){
        crochetConnectFrom=hit.id;
        crochetSelectedId=hit.id;
        updateCrochetStudioUI();render();return;
      }
      if(crochetConnectFrom!==hit.id){
        beginMutation('Conectar puntadas');
        addCrochetEdge(chart,crochetConnectFrom,hit.id,'thread');
        crochetSelectedId=hit.id;
        crochetConnectFrom=null;
        commitMutation();renderTechniqueControls();updateCrochetStudioUI();render();
      }
      return;
    }

    crochetSelectedId=hit?.id??null;
    crochetConnectFrom=null;
    updateCrochetStudioUI();
    if(hit){
      beginMutation('Mover puntada');
      gesture={type:'crochet-drag',pointerId:e.pointerId,nodeId:hit.id};
      crochetDrag={nodeId:hit.id};
      canvas.setPointerCapture(e.pointerId);
    }
    render();return;
  }

  if(pattern.techniqueId==='amigurumi')return;

  if(isGeometryTechnique(pattern.techniqueId)){
    const node=eventToGeometryNode(e);if(!node)return;
    ensureGeometryState();
    if(activeTool==='fill'){
      beginMutation('Rellenar cuentas');
      const target=geometryColorIndex(node);
      for(const n of currentGeometryLayout().nodes){
        if(geometryColorIndex(n)===target) setGeometryNodeColor(n,activeColor);
      }
      commitMutation();renderTechniqueLegend();render();return;
    }
    beginMutation(activeTool==='eraser'?'Borrar cuentas':'Pintar cuentas');
    gesture={type:'geometry-paint',pointerId:e.pointerId};
    canvas.setPointerCapture(e.pointerId);
    paintGeometryNode(node);
    render();
    return;
  }

  const cell=eventToCell(e);if(!cell)return;
  if(activeTool==='fill'){
    beginMutation('Rellenar área');floodFill(pattern.grid,cell.x,cell.y,activeColor);commitMutation();render();return;
  }
  beginMutation(activeTool==='eraser'?'Borrar':'Pincel');
  gesture={type:'paint',pointerId:e.pointerId};lastPaintedCell=null;canvas.setPointerCapture(e.pointerId);paintStrokeTo(cell.x,cell.y);
});

canvas.addEventListener('pointermove',e=>{
  const hover=pattern.techniqueId==='crochet-round-chart'
    ? eventToCrochetNode(e)
    : (isStructuredCrochetTechnique(pattern.techniqueId)
      ? null
      : (isGeometryTechnique(pattern.techniqueId)?eventToGeometryNode(e):eventToCell(e)));

  if(hover){
    statusEl.dataset.pointer=pattern.techniqueId==='crochet-round-chart'
      ? `${CROCHET_SYMBOLS[hover.type]?.short??hover.type} ${hover.id}`
      : (isGeometryTechnique(pattern.techniqueId)
        ? `cuenta ${hover.sequence??hover.index+1}`
        : `${hover.x+1},${hover.y+1}`);
  }

  if(!gesture||gesture.pointerId!==e.pointerId){updateStatus();return}
  if(gesture.type==='pan'){
    const r=canvas.getBoundingClientRect();
    view.panX=gesture.panX+(e.clientX-gesture.startX)*canvas.width/r.width;
    view.panY=gesture.panY+(e.clientY-gesture.startY)*canvas.height/r.height;
    render();return;
  }
  if(gesture.type==='crochet-drag'){
    const chart=currentCrochetChart();
    const raw=eventToCrochetModel(e);
    const snapped=nearestGuidePoint(chart,raw.x,raw.y,{segments:Math.max(6,renderOptions.crochetGuideSpokes)});
    moveCrochetNode(chart,gesture.nodeId,snapped.x,snapped.y);
    const node=chart.nodes.find(n=>n.id===gesture.nodeId);
    if(node){
      node.round=Number.isFinite(snapped.round)?Math.max(1,Math.round(snapped.round)):null;
      if(chart.layout==='radial')node.rotation=Math.atan2(node.y,node.x)+Math.PI/2;
    }
    render();return;
  }
  if(gesture.type==='geometry-paint'){
    if(hover)paintGeometryNode(hover);
    render();return;
  }
  if(hover)paintStrokeTo(hover.x,hover.y);
});

canvas.addEventListener('pointerup',finishGesture);
canvas.addEventListener('pointercancel',finishGesture);

window.addEventListener('keydown',e=>{
  const typing=e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement;
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
  if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return}
  if(typing)return;
  if(e.code==='Space'){e.preventDefault();spaceDown=true;canvas.classList.add('panning');return}
  const s={b:'pencil',e:'eraser',g:'fill',h:'pan'}[e.key.toLowerCase()];
  if(s)setTool(s);
});
window.addEventListener('keyup',e=>{if(e.code==='Space'){spaceDown=false;if(gesture?.type!=='pan')canvas.classList.remove('panning')}});
window.addEventListener('beforeunload',savePattern);

async function regeneratePattern(label='Regenerar diseño',resetView=false){
  if(currentTechnique()?.sourceMode!=='image-grid'){sourceStatusEl.textContent='Esta técnica no depende de una imagen.';return}
  if(!sourceBitmap){sourceStatusEl.textContent='Carga una imagen antes de regenerar.';return}
  clearTimeout(regenerateTimer);sourceStatusEl.textContent='Generando…';
  const width=clamp(Math.round(+widthInput.value||48),8,300);
  const height=Math.max(1,Math.round(sourceBitmap.height*width/sourceBitmap.width));
  const work=document.createElement('canvas');work.width=width;work.height=height;
  const wctx=work.getContext('2d',{willReadFrequently:true});
  wctx.imageSmoothingEnabled=!pixelModeInput.checked;wctx.imageSmoothingQuality='high';wctx.drawImage(sourceBitmap,0,0,width,height);
  const data=wctx.getImageData(0,0,width,height);
  const adjusted=applyImageAdjustments(data.data,{
    brightness:brightnessInput.value,contrast:contrastInput.value,saturation:saturationInput.value,
    removeLightGrid:cleanGridInput.checked,lightThreshold:lightThresholdInput.value,neutralTolerance:24
  });
  const converted=pixelsToPatternData({rgba:adjusted,width,height,maxColors:clamp(Math.round(+colorsInput.value||8),2,32)});
  beginMutation(label);
  pattern=createPattern({techniqueId:technique.value,width,height,title:sourceName.replace(/\.[^.]+$/,'')||'Imagen',palette:converted.palette});
  pattern.grid.cells=converted.cells;activeColor=0;renderOptions.trackIndex=0;
  if(resetView)view={zoom:1,panX:0,panY:0};
  commitMutation();
  syncPaletteEditor();renderPalette();renderTechniqueLegend();renderTechniqueControls();render();
  sourceStatusEl.textContent=`${sourceName} → ${width}×${height} · ${converted.palette.length} colores`;
}

function scheduleRegenerate(){
  if(currentTechnique()?.sourceMode!=='image-grid')return;
  if(!autoRegenerateInput.checked||!sourceBitmap)return;
  clearTimeout(regenerateTimer);
  regenerateTimer=setTimeout(()=>regeneratePattern('Ajustar conversión'),280);
}

function drawSourcePreview(){
  sourceCtx.clearRect(0,0,sourcePreview.width,sourcePreview.height);
  sourceCtx.fillStyle='#fff';sourceCtx.fillRect(0,0,sourcePreview.width,sourcePreview.height);
  if(!sourceBitmap)return;
  const s=Math.min(sourcePreview.width/sourceBitmap.width,sourcePreview.height/sourceBitmap.height);
  const w=sourceBitmap.width*s,h=sourceBitmap.height*s;
  sourceCtx.drawImage(sourceBitmap,(sourcePreview.width-w)/2,(sourcePreview.height-h)/2,w,h);
}

function syncConversionLabels(){
  for(const [id,el] of [['lightThreshold',lightThresholdInput],['brightness',brightnessInput],['contrast',contrastInput],['saturation',saturationInput]]){
    $(`#${id}Value`).value=el.value;
  }
}

function currentTechnique(){
  return getTechnique(pattern.techniqueId);
}

function updateSourcePanelVisibility(){
  const def=currentTechnique();
  const mode=def?.sourceMode??'manual';

  if(conversionPanel) conversionPanel.classList.toggle('hidden',mode!=='image-grid');
  if(crochetStudioPanel) crochetStudioPanel.classList.toggle('hidden',pattern.techniqueId!=='crochet-round-chart');

  if(techniqueNameEl) techniqueNameEl.textContent=def?.name??pattern.techniqueId;
  if(techniqueSourceModeEl){
    const labels={
      'image-grid':'Imagen / grid',
      'geometry':'Geometría',
      'parametric':'Paramétrico',
      'sequence':'Secuencia',
      'manual':'Manual'
    };
    techniqueSourceModeEl.textContent=labels[mode]??mode;
    techniqueSourceModeEl.dataset.mode=mode;
  }
  if(techniqueSourceHelpEl){
    const help={
      'image-grid':'La imagen puede convertirse directamente al patrón y regenerarse con sus propios ajustes.',
      'geometry':'La forma la define el motor de la técnica. La imagen no modifica la geometría.',
      'parametric':'El patrón se construye con parámetros propios de la técnica, no a partir de píxeles.',
      'sequence':'La construcción depende de vueltas, filas, aumentos y disminuciones.',
      'manual':'Edición manual con herramientas específicas.'
    };
    techniqueSourceHelpEl.textContent=help[mode]??'';
  }
}

function setupCrochetStudio(){
  if(!crochetSymbolPalette)return;
  crochetSymbolPalette.replaceChildren();

  for(const symbol of Object.values(CROCHET_SYMBOLS)){
    const b=document.createElement('button');
    b.type='button';
    b.className='crochet-symbol-button'+(symbol.id===crochetStitch?' active':'');
    b.dataset.stitch=symbol.id;
    b.title=symbol.label;
    const glyph=document.createElement('span');
    glyph.className='glyph';
    glyph.textContent=symbol.short;
    const label=document.createElement('small');
    label.textContent=symbol.label.split('/')[0].trim();
    b.append(glyph,label);
    b.addEventListener('click',()=>{
      crochetStitch=symbol.id;
      setCrochetTool('place');
      updateCrochetStudioUI();
    });
    crochetSymbolPalette.append(b);
  }

  for(const b of document.querySelectorAll('.crochet-tool')){
    b.addEventListener('click',()=>setCrochetTool(b.dataset.crochetTool));
  }

  $('#crochetRotateLeft')?.addEventListener('click',()=>rotateSelectedCrochet(-15));
  $('#crochetRotateRight')?.addEventListener('click',()=>rotateSelectedCrochet(15));
  $('#crochetDuplicate')?.addEventListener('click',duplicateSelectedCrochet);
  $('#crochetDeleteSelected')?.addEventListener('click',deleteSelectedCrochet);
  updateCrochetStudioUI();
}

function setCrochetTool(tool){
  crochetTool=tool;
  if(tool!=='connect')crochetConnectFrom=null;
  for(const b of document.querySelectorAll('.crochet-tool'))b.classList.toggle('active',b.dataset.crochetTool===tool);
  canvas.dataset.crochetTool=tool;
  updateCrochetStudioUI();
  render();
}

function selectedCrochetNode(){
  return currentCrochetChart()?.nodes?.find(n=>n.id===crochetSelectedId)??null;
}

function updateCrochetStudioUI(){
  for(const b of document.querySelectorAll('.crochet-symbol-button')){
    b.classList.toggle('active',b.dataset.stitch===crochetStitch);
  }
  if(!crochetSelectionInfo)return;
  const node=selectedCrochetNode();
  if(node){
    const symbol=CROCHET_SYMBOLS[node.type];
    crochetSelectionInfo.textContent=`${symbol?.label??node.type} · ${node.round?`vuelta ${node.round}`:'libre'} · rotación ${Math.round((node.rotation??0)*180/Math.PI)}°`;
  }else if(crochetConnectFrom){
    crochetSelectionInfo.textContent='Conectar: selecciona la puntada de destino.';
  }else{
    crochetSelectionInfo.textContent=`Herramienta: ${crochetTool} · puntada: ${CROCHET_SYMBOLS[crochetStitch]?.label??crochetStitch}`;
  }
}

function rotateSelectedCrochet(degrees){
  const node=selectedCrochetNode();if(!node)return;
  beginMutation('Rotar puntada');
  updateCrochetNode(currentCrochetChart(),node.id,{rotation:(node.rotation??0)+degrees*Math.PI/180});
  commitMutation();updateCrochetStudioUI();render();
}

function duplicateSelectedCrochet(){
  const node=selectedCrochetNode();if(!node)return;
  beginMutation('Duplicar puntada');
  const copy=addCrochetNode(currentCrochetChart(),{
    ...node,
    id:undefined,
    x:node.x+.35,
    y:node.y+.35,
    colorIndex:node.colorIndex
  });
  crochetSelectedId=copy.id;
  commitMutation();renderTechniqueControls();updateCrochetStudioUI();render();
}

function deleteSelectedCrochet(){
  if(!crochetSelectedId)return;
  beginMutation('Eliminar puntada');
  removeCrochetNode(currentCrochetChart(),crochetSelectedId);
  crochetSelectedId=null;crochetConnectFrom=null;
  commitMutation();renderTechniqueControls();updateCrochetStudioUI();render();
}

function eventToCrochetNode(e){
  const p=pointerToCanvas(e);
  return hitTestCrochetChart(lastCrochetProjection,p.x,p.y);
}

function eventToCrochetModel(e){
  const p=pointerToCanvas(e);
  return screenToCrochetModel(currentCrochetChart(),canvas.width,canvas.height,view,p.x,p.y);
}


function finishGesture(e){
  if(!gesture||gesture.pointerId!==e.pointerId)return;
  const painting=gesture.type==='paint'||gesture.type==='geometry-paint'||gesture.type==='crochet-drag';gesture=null;crochetDrag=null;lastPaintedCell=null;canvas.classList.remove('panning');
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  if(painting){commitMutation();renderTechniqueLegend();if(pattern.techniqueId==='crochet-round-chart'){renderTechniqueControls();updateCrochetStudioUI();}}
}

function paintStrokeTo(x,y){
  if(!lastPaintedCell){applyBrushAt(x,y);lastPaintedCell={x,y};render();return}
  for(const p of linePoints(lastPaintedCell.x,lastPaintedCell.y,x,y))applyBrushAt(p.x,p.y);
  lastPaintedCell={x,y};render();
}

function applyBrushAt(x,y){
  const erasing=activeTool==='eraser',size=erasing?eraserSize:brushSize,start=Math.floor((size-1)/2);
  fillRect(pattern.grid,x-start,y-start,size,size,erasing?0:activeColor);
}

function linePoints(x0,y0,x1,y1){
  const pts=[];let x=x0,y=y0,dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
  while(true){pts.push({x,y});if(x===x1&&y===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x+=sx}if(e2<=dx){err+=dx;y+=sy}}
  return pts;
}

function isStructuredCrochetTechnique(id){
  return id==='crochet-round-chart'||id==='amigurumi';
}

function hydrateCrochetOptions(){
  const params=pattern.crochet?.kind===pattern.techniqueId?(pattern.crochet.params||{}):{};
  if(pattern.techniqueId==='crochet-round-chart'){
    if(Number.isFinite(+params.rounds))renderOptions.radialRounds=+params.rounds;
    if(Number.isFinite(+params.startCount))renderOptions.radialStartCount=+params.startCount;
    if(Number.isFinite(+params.growth))renderOptions.radialGrowth=+params.growth;
    if(typeof params.stitchType==='string')renderOptions.radialStitch=params.stitchType;
    if(typeof params.direction==='string')renderOptions.radialDirection=params.direction;
    if(typeof pattern.crochet?.chart?.layout==='string')renderOptions.crochetLayout=pattern.crochet.chart.layout;
  }else if(pattern.techniqueId==='amigurumi'){
    if(typeof params.shape==='string')renderOptions.amigurumiShape=params.shape;
    if(Number.isFinite(+params.startCount))renderOptions.amigurumiStartCount=+params.startCount;
    if(Number.isFinite(+params.maxStitches))renderOptions.amigurumiMaxStitches=+params.maxStitches;
    if(Number.isFinite(+params.bodyRounds))renderOptions.amigurumiBodyRounds=+params.bodyRounds;
  }
}

function currentCrochetParams(){
  if(pattern.techniqueId==='crochet-round-chart'){
    return {
      rounds:renderOptions.radialRounds,
      startCount:renderOptions.radialStartCount,
      growth:renderOptions.radialGrowth,
      stitchType:renderOptions.radialStitch,
      direction:renderOptions.radialDirection,
      startMethod:'magic-ring',
      layout:renderOptions.crochetLayout
    };
  }
  if(pattern.techniqueId==='amigurumi'){
    return {
      shape:renderOptions.amigurumiShape,
      startCount:renderOptions.amigurumiStartCount,
      maxStitches:renderOptions.amigurumiMaxStitches,
      bodyRounds:renderOptions.amigurumiBodyRounds
    };
  }
  return {};
}

function ensureCrochetState(){
  if(!isStructuredCrochetTechnique(pattern.techniqueId))return;
  if(!pattern.crochet||pattern.crochet.kind!==pattern.techniqueId){
    pattern.crochet={kind:pattern.techniqueId,params:currentCrochetParams()};
  }else{
    pattern.crochet.params={...currentCrochetParams(),...(pattern.crochet.params||{})};
  }
  if(pattern.techniqueId==='crochet-round-chart'&&!pattern.crochet.chart){
    pattern.crochet.chart=generateCrochetTemplate({
      layout:renderOptions.crochetLayout,
      rounds:renderOptions.radialRounds,
      startCount:renderOptions.radialStartCount,
      growth:renderOptions.radialGrowth,
      stitchType:renderOptions.radialStitch,
      colorIndex:activeColor
    });
  }
}

function syncCrochetParams(){
  ensureCrochetState();
  if(pattern.crochet)pattern.crochet.params=currentCrochetParams();
}

function currentCrochetChart(){
  ensureCrochetState();
  return pattern.crochet?.chart??createCrochetChart({layout:renderOptions.crochetLayout});
}

function regenerateCrochetChartTemplate(label='Generar base'){
  beginMutation(label);
  ensureCrochetState();
  pattern.crochet.params=currentCrochetParams();
  pattern.crochet.chart=generateCrochetTemplate({
    layout:renderOptions.crochetLayout,
    rounds:renderOptions.radialRounds,
    startCount:renderOptions.radialStartCount,
    growth:renderOptions.radialGrowth,
    stitchType:renderOptions.radialStitch,
    colorIndex:activeColor
  });
  crochetSelectedId=null;
  crochetConnectFrom=null;
  commitMutation();
  renderTechniqueControls();
  render();
}

function applyCrochetText(text){
  const {chart,issues}=parseRoundText(text,{layout:renderOptions.crochetLayout});
  if(!chart.nodes.length)return issues.length?issues:['No se generaron puntadas.'];
  beginMutation('Aplicar patrón escrito');
  ensureCrochetState();
  pattern.crochet.chart=chart;
  pattern.crochet.chart.text=text;
  pattern.crochet.chart.textMode='manual';
  crochetSelectedId=null;
  crochetConnectFrom=null;
  commitMutation();
  renderTechniqueControls();
  render();
  return issues;
}

function currentCrochetData(){
  ensureCrochetState();
  const params=pattern.crochet?.params||currentCrochetParams();
  return pattern.techniqueId==='amigurumi'
    ? buildAmigurumi(params)
    : buildRadialCrochetChart(params);
}

function hydrateGeometryOptions(){
  const params=pattern.geometry?.kind===pattern.techniqueId?(pattern.geometry.params||{}):{};
  if(pattern.techniqueId==='peyote-star'){
    if(Number.isFinite(+params.arms))renderOptions.starArms=+params.arms;
    if(Number.isFinite(+params.levels))renderOptions.starLevels=+params.levels;
    if(Number.isFinite(+params.baseWidth))renderOptions.starBaseWidth=+params.baseWidth;
  }else if(pattern.techniqueId==='bead-rosette'){
    if(Number.isFinite(+params.rings))renderOptions.rosetteRings=+params.rings;
    if(Number.isFinite(+params.baseCount))renderOptions.rosetteBaseCount=+params.baseCount;
  }else if(pattern.techniqueId==='bead-crochet-rope'){
    if(typeof params.view==='string')renderOptions.ropeView=params.view;
    if(Number.isFinite(+params.rotation))renderOptions.ropeRotation=+params.rotation;
  }
}

function currentGeometryParams(){
  if(pattern.techniqueId==='peyote-star'){
    return {arms:renderOptions.starArms,levels:renderOptions.starLevels,baseWidth:renderOptions.starBaseWidth};
  }
  if(pattern.techniqueId==='bead-rosette'){
    return {rings:renderOptions.rosetteRings,baseCount:renderOptions.rosetteBaseCount};
  }
  if(pattern.techniqueId==='bead-crochet-rope'){
    return {circumference:pattern.grid.width,view:renderOptions.ropeView,rotation:renderOptions.ropeRotation};
  }
  return {};
}

function ensureGeometryState(){
  if(!isGeometryTechnique(pattern.techniqueId))return;
  if(!pattern.geometry||pattern.geometry.kind!==pattern.techniqueId){
    pattern.geometry={kind:pattern.techniqueId,params:currentGeometryParams(),colors:[]};
  }else{
    pattern.geometry.params={...currentGeometryParams(),...(pattern.geometry.params||{})};
    if(!Array.isArray(pattern.geometry.colors))pattern.geometry.colors=[];
  }
}

function syncGeometryParams(){
  ensureGeometryState();
  if(pattern.geometry)pattern.geometry.params=currentGeometryParams();
}

function currentGeometryLayout(){
  ensureGeometryState();
  return buildBeadLayout(pattern.techniqueId,pattern,pattern.geometry?.params||currentGeometryParams());
}

function geometryColorIndex(node){
  let raw;
  if(Number.isInteger(node.sourceIndex)){
    raw=pattern.grid.cells[node.sourceIndex]??node.defaultColorIndex??0;
  }else{
    const value=pattern.geometry?.colors?.[node.index];
    raw=Number.isInteger(value)?value:(node.defaultColorIndex??0);
  }
  const length=Math.max(1,pattern.palette.length);
  return ((raw%length)+length)%length;
}

function setGeometryNodeColor(node,value){
  if(Number.isInteger(node.sourceIndex)){
    pattern.grid.cells[node.sourceIndex]=value;
    return;
  }
  ensureGeometryState();
  pattern.geometry.colors[node.index]=value;
}

function paintGeometryNode(node){
  setGeometryNodeColor(node,activeTool==='eraser'?0:activeColor);
}

function eventToGeometryNode(e){
  const p=pointerToCanvas(e);
  return hitTestBeadLayout(lastGeometryProjection,p.x,p.y);
}

function setTool(tool){
  activeTool=tool;canvas.dataset.tool=tool;
  for(const b of document.querySelectorAll('.tool'))b.classList.toggle('active',b.dataset.tool===tool);
  updateStatus();
}

function beginMutation(label='Cambio'){if(!pendingMutation)pendingMutation={pattern:clone(pattern),label}}
function commitMutation(){
  if(!pendingMutation)return;
  const changed=JSON.stringify(pendingMutation.pattern)!==JSON.stringify(pattern);
  if(changed){undoStack.push(pendingMutation);if(undoStack.length>HISTORY_LIMIT)undoStack.shift();redoStack=[];touchPattern(pattern)}
  pendingMutation=null;savePattern();updateHistoryUI();updateStatus();
}
function undo(){if(!undoStack.length)return;const e=undoStack.pop();redoStack.push({pattern:clone(pattern),label:e.label});pattern=e.pattern;afterPatternRestore()}
function redo(){if(!redoStack.length)return;const e=redoStack.pop();undoStack.push({pattern:clone(pattern),label:e.label});pattern=e.pattern;afterPatternRestore()}
function undoSteps(n){for(let i=0;i<n&&undoStack.length;i++)undo()}
function afterPatternRestore(){
  technique.value=pattern.techniqueId;activeColor=Math.min(activeColor,pattern.palette.length-1);
  syncPaletteEditor();renderPalette();updateSourcePanelVisibility();renderTechniqueLegend();renderTechniqueControls();updateCrochetStudioUI();savePattern();updateHistoryUI();render();
}
function updateHistoryUI(){
  undoButton.disabled=!undoStack.length;redoButton.disabled=!redoStack.length;
  historyMetaEl.textContent=`${undoStack.length} cambios · ${redoStack.length} para rehacer`;
  historyEl.replaceChildren();
  undoStack.slice(-8).reverse().forEach((e,i)=>{const b=document.createElement('button');b.textContent=e.label;b.addEventListener('click',()=>undoSteps(i+1));historyEl.append(b)});
}

function renderPalette(){
  paletteEl.replaceChildren();
  pattern.palette.forEach((c,i)=>{
    const b=document.createElement('button');b.className=`swatch${i===activeColor?' active':''}`;b.style.background=`rgb(${c.rgb.join(',')})`;b.title=`${i+1}. ${c.name}`;
    b.addEventListener('click',()=>{activeColor=i;if(activeTool==='eraser')setTool('pencil');syncPaletteEditor();renderPalette();updateStatus()});
    paletteEl.append(b);
  });
}

function renderTechniqueLegend(){
  const counts=Array(pattern.palette.length).fill(0);
  if(pattern.techniqueId==='crochet-round-chart'){
    for(const node of currentCrochetChart().nodes){
      const i=Number.isInteger(node.colorIndex)?node.colorIndex:0;
      if(i>=0&&i<counts.length)counts[i]++;
    }
  }else if(isGeometryTechnique(pattern.techniqueId)){
    const layout=currentGeometryLayout();
    for(const node of layout.nodes){
      const i=geometryColorIndex(node);
      if(i>=0&&i<counts.length)counts[i]++;
    }
  }else{
    for(const i of pattern.grid.cells)if(i>=0&&i<counts.length)counts[i]++;
  }
  techniqueLegendEl.replaceChildren();
  pattern.palette.forEach((c,i)=>{
    const m=techniqueLegendMeta(pattern.techniqueId,i,renderOptions),row=document.createElement('div');
    row.className='legend-row';
    row.innerHTML=`<span class="legend-chip" style="background:rgb(${c.rgb.join(',')})"></span><span class="legend-symbol">${m.symbol}</span><span class="legend-details"><span>${c.name}</span><small>${m.catalog}</small></span><span class="legend-count">${counts[i]} ${m.unit}</span>`;
    techniqueLegendEl.append(row);
  });
}

function syncPaletteEditor(){paletteColorInput.value=rgbToHex(pattern.palette[activeColor]?.rgb??[0,0,0])}

function renderTechniqueControls(){
  techniqueOptionsEl.replaceChildren();
  const note=t=>{const d=document.createElement('div');d.className='technique-note';d.textContent=t;techniqueOptionsEl.append(d)};

  if(pattern.techniqueId==='crochet-round-chart'){
    hydrateCrochetOptions();
    const chart=currentCrochetChart();

    addCrochetLayoutControl();
    addTechniqueNumberControl('Vueltas de la plantilla','radialRounds',1,30,'crochet');
    addTechniqueNumberControl('Puntos iniciales','radialStartCount',1,80,'crochet');
    addTechniqueNumberControl('Crecimiento por vuelta','radialGrowth',0,40,'crochet');
    addTechniqueSelectControl('Puntada para generar','radialStitch',Object.values(CROCHET_SYMBOLS).filter(s=>!['ring','inc','dec'].includes(s.id)).map(s=>[s.id,s.label]),'crochet');
    addCrochetChartCheck('Ajustar a guías','snap');
    addCrochetOptionCheck('Mostrar guías','crochetShowGuides');
    addCrochetOptionCheck('Mostrar conexiones','crochetShowConnections');

    const actions=document.createElement('div');actions.className='crochet-text-actions';
    const generate=document.createElement('button');generate.className='primary';generate.textContent='Generar base';
    generate.addEventListener('click',()=>regenerateCrochetChartTemplate('Generar base crochet'));
    const blank=document.createElement('button');blank.textContent='Lienzo vacío';
    blank.addEventListener('click',()=>{
      beginMutation('Vaciar chart crochet');
      pattern.crochet.chart=createCrochetChart({layout:renderOptions.crochetLayout});
      crochetSelectedId=null;crochetConnectFrom=null;
      commitMutation();renderTechniqueControls();updateCrochetStudioUI();render();
    });
    actions.append(generate,blank);techniqueOptionsEl.append(actions);

    note('Dibuja directamente con Crochet Studio. Los parámetros de arriba sólo afectan la próxima base generada; tu edición manual no se reemplaza hasta pulsar Generar base.');
    renderCrochetChartSummary(chart);
    renderCrochetTextEditor(chart);
    renderCrochetParadePanel(currentCrochetData());
  }else if(pattern.techniqueId==='amigurumi'){
    hydrateCrochetOptions();
    addTechniqueSelectControl('Forma','amigurumiShape',[
      ['sphere','Esfera / cabeza'],
      ['cylinder','Cilindro / cuerpo'],
      ['cup','Copa abierta'],
      ['cone','Cono']
    ],'crochet');
    addTechniqueNumberControl('Puntos del anillo inicial','amigurumiStartCount',3,12,'crochet');
    addTechniqueNumberControl('Máximo de puntos','amigurumiMaxStitches',6,240,'crochet');
    addTechniqueNumberControl('Vueltas rectas','amigurumiBodyRounds',1,80,'crochet');
    const data=currentCrochetData();
    const issues=validateRoundSequence(data.rounds);
    note(issues.length?`Revisión: ${issues.join(' · ')}`:'Secuencia válida en el modelo actual. La imagen no controla la construcción.');
    renderCrochetRoundReport(data);
    renderCrochetParadePanel(data);
  }else if(isGeometryTechnique(pattern.techniqueId)){
    hydrateGeometryOptions();
    const profile=document.createElement('label');
    profile.innerHTML='Tipo de cuenta<select id="geometryBeadProfile"></select>';
    techniqueOptionsEl.append(profile);
    const select=profile.querySelector('select');
    for(const p of Object.values(BEAD_PROFILES)){const o=document.createElement('option');o.value=p.id;o.textContent=p.label;select.append(o)}
    select.value=renderOptions.beadProfile;
    select.addEventListener('change',e=>{renderOptions.beadProfile=e.target.value;saveViewOptions();renderTechniqueLegend();render()});
    addSelectControl('Acabado visual','beadRender',[['realistic','Realista'],['simple','Plano']]);
    addCheckControl('Mostrar orificio','beadHoles');
    addCheckControl('Mostrar recorrido del hilo','geometryShowPath');
    addCheckControl('Numerar cuentas','geometryShowNumbers');

    if(pattern.techniqueId==='peyote-star'){
      addGeometryNumberControl('Puntas','starArms',3,12);
      addGeometryNumberControl('Niveles por punta','starLevels',4,32);
      addGeometryNumberControl('Ancho en la base','starBaseWidth',3,18);
      note('Generador paramétrico inicial de estrella peyote. Puedes pintar cuentas directamente; el motor conserva colores y recorrido.');
    }else if(pattern.techniqueId==='bead-rosette'){
      addGeometryNumberControl('Anillos','rosetteRings',2,10);
      addGeometryNumberControl('Módulos base','rosetteBaseCount',4,16);
      note('Roseta radial con cuentas redondas, hoja y lágrima. El thread path es editable visualmente en próximas iteraciones.');
    }else if(pattern.techniqueId==='bead-crochet-rope'){
      addGeometrySelectControl('Vista','ropeView',[
        ['draft','Borrador'],
        ['corrected','Patrón de trabajo'],
        ['rope','Cuerda terminada']
      ]);
      addRopeCircumferenceControl();
      addGeometryNumberControl('Rotación / desplazamiento','ropeRotation',0,63);
      const repeat=detectLinearRepeat(pattern.grid);
      const runs=beadRunsForRepeat(pattern.grid,repeat).slice(0,12)
        .map(run=>`${run.count}× ${pattern.palette[run.colorIndex]?.name??('#'+run.colorIndex)}`)
        .join(' · ');
      note(repeat
        ? `Repetición detectada: ${repeat} cuentas. ${runs}${beadRunsForRepeat(pattern.grid,repeat).length>12?' …':''}`
        : 'Aún no hay una repetición útil. Diseña el borrador y OpenPattern calculará la secuencia de ensartado.');
    }else{
      note('Flat peyote usa el patrón actual, alterna columnas reales de peyote y conserva el orden de trabajo por filas.');
    }
  }else if(pattern.techniqueId==='bead-loom'){
    const profile=document.createElement('label');
    profile.innerHTML='Tipo de cuenta<select id="beadProfile"></select>';
    techniqueOptionsEl.append(profile);
    const select=profile.querySelector('select');
    for(const p of Object.values(BEAD_PROFILES)){const o=document.createElement('option');o.value=p.id;o.textContent=p.label;select.append(o)}
    select.value=renderOptions.beadProfile;
    select.addEventListener('change',e=>{renderOptions.beadProfile=e.target.value;saveViewOptions();renderTechniqueLegend();render()});
    addSelectControl('Acabado visual','beadRender',[['realistic','Realista'],['simple','Plano']]);
    addCheckControl('Mostrar orificio','beadHoles');
    addCheckControl('Letras/índices sobre cuentas','beadSymbols');
    note('La vista usa proporciones aproximadas del tipo de cuenta. Los códigos DB/TOHO reales llegarán con Materials Engine.');
  }else if(pattern.techniqueId==='cross-stitch'){
    addSelectControl('Vista','crossStyle',[['color-symbol','Color + símbolo'],['color','Cruces de color'],['symbol','Sólo símbolos']]);
    note('La leyenda asigna símbolos por color; DMC/Anchor llegará con Materials Engine.');
  }else if(pattern.techniqueId==='knitting-colorwork'){
    addSelectControl('Vista','knitStyle',[['color-v','Color + V'],['block','Bloque de color'],['symbol','Símbolo']]);
    note('Aumentos, disminuciones, cables y símbolos de puntada requieren Symbol Engine.');
  }else if(pattern.techniqueId==='c2c-crochet'){
    addCheckControl('Mostrar diagonal del bloque','c2cDiagonal');
    note('La lectura diagonal y los conteos por color llegarán con Sequence Engine.');
  }else{
    note('Esta técnica usa el Grid Engine base. Las instrucciones y símbolos específicos llegarán con Sequence/Symbol Engine.');
  }
}

function addCrochetLayoutControl(){
  const l=document.createElement('label'),s=document.createElement('select');
  l.append(document.createTextNode('Tipo de chart'),s);
  for(const [value,label] of [['radial','Circular / radial'],['square','Granny / cuadrado'],['freeform','Libre']]){
    const o=document.createElement('option');o.value=value;o.textContent=label;s.append(o);
  }
  s.value=currentCrochetChart().layout??renderOptions.crochetLayout;
  s.addEventListener('change',()=>{
    beginMutation('Cambiar layout crochet');
    renderOptions.crochetLayout=s.value;
    currentCrochetChart().layout=s.value;
    pattern.crochet.params=currentCrochetParams();
    commitMutation();saveViewOptions();renderTechniqueControls();render();
  });
  techniqueOptionsEl.append(l);
}

function addCrochetChartCheck(label,key){
  const l=document.createElement('label');l.className='check';
  const i=document.createElement('input');i.type='checkbox';i.checked=currentCrochetChart().guides?.[key]!==false;
  l.append(i,document.createTextNode(label));
  i.addEventListener('change',()=>{
    beginMutation('Ajustar chart crochet');
    currentCrochetChart().guides[key]=i.checked;
    commitMutation();render();
  });
  techniqueOptionsEl.append(l);
}

function addCrochetOptionCheck(label,key){
  const l=document.createElement('label');l.className='check';
  const i=document.createElement('input');i.type='checkbox';i.checked=renderOptions[key]!==false;
  l.append(i,document.createTextNode(label));
  i.addEventListener('change',()=>{renderOptions[key]=i.checked;saveViewOptions();render()});
  techniqueOptionsEl.append(l);
}

function renderCrochetChartSummary(chart){
  const summary=summarizeCrochetChart(chart);
  const box=document.createElement('div');box.className='crochet-summary';
  for(const [value,label] of [[summary.stitches,'puntadas'],[summary.rounds,'vueltas'],[summary.connections,'conexiones']]){
    const cell=document.createElement('div'),strong=document.createElement('strong'),span=document.createElement('span');
    strong.textContent=String(value);span.textContent=label;cell.append(strong,span);box.append(cell);
  }
  techniqueOptionsEl.append(box);
}

function renderCrochetTextEditor(chart){
  const title=document.createElement('div');title.className='section-title sub';title.textContent='Patrón escrito ↔ dibujo';
  const textarea=document.createElement('textarea');textarea.className='crochet-textarea';
  textarea.value=chart.textMode==='manual'&&chart.text?chart.text:chartToRoundText(chart);
  textarea.placeholder='Ejemplo:\nR1: 6 sc\nR2: 12 dc\nR3: 18 ch';

  const actions=document.createElement('div');actions.className='crochet-text-actions';
  const apply=document.createElement('button');apply.className='primary';apply.textContent='Aplicar texto al chart';
  const fromDrawing=document.createElement('button');fromDrawing.textContent='Texto desde dibujo';
  const issues=document.createElement('div');issues.className='microcopy';

  apply.addEventListener('click',()=>{
    const found=applyCrochetText(textarea.value);
    issues.textContent=found.length?found.join(' · '):'Texto aplicado al chart.';
  });
  fromDrawing.addEventListener('click',()=>{
    beginMutation('Sincronizar texto');
    const next=chartToRoundText(currentCrochetChart());
    currentCrochetChart().text=next;
    currentCrochetChart().textMode='generated';
    commitMutation();
    textarea.value=next;
    issues.textContent='Texto regenerado desde el dibujo.';
  });

  actions.append(apply,fromDrawing);
  techniqueOptionsEl.append(title,textarea,actions,issues);
}

function addTechniqueNumberControl(label,key,min,max,engine){
  const l=document.createElement('label'),i=document.createElement('input');
  i.type='number';i.min=String(min);i.max=String(max);i.value=String(renderOptions[key]);
  l.append(document.createTextNode(label),i);
  i.addEventListener('change',()=>{
    const next=Math.max(min,Math.min(max,Math.round(+i.value||renderOptions[key])));
    beginMutation('Ajustar técnica');
    renderOptions[key]=next;i.value=String(next);
    if(engine==='crochet')syncCrochetParams();
    commitMutation();saveViewOptions();renderTechniqueControls();renderTechniqueLegend();render();
  });
  techniqueOptionsEl.append(l);
}

function addTechniqueSelectControl(label,key,items,engine){
  const l=document.createElement('label'),s=document.createElement('select');
  l.append(document.createTextNode(label),s);
  for(const [v,t] of items){const o=document.createElement('option');o.value=v;o.textContent=t;s.append(o)}
  s.value=renderOptions[key];
  s.addEventListener('change',()=>{
    beginMutation('Ajustar técnica');
    renderOptions[key]=s.value;
    if(engine==='crochet')syncCrochetParams();
    commitMutation();saveViewOptions();renderTechniqueControls();renderTechniqueLegend();render();
  });
  techniqueOptionsEl.append(l);
}

function renderCrochetRoundReport(data){
  const box=document.createElement('div');box.className='round-report';
  const rounds=(data.rounds??[]).slice(0,16);
  for(const r of rounds){
    const row=document.createElement('div');row.className='round-report-row';
    const left=document.createElement('strong');left.textContent=`R${r.round}`;
    const right=document.createElement('span');right.textContent=r.instruction??`${r.count} sts`;
    row.append(left,right);box.append(row);
  }
  if((data.rounds?.length??0)>16){
    const more=document.createElement('div');more.className='microcopy';more.textContent=`… ${data.rounds.length-16} vueltas más`;box.append(more);
  }
  techniqueOptionsEl.append(box);
}

function renderCrochetParadePanel(data){
  const wrap=document.createElement('div');wrap.className='crochetparade-panel';
  const title=document.createElement('strong');title.textContent='CrochetPARADE';
  const hint=document.createElement('div');hint.className='microcopy';hint.textContent='Salida formal para el motor de parser, grafo y chart.';
  const pre=document.createElement('pre');pre.className='dsl-preview';pre.textContent=toCrochetParadeDsl(data);
  const copy=document.createElement('button');copy.textContent='Copiar patrón CrochetPARADE';
  copy.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(pre.textContent);
      copy.textContent='Copiado';
      setTimeout(()=>copy.textContent='Copiar patrón CrochetPARADE',1200);
    }catch{
      copy.textContent='No se pudo copiar';
    }
  });
  wrap.append(title,hint,pre,copy);
  techniqueOptionsEl.append(wrap);
}

function addSelectControl(label,key,items){
  const l=document.createElement('label'),s=document.createElement('select');
  l.append(document.createTextNode(label),s);
  for(const [v,t] of items){const o=document.createElement('option');o.value=v;o.textContent=t;s.append(o)}
  s.value=renderOptions[key];
  s.addEventListener('change',e=>{renderOptions[key]=e.target.value;saveViewOptions();renderTechniqueLegend();render()});
  techniqueOptionsEl.append(l);
}

function addCheckControl(label,key){
  const l=document.createElement('label');l.className='check';
  const i=document.createElement('input');i.type='checkbox';i.checked=renderOptions[key]!==false;
  l.append(i,document.createTextNode(label));
  i.addEventListener('change',()=>{renderOptions[key]=i.checked;saveViewOptions();render()});
  techniqueOptionsEl.append(l);
}

function addGeometryNumberControl(label,key,min,max){
  const l=document.createElement('label'),i=document.createElement('input');
  i.type='number';i.min=String(min);i.max=String(max);i.value=String(renderOptions[key]);
  l.append(document.createTextNode(label),i);
  i.addEventListener('change',()=>{
    const next=Math.max(min,Math.min(max,Math.round(+i.value||renderOptions[key])));
    beginMutation('Ajustar geometría');
    renderOptions[key]=next;i.value=String(next);syncGeometryParams();
    commitMutation();saveViewOptions();renderTechniqueLegend();render();
  });
  techniqueOptionsEl.append(l);
}

function addGeometrySelectControl(label,key,items){
  const l=document.createElement('label'),s=document.createElement('select');
  l.append(document.createTextNode(label),s);
  for(const [value,text] of items){
    const o=document.createElement('option');o.value=value;o.textContent=text;s.append(o);
  }
  s.value=renderOptions[key];
  s.addEventListener('change',()=>{
    beginMutation('Ajustar geometría');
    renderOptions[key]=s.value;syncGeometryParams();
    commitMutation();saveViewOptions();renderTechniqueLegend();render();
  });
  techniqueOptionsEl.append(l);
}

function addRopeCircumferenceControl(){
  const l=document.createElement('label'),i=document.createElement('input');
  i.type='number';i.min='3';i.max='64';i.value=String(pattern.grid.width);
  l.append(document.createTextNode('Circunferencia (cuentas)'),i);
  i.addEventListener('change',()=>{
    const width=Math.max(3,Math.min(64,Math.round(+i.value||pattern.grid.width)));
    resizeRopeCircumference(width);
    i.value=String(pattern.grid.width);
  });
  techniqueOptionsEl.append(l);
}

function resizeRopeCircumference(width){
  if(width===pattern.grid.width)return;
  beginMutation('Cambiar circunferencia');
  const cells=pattern.grid.cells.slice();
  const height=Math.max(1,Math.ceil(cells.length/width));
  const next=Array(width*height).fill(0);
  for(let i=0;i<Math.min(cells.length,next.length);i++)next[i]=cells[i];
  pattern.grid={width,height,cells:next};
  syncGeometryParams();
  commitMutation();renderTechniqueLegend();renderTechniqueControls();render();
}

function getBaseCell(){
  const pad=70;
  return Math.max(1,Math.min((canvas.width-pad*2)/pattern.grid.width,(canvas.height-pad*2)/pattern.grid.height));
}
function getLayout(){
  const cell=getBaseCell()*view.zoom,drawWidth=cell*pattern.grid.width,drawHeight=cell*pattern.grid.height;
  return{cell,offsetX:(canvas.width-drawWidth)/2+view.panX,offsetY:(canvas.height-drawHeight)/2+view.panY,drawWidth,drawHeight};
}

function geometryRenderOptions(){
  ensureGeometryState();
  return {...renderOptions,geometryColors:pattern.geometry?.colors||[]};
}

function renderGeometryCanvas(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#f7f7f5';ctx.fillRect(0,0,canvas.width,canvas.height);
  const layout=currentGeometryLayout();
  lastGeometryProjection=drawBeadLayout(ctx,layout,pattern.palette,geometryRenderOptions(),view);
  updateStatus();renderPatternViewer();updateProjectMeta();
}

function renderCrochetCanvas(){
  lastGeometryProjection=[];
  if(pattern.techniqueId==='crochet-round-chart'){
    lastCrochetProjection=drawCrochetChart(ctx,currentCrochetChart(),{...renderOptions,palette:pattern.palette},view,{selectedId:crochetSelectedId,connectFrom:crochetConnectFrom});
  }else{
    lastCrochetProjection=[];
    drawCrochetTechnique(ctx,pattern.techniqueId,currentCrochetData(),renderOptions,view);
  }
  updateStatus();renderPatternViewer();updateProjectMeta();
}

function render(){
  if(isStructuredCrochetTechnique(pattern.techniqueId)){renderCrochetCanvas();return}
  if(isGeometryTechnique(pattern.techniqueId)){renderGeometryCanvas();return}
  lastGeometryProjection=[];
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f7f7f5';ctx.fillRect(0,0,canvas.width,canvas.height);
  const L=getLayout(),sx=clamp(Math.floor(-L.offsetX/L.cell),0,pattern.grid.width),sy=clamp(Math.floor(-L.offsetY/L.cell),0,pattern.grid.height),ex=clamp(Math.ceil((canvas.width-L.offsetX)/L.cell),0,pattern.grid.width),ey=clamp(Math.ceil((canvas.height-L.offsetY)/L.cell),0,pattern.grid.height);
  ctx.fillStyle='#fff';ctx.fillRect(L.offsetX,L.offsetY,L.drawWidth,L.drawHeight);

  for(let y=sy;y<ey;y++)for(let x=sx;x<ex;x++){
    const pi=pattern.grid.cells[y*pattern.grid.width+x],c=pattern.palette[pi]?.rgb??[255,0,255];
    drawTechniqueCell(ctx,pattern.techniqueId,{x:L.offsetX+x*L.cell,y:L.offsetY+y*L.cell,width:L.cell,height:L.cell},c,pi,renderOptions);
  }

  if(L.cell>=7&&pattern.techniqueId!=='bead-loom')drawGrid(L,sx,sy,ex,ey);
  drawGuides(L);drawTracker(L);drawCoordinates(L);
  ctx.strokeStyle='rgba(0,0,0,.32)';ctx.strokeRect(L.offsetX+.5,L.offsetY+.5,L.drawWidth,L.drawHeight);
  updateStatus();renderPatternViewer();updateProjectMeta();
}

function drawGrid(L,sx,sy,ex,ey){
  ctx.strokeStyle=L.cell>=18?'rgba(0,0,0,.14)':'rgba(0,0,0,.07)';ctx.lineWidth=1;ctx.beginPath();
  for(let x=sx;x<=ex;x++){const px=Math.round(L.offsetX+x*L.cell)+.5;ctx.moveTo(px,L.offsetY+sy*L.cell);ctx.lineTo(px,L.offsetY+ey*L.cell)}
  for(let y=sy;y<=ey;y++){const py=Math.round(L.offsetY+y*L.cell)+.5;ctx.moveTo(L.offsetX+sx*L.cell,py);ctx.lineTo(L.offsetX+ex*L.cell,py)}
  ctx.stroke();
}

function drawGuides(L){
  if(!renderOptions.showGuides)return;
  const n=Math.max(2,renderOptions.guideSpacing);ctx.strokeStyle='rgba(40,75,120,.35)';ctx.lineWidth=1.5;ctx.beginPath();
  for(let x=n;x<pattern.grid.width;x+=n){const px=L.offsetX+x*L.cell;ctx.moveTo(px,L.offsetY);ctx.lineTo(px,L.offsetY+L.drawHeight)}
  for(let y=n;y<pattern.grid.height;y+=n){const py=L.offsetY+y*L.cell;ctx.moveTo(L.offsetX,py);ctx.lineTo(L.offsetX+L.drawWidth,py)}
  ctx.stroke();
}

function drawCoordinates(L){
  if(!renderOptions.showCoordinates||L.cell<5)return;
  const n=Math.max(2,renderOptions.guideSpacing);ctx.fillStyle='#666';ctx.font='11px system-ui';ctx.textAlign='center';ctx.textBaseline='bottom';
  for(let x=0;x<pattern.grid.width;x+=n)ctx.fillText(String(x+1),L.offsetX+(x+.5)*L.cell,L.offsetY-5);
  ctx.textAlign='right';ctx.textBaseline='middle';
  for(let y=0;y<pattern.grid.height;y+=n)ctx.fillText(String(y+1),L.offsetX-6,L.offsetY+(y+.5)*L.cell);
}

function drawTracker(L){
  if(!renderOptions.trackMode){$('#trackLabel').textContent='Fila 1';return}
  renderOptions.trackIndex=clamp(renderOptions.trackIndex,0,pattern.grid.height-1);
  const y=L.offsetY+renderOptions.trackIndex*L.cell;
  ctx.fillStyle='rgba(255,210,60,.18)';ctx.fillRect(L.offsetX,y,L.drawWidth,L.cell);
  ctx.strokeStyle='rgba(200,145,0,.7)';ctx.lineWidth=2;ctx.strokeRect(L.offsetX,y,L.drawWidth,L.cell);
  $('#trackLabel').textContent=`Fila ${renderOptions.trackIndex+1}/${pattern.grid.height}`;
}

function renderPatternViewer(){
  viewerCtx.clearRect(0,0,patternViewer.width,patternViewer.height);
  viewerCtx.fillStyle='#fff';viewerCtx.fillRect(0,0,patternViewer.width,patternViewer.height);

  if(pattern.techniqueId==='crochet-round-chart'){
    drawCrochetChart(viewerCtx,currentCrochetChart(),{...renderOptions,palette:pattern.palette},{zoom:1,panX:0,panY:0},{});
    return;
  }
  if(pattern.techniqueId==='amigurumi'){
    drawCrochetTechnique(viewerCtx,pattern.techniqueId,currentCrochetData(),renderOptions,{zoom:1,panX:0,panY:0});
    return;
  }

  if(isGeometryTechnique(pattern.techniqueId)){
    drawBeadLayout(viewerCtx,currentGeometryLayout(),pattern.palette,{...geometryRenderOptions(),geometryShowNumbers:false},{zoom:1,panX:0,panY:0});
    return;
  }

  const pad=8,cell=Math.min((patternViewer.width-pad*2)/pattern.grid.width,(patternViewer.height-pad*2)/pattern.grid.height);
  const ox=(patternViewer.width-cell*pattern.grid.width)/2,oy=(patternViewer.height-cell*pattern.grid.height)/2;
  for(let y=0;y<pattern.grid.height;y++)for(let x=0;x<pattern.grid.width;x++){
    const c=pattern.palette[pattern.grid.cells[y*pattern.grid.width+x]]?.rgb??[255,0,255];
    viewerCtx.fillStyle=`rgb(${c.join(',')})`;
    viewerCtx.fillRect(ox+x*cell,oy+y*cell,Math.ceil(cell),Math.ceil(cell));
  }
  viewerCtx.strokeStyle='rgba(0,0,0,.35)';
  viewerCtx.strokeRect(ox+.5,oy+.5,cell*pattern.grid.width,cell*pattern.grid.height);
}

function updateProjectMeta(){
  if(pattern.techniqueId==='crochet-round-chart'){
    const summary=summarizeCrochetChart(currentCrochetChart());
    const layout={radial:'radial',square:'granny/cuadrado',freeform:'libre'}[currentCrochetChart().layout]??currentCrochetChart().layout;
    projectMetaEl.textContent=`${summary.stitches} puntadas · ${summary.rounds} vueltas · ${summary.connections} conexiones · ${layout}`;
    return;
  }
  if(pattern.techniqueId==='amigurumi'){
    const data=currentCrochetData();
    projectMetaEl.textContent=`${data.shape} · ${data.rounds.length} vueltas · ${data.meta.totalStitches.toLocaleString()} puntadas estimadas`;
    return;
  }
  if(isGeometryTechnique(pattern.techniqueId)){
    const layout=currentGeometryLayout();
    const profile=BEAD_PROFILES[renderOptions.beadProfile]??BEAD_PROFILES.delica11;
    const label=pattern.techniqueId==='peyote-star'?'Peyote star':pattern.techniqueId==='bead-rosette'?'Roseta / mandala':'Peyote flat';
    projectMetaEl.textContent=`${layout.nodes.length.toLocaleString()} cuentas · ${label} · ${profile.label}`;
    return;
  }
  const s=estimateTechniqueSize(pattern.techniqueId,pattern.grid,renderOptions);
  projectMetaEl.textContent=s
    ? `${pattern.grid.width}×${pattern.grid.height} cuentas · aprox. ${s.widthMm.toFixed(1)} × ${s.heightMm.toFixed(1)} mm · ${s.label}`
    : `${pattern.grid.width}×${pattern.grid.height} · ${pattern.grid.cells.length.toLocaleString()} celdas`;
}

function eventToCell(e){
  const p=pointerToCanvas(e),L=getLayout(),x=Math.floor((p.x-L.offsetX)/L.cell),y=Math.floor((p.y-L.offsetY)/L.cell);
  return x>=0&&y>=0&&x<pattern.grid.width&&y<pattern.grid.height?{x,y}:null;
}
function pointerToCanvas(e){
  const r=canvas.getBoundingClientRect();
  return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};
}
function updateStatus(){
  const names={pencil:'Pincel',eraser:'Borrador',fill:'Relleno',pan:'Mover'};
  const size=activeTool==='pencil'?` · ${brushSize}×${brushSize}`:activeTool==='eraser'?` · ${eraserSize}×${eraserSize}`:'';
  const base=pattern.techniqueId==='crochet-round-chart'
    ? `${currentCrochetChart().nodes.length} puntadas · ${crochetTool}`
    : (pattern.techniqueId==='amigurumi'
      ? `${currentCrochetData().rounds.length} vueltas`
      : (isGeometryTechnique(pattern.techniqueId)
        ? `${currentGeometryLayout().nodes.length} cuentas`
        : `${pattern.grid.width}×${pattern.grid.height}`));
  statusEl.textContent=`${base} · ${pattern.palette.length} colores · ${names[activeTool]}${size} · ${Math.round(view.zoom*100)}%${statusEl.dataset.pointer?' · '+statusEl.dataset.pointer:''}`;
  $('#resetView').textContent=`${Math.round(view.zoom*100)}%`;
}
function savePattern(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(pattern));saveStatusEl.textContent='Guardado local'}catch{saveStatusEl.textContent='No se pudo guardar'}}
function loadPattern(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return null;const p=JSON.parse(raw);return validatePattern(p).length?null:p}catch{return null}}
function loadViewOptions(){try{return{...defaults(),...JSON.parse(localStorage.getItem(VIEW_KEY)||'{}')}}catch{return defaults()}}
function saveViewOptions(){localStorage.setItem(VIEW_KEY,JSON.stringify(renderOptions))}
function defaults(){return{showGuides:true,guideSpacing:10,showCoordinates:true,trackMode:false,trackIndex:0,beadProfile:'delica11',beadRender:'realistic',beadHoles:true,beadSymbols:false,crossStyle:'color-symbol',knitStyle:'color-v',c2cDiagonal:true,geometryShowPath:true,geometryShowNumbers:false,starArms:5,starLevels:13,starBaseWidth:9,rosetteRings:5,rosetteBaseCount:6,ropeView:'draft',ropeRotation:0,radialRounds:6,radialStartCount:6,radialGrowth:6,radialStitch:'sc',radialDirection:'cw',radialRotateSymbols:true,crochetLayout:'radial',crochetShowGuides:true,crochetShowConnections:true,crochetGuideSpokes:8,amigurumiShape:'sphere',amigurumiStartCount:6,amigurumiMaxStitches:36,amigurumiBodyRounds:8}}
function clone(v){return JSON.parse(JSON.stringify(v))}
function hexToRgb(hex){const v=hex.replace('#','');return[parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16)]}
function rgbToHex([r,g,b]){return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function safeName(v){return(v||'pattern').toLowerCase().replace(/[^a-z0-9-_]+/gi,'-').replace(/^-+|-+$/g,'')||'pattern'}

canvas.dataset.tool=activeTool;
brushSizeValue.value='1×1';eraserSizeValue.value='1×1';
syncConversionLabels();syncPaletteEditor();renderPalette();updateSourcePanelVisibility();if(rightPanel)rightPanel.scrollTop=0;renderTechniqueControls();renderTechniqueLegend();updateHistoryUI();render();savePattern();
