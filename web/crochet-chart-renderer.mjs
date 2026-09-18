import { CROCHET_SYMBOLS } from '../src/crochet/chart-model.mjs';

export function projectCrochetChart(chart,width,height,view={zoom:1,panX:0,panY:0},padding=70){
  const bounds=boundsFor(chart.nodes);
  const spanX=Math.max(2,bounds.maxX-bounds.minX);
  const spanY=Math.max(2,bounds.maxY-bounds.minY);
  const scale=Math.min((width-padding*2)/spanX,(height-padding*2)/spanY)*(view.zoom??1);
  const cx=(bounds.minX+bounds.maxX)/2;
  const cy=(bounds.minY+bounds.maxY)/2;
  const ox=width/2+(view.panX??0),oy=height/2+(view.panY??0);
  return chart.nodes.map(n=>({...n,sx:ox+(n.x-cx)*scale,sy:oy+(n.y-cy)*scale,screenScale:scale,hitRadius:Math.max(9,18*(n.scale??1))}));
}

export function drawCrochetChart(ctx,chart,options={},view={zoom:1,panX:0,panY:0},state={}){
  clear(ctx);
  const projected=projectCrochetChart(chart,ctx.canvas.width,ctx.canvas.height,view);
  const byId=new Map(projected.map(n=>[n.id,n]));
  const transform=chartTransform(chart,ctx.canvas.width,ctx.canvas.height,view);

  if(chart.guides?.show!==false && options.crochetShowGuides!==false){
    drawGuides(ctx,chart,transform,options);
  }

  if(options.crochetShowConnections!==false){
    ctx.save();
    ctx.lineWidth=1.2;
    ctx.strokeStyle='rgba(35,35,35,.28)';
    ctx.lineCap='round';
    for(const edge of chart.edges){
      const a=byId.get(edge.from),b=byId.get(edge.to);
      if(!a||!b)continue;
      ctx.beginPath();
      ctx.moveTo(a.sx,a.sy);
      if(edge.kind==='round' && chart.layout==='radial'){
        const mx=(a.sx+b.sx)/2,my=(a.sy+b.sy)/2;
        ctx.quadraticCurveTo(mx,my,b.sx,b.sy);
      }else{
        ctx.lineTo(b.sx,b.sy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  for(const node of projected){
    const color=resolveColor(node,options.palette);
    const selected=state.selectedId===node.id;
    drawStitchSymbol(ctx,node,color,selected,options);
  }

  if(state.connectFrom){
    const node=byId.get(state.connectFrom);
    if(node){
      ctx.save();
      ctx.strokeStyle='#111';ctx.setLineDash([5,4]);ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(node.sx,node.sy,node.hitRadius+5,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }

  return projected;
}

export function hitTestCrochetChart(projected,x,y){
  let best=null,dist=Infinity;
  for(const n of projected){
    const d=Math.hypot(x-n.sx,y-n.sy);
    if(d<=n.hitRadius && d<dist){best=n;dist=d}
  }
  return best;
}

export function screenToCrochetModel(chart,width,height,view,screenX,screenY){
  const t=chartTransform(chart,width,height,view);
  return {x:(screenX-t.ox)/t.scale+t.cx,y:(screenY-t.oy)/t.scale+t.cy};
}

export function drawStitchSample(ctx,type,x,y,size=28,color='#222'){
  drawStitchSymbol(ctx,{type,sx:x,sy:y,rotation:0,scale:1,screenScale:size},color,false,{symbolSize:size});
}

function drawGuides(ctx,chart,t,options){
  const rounds=[...new Set(chart.nodes.map(n=>n.round).filter(Number.isInteger))];
  const maxRound=Math.max(1,...rounds,options.crochetGuideRounds??1);
  ctx.save();
  ctx.strokeStyle='rgba(45,80,110,.16)';
  ctx.lineWidth=1;
  if(chart.layout==='radial'){
    for(let r=1;r<=maxRound;r++){
      ctx.beginPath();ctx.arc(t.ox,t.oy,r*t.scale,0,Math.PI*2);ctx.stroke();
    }
    const spokes=Math.max(4,options.crochetGuideSpokes??8);
    for(let i=0;i<spokes;i++){
      const a=i/spokes*Math.PI*2;
      ctx.beginPath();ctx.moveTo(t.ox,t.oy);ctx.lineTo(t.ox+Math.cos(a)*maxRound*t.scale,t.oy+Math.sin(a)*maxRound*t.scale);ctx.stroke();
    }
  }else if(chart.layout==='square'){
    for(let r=1;r<=maxRound;r++)ctx.strokeRect(t.ox-r*t.scale,t.oy-r*t.scale,2*r*t.scale,2*r*t.scale);
    ctx.beginPath();ctx.moveTo(t.ox-maxRound*t.scale,t.oy);ctx.lineTo(t.ox+maxRound*t.scale,t.oy);
    ctx.moveTo(t.ox,t.oy-maxRound*t.scale);ctx.lineTo(t.ox,t.oy+maxRound*t.scale);ctx.stroke();
  }else{
    const step=t.scale;
    ctx.strokeStyle='rgba(45,80,110,.08)';
    for(let x=t.ox%step;x<ctx.canvas.width;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,ctx.canvas.height);ctx.stroke()}
    for(let y=t.oy%step;y<ctx.canvas.height;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(ctx.canvas.width,y);ctx.stroke()}
  }
  ctx.restore();
}

function drawStitchSymbol(ctx,node,color,selected,options){
  const type=node.type??'sc';
  const base=options.symbolSize??Math.max(13,Math.min(34,node.screenScale*.5));
  const size=base*(node.scale??1);
  ctx.save();
  ctx.translate(node.sx,node.sy);
  ctx.rotate(node.rotation??0);
  ctx.strokeStyle=color;
  ctx.fillStyle=color;
  ctx.lineWidth=Math.max(1.3,size*.075);
  ctx.lineCap='round';
  ctx.lineJoin='round';

  if(type==='ring'){
    ctx.beginPath();ctx.arc(0,0,size*.36,0,Math.PI*2);ctx.stroke();
  }else if(type==='ch'){
    ctx.beginPath();ctx.ellipse(0,0,size*.38,size*.19,0,0,Math.PI*2);ctx.stroke();
  }else if(type==='slst'){
    ctx.beginPath();ctx.arc(0,0,size*.12,0,Math.PI*2);ctx.fill();
  }else if(type==='sc'){
    cross(ctx,size*.28);
  }else if(type==='hdc'){
    tall(ctx,size,0);
  }else if(type==='dc'){
    tall(ctx,size,1);
  }else if(type==='tr'){
    tall(ctx,size,2);
  }else if(type==='dtr'){
    tall(ctx,size,3);
  }else if(type==='inc'){
    tallPair(ctx,size,false);
  }else if(type==='dec'){
    tallPair(ctx,size,true);
  }else if(type==='vst'){
    vStitch(ctx,size);
  }else if(type==='shell'){
    fan(ctx,size,5);
  }else if(type==='cluster'){
    fan(ctx,size,3,true);
  }else if(type==='puff'){
    puff(ctx,size,4);
  }else if(type==='popcorn'){
    puff(ctx,size,5);
  }else if(type==='picot'){
    picot(ctx,size);
  }else{
    cross(ctx,size*.28);
  }

  if(selected){
    ctx.rotate(-(node.rotation??0));
    ctx.strokeStyle='#1769ff';ctx.lineWidth=2;ctx.setLineDash([4,3]);
    ctx.strokeRect(-size*.65,-size*.65,size*1.3,size*1.3);
  }
  ctx.restore();
}

function tall(ctx,size,slashes){
  const h=size*.72;
  ctx.beginPath();ctx.moveTo(0,-h/2);ctx.lineTo(0,h/2);
  ctx.moveTo(-size*.24,-h/2);ctx.lineTo(size*.24,-h/2);ctx.stroke();
  for(let i=0;i<slashes;i++){
    const y=-size*.08+i*size*.15;
    ctx.beginPath();ctx.moveTo(-size*.18,y+size*.1);ctx.lineTo(size*.18,y-size*.1);ctx.stroke();
  }
}

function tallPair(ctx,size,closing){
  ctx.beginPath();
  ctx.moveTo(-size*.25,size*.34);ctx.lineTo(closing?0:-size*.25,-size*.34);
  ctx.moveTo(size*.25,size*.34);ctx.lineTo(closing?0:size*.25,-size*.34);
  ctx.moveTo(-size*.45,-size*.34);ctx.lineTo(size*.45,-size*.34);
  ctx.stroke();
}

function vStitch(ctx,size){
  ctx.beginPath();ctx.moveTo(0,size*.36);ctx.lineTo(-size*.32,-size*.34);ctx.moveTo(0,size*.36);ctx.lineTo(size*.32,-size*.34);
  ctx.moveTo(-size*.46,-size*.34);ctx.lineTo(-size*.18,-size*.34);ctx.moveTo(size*.18,-size*.34);ctx.lineTo(size*.46,-size*.34);ctx.stroke();
}

function fan(ctx,size,count,closeTop=false){
  for(let i=0;i<count;i++){
    const t=count===1?.5:i/(count-1);
    const x=(t-.5)*size*.85;
    ctx.beginPath();ctx.moveTo(0,size*.34);ctx.lineTo(x,-size*.34);ctx.stroke();
  }
  if(closeTop){ctx.beginPath();ctx.arc(0,-size*.34,size*.34,Math.PI,0);ctx.stroke()}
}

function puff(ctx,size,count){
  for(let i=0;i<count;i++){
    const t=count===1?.5:i/(count-1);
    const x=(t-.5)*size*.48;
    ctx.beginPath();ctx.moveTo(0,size*.34);ctx.quadraticCurveTo(x*1.6,0,x,-size*.28);ctx.quadraticCurveTo(x*.4,-size*.4,0,size*.34);ctx.stroke();
  }
}

function picot(ctx,size){
  ctx.beginPath();ctx.moveTo(-size*.34,size*.12);ctx.lineTo(0,-size*.34);ctx.lineTo(size*.34,size*.12);ctx.stroke();
  ctx.beginPath();ctx.ellipse(0,-size*.38,size*.16,size*.08,0,0,Math.PI*2);ctx.stroke();
}

function cross(ctx,d){ctx.beginPath();ctx.moveTo(-d,-d);ctx.lineTo(d,d);ctx.moveTo(d,-d);ctx.lineTo(-d,d);ctx.stroke()}

function resolveColor(node,palette){
  const rgb=palette?.[node.colorIndex]?.rgb;
  return rgb?`rgb(${rgb.join(',')})`:'#202020';
}

function chartTransform(chart,width,height,view){
  const bounds=boundsFor(chart.nodes);
  const spanX=Math.max(2,bounds.maxX-bounds.minX);
  const spanY=Math.max(2,bounds.maxY-bounds.minY);
  const scale=Math.min((width-140)/spanX,(height-140)/spanY)*(view?.zoom??1);
  return {
    scale,
    cx:(bounds.minX+bounds.maxX)/2,
    cy:(bounds.minY+bounds.maxY)/2,
    ox:width/2+(view?.panX??0),
    oy:height/2+(view?.panY??0)
  };
}

function boundsFor(nodes){
  if(!nodes?.length)return{minX:-4,maxX:4,minY:-4,maxY:4};
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const n of nodes){minX=Math.min(minX,n.x);maxX=Math.max(maxX,n.x);minY=Math.min(minY,n.y);maxY=Math.max(maxY,n.y)}
  const pad=1.25;
  return{minX:minX-pad,maxX:maxX+pad,minY:minY-pad,maxY:maxY+pad};
}

function clear(ctx){ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height)}
