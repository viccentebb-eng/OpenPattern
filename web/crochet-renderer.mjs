import { CROCHET_STITCHES, roundProfile } from '../src/crochet/round-engine.mjs';

export function drawCrochetTechnique(ctx, techniqueId, data, options={}, view={zoom:1,panX:0,panY:0}) {
  if (techniqueId === 'crochet-round-chart') return drawRadialChart(ctx,data,options,view);
  if (techniqueId === 'amigurumi') return drawAmigurumiProfile(ctx,data,options,view);
}

export function drawCrochetMiniature(ctx, techniqueId, data, options={}) {
  return drawCrochetTechnique(ctx, techniqueId, data, options, {zoom:1,panX:0,panY:0});
}

function drawRadialChart(ctx, data, options, view) {
  clear(ctx);
  const rounds=data.rounds??[];
  if(!rounds.length)return;
  const cx=ctx.canvas.width/2+(view.panX??0);
  const cy=ctx.canvas.height/2+(view.panY??0);
  const maxRadius=Math.min(ctx.canvas.width,ctx.canvas.height)*.4*(view.zoom??1);
  const ringStep=maxRadius/Math.max(1,rounds.length);
  const direction=data.meta?.direction==='ccw'?-1:1;

  ctx.save();
  ctx.strokeStyle='rgba(0,0,0,.14)';
  ctx.lineWidth=1;
  for(let r=1;r<=rounds.length;r++){
    ctx.beginPath();
    ctx.arc(cx,cy,r*ringStep,0,Math.PI*2);
    ctx.stroke();
  }

  for(const round of rounds){
    const radius=round.round*ringStep;
    const count=Math.max(1,round.count);
    const symbol=CROCHET_STITCHES[round.stitchType]?.symbol??'×';

    for(let i=0;i<count;i++){
      const angle=-Math.PI/2+direction*(i/count)*Math.PI*2;
      const x=cx+Math.cos(angle)*radius;
      const y=cy+Math.sin(angle)*radius;
      drawCrochetSymbol(ctx,symbol,x,y,angle+Math.PI/2,Math.max(8,Math.min(22,ringStep*.65)),options);
    }
  }

  ctx.fillStyle='#555';
  ctx.font='11px system-ui';
  ctx.textAlign='left';
  ctx.textBaseline='top';
  ctx.fillText(`${rounds.length} rounds · ${rounds[rounds.length-1].count} sts`,10,10);
  ctx.restore();
}

function drawAmigurumiProfile(ctx,data,options,view) {
  clear(ctx);
  const rounds=data.rounds??[];
  if(!rounds.length)return;
  const profile=roundProfile(rounds);
  const zoom=view.zoom??1;
  const center=ctx.canvas.width/2+(view.panX??0);
  const top=38+(view.panY??0);
  const usableH=(ctx.canvas.height-76)*zoom;
  const rowH=usableH/Math.max(1,profile.length-1||1);
  const maxHalf=ctx.canvas.width*.32*zoom;

  ctx.save();
  ctx.beginPath();
  profile.forEach((p,i)=>{
    const y=top+i*rowH;
    const x=center-p.width*maxHalf;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  for(let i=profile.length-1;i>=0;i--){
    const p=profile[i],y=top+i*rowH,x=center+p.width*maxHalf;
    ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.fillStyle='rgba(120,120,120,.08)';
  ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.45)';
  ctx.lineWidth=2;
  ctx.stroke();

  ctx.strokeStyle='rgba(0,0,0,.1)';
  ctx.lineWidth=1;
  ctx.font='10px system-ui';
  ctx.fillStyle='#666';
  ctx.textBaseline='middle';

  const labelEvery=Math.max(1,Math.ceil(profile.length/12));
  profile.forEach((p,i)=>{
    if(i%labelEvery!==0&&i!==profile.length-1)return;
    const y=top+i*rowH;
    ctx.beginPath();
    ctx.moveTo(center-p.width*maxHalf,y);
    ctx.lineTo(center+p.width*maxHalf,y);
    ctx.stroke();
    ctx.textAlign='right';
    ctx.fillText(`R${p.round}`,center-p.width*maxHalf-8,y);
    ctx.textAlign='left';
    ctx.fillText(String(p.count),center+p.width*maxHalf+8,y);
  });

  ctx.fillStyle='#333';
  ctx.font='600 12px system-ui';
  ctx.textAlign='center';
  ctx.textBaseline='top';
  ctx.fillText(`${labelShape(data.shape)} · ${rounds.length} rounds`,center,10);
  ctx.restore();
}

function drawCrochetSymbol(ctx,symbol,x,y,rotation,size,options){
  ctx.save();
  ctx.translate(x,y);
  if(options.radialRotateSymbols!==false)ctx.rotate(rotation);
  ctx.strokeStyle='#202020';
  ctx.fillStyle='#202020';
  ctx.lineWidth=Math.max(1,size*.08);
  ctx.lineCap='round';

  if(symbol==='○'){
    ctx.beginPath();
    ctx.ellipse(0,0,size*.34,size*.18,0,0,Math.PI*2);
    ctx.stroke();
  }else if(symbol==='×'){
    const d=size*.27;
    ctx.beginPath();
    ctx.moveTo(-d,-d);ctx.lineTo(d,d);
    ctx.moveTo(d,-d);ctx.lineTo(-d,d);
    ctx.stroke();
  }else{
    const stem=size*.52;
    ctx.beginPath();
    ctx.moveTo(0,-stem/2);ctx.lineTo(0,stem/2);
    ctx.moveTo(-size*.25,-stem/2);ctx.lineTo(size*.25,-stem/2);
    ctx.stroke();
    const slashes=symbol==='T//'?2:symbol==='T/'?1:0;
    for(let i=0;i<slashes;i++){
      const yy=-size*.08+i*size*.16;
      ctx.beginPath();
      ctx.moveTo(-size*.18,yy+size*.10);ctx.lineTo(size*.18,yy-size*.10);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function labelShape(shape){
  return {sphere:'Sphere',cylinder:'Cylinder',cup:'Cup',cone:'Cone'}[shape]??'Amigurumi';
}

function clear(ctx){
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
}
