export const CROCHET_SYMBOLS = Object.freeze({
  ring:{id:'ring',label:'Anillo mágico',short:'MR',category:'Base'},
  ch:{id:'ch',label:'Cadena',short:'ch',category:'Base'},
  slst:{id:'slst',label:'Punto deslizado',short:'sl st',category:'Base'},
  sc:{id:'sc',label:'Punto bajo / single crochet',short:'sc',category:'Básicos'},
  hdc:{id:'hdc',label:'Medio punto alto',short:'hdc',category:'Básicos'},
  dc:{id:'dc',label:'Punto alto / double crochet',short:'dc',category:'Básicos'},
  tr:{id:'tr',label:'Punto alto triple',short:'tr',category:'Básicos'},
  dtr:{id:'dtr',label:'Doble triple',short:'dtr',category:'Básicos'},
  inc:{id:'inc',label:'Aumento',short:'inc',category:'Shaping'},
  dec:{id:'dec',label:'Disminución',short:'dec',category:'Shaping'},
  shell:{id:'shell',label:'Abanico / shell',short:'shell',category:'Grupos'},
  vst:{id:'vst',label:'V stitch',short:'V',category:'Grupos'},
  cluster:{id:'cluster',label:'Cluster',short:'cl',category:'Grupos'},
  puff:{id:'puff',label:'Puff',short:'puff',category:'Grupos'},
  popcorn:{id:'popcorn',label:'Popcorn',short:'pop',category:'Grupos'},
  picot:{id:'picot',label:'Picot',short:'picot',category:'Detalles'}
});

export function createCrochetChart({layout='radial'}={}) {
  return {
    version:1,
    layout,
    nodes:[],
    edges:[],
    guides:{show:true,roundSpacing:1,snap:true},
    nextId:1,
    text:'',
    textMode:'generated'
  };
}

export function cloneCrochetChart(chart) {
  return JSON.parse(JSON.stringify(chart));
}

export function generateCrochetTemplate(params={}) {
  const layout=['radial','square','freeform'].includes(params.layout)?params.layout:'radial';
  const chart=createCrochetChart({layout});
  if(layout==='freeform') return chart;

  const rounds=clampInt(params.rounds,1,30,5);
  const startCount=clampInt(params.startCount,1,80,6);
  const growth=clampInt(params.growth,0,40,6);
  const stitchType=CROCHET_SYMBOLS[params.stitchType]?params.stitchType:'sc';
  const colorIndex=Number.isInteger(params.colorIndex)?params.colorIndex:0;

  let previousFirst=null;
  if(layout==='radial'){
    const foundation=addCrochetNode(chart,{type:'ring',x:0,y:0,round:0,colorIndex});
    previousFirst=foundation.id;
  }
  for(let round=1;round<=rounds;round++){
    const count=Math.max(1,startCount+growth*(round-1));
    const roundNodes=[];
    for(let i=0;i<count;i++){
      const point=layout==='square'
        ? pointOnSquare(i/count,round)
        : pointOnCircle(i/count,round);
      const node=addCrochetNode(chart,{
        type:stitchType,
        x:point.x,
        y:point.y,
        rotation:point.rotation,
        round,
        colorIndex
      });
      roundNodes.push(node);
    }
    for(let i=0;i<roundNodes.length;i++){
      addCrochetEdge(chart,roundNodes[i].id,roundNodes[(i+1)%roundNodes.length].id,'round');
    }
    if(previousFirst && roundNodes[0]) addCrochetEdge(chart,previousFirst,roundNodes[0].id,'join');
    previousFirst=roundNodes[0]?.id??previousFirst;
  }
  chart.text=chartToRoundText(chart);
  return chart;
}

export function generateGrannySquareTemplate({rounds=3,colorIndex=0}={}){
  const chart=createCrochetChart({layout:'square'});
  const totalRounds=clampInt(rounds,1,8,3);
  const foundation=addCrochetNode(chart,{type:'ring',x:0,y:0,round:0,colorIndex});
  let previous=foundation.id;

  for(let round=1;round<=totalRounds;round++){
    const clustersPerSide=round;
    const clusterCount=clustersPerSide*4;
    const sequence=[];

    for(let cluster=0;cluster<clusterCount;cluster++){
      const t=(cluster+.5)/clusterCount;
      const center=pointOnSquare(t,round);
      const tangent=squareTangent(t);
      for(let j=-1;j<=1;j++){
        const node=addCrochetNode(chart,{
          type:'dc',
          x:center.x+tangent.x*j*.16,
          y:center.y+tangent.y*j*.16,
          rotation:center.rotation,
          round,
          colorIndex
        });
        sequence.push(node);
      }

      const corner=((cluster+1)%clustersPerSide===0);
      const chains=corner?2:1;
      const gapT=(cluster+1)/clusterCount;
      const gap=pointOnSquare(gapT,round);
      for(let j=0;j<chains;j++){
        const n=addCrochetNode(chart,{
          type:'ch',
          x:gap.x+tangent.x*(j-(chains-1)/2)*.14,
          y:gap.y+tangent.y*(j-(chains-1)/2)*.14,
          rotation:gap.rotation,
          round,
          colorIndex
        });
        sequence.push(n);
      }
    }

    for(let i=1;i<sequence.length;i++)addCrochetEdge(chart,sequence[i-1].id,sequence[i].id,'thread');
    if(sequence.length){
      addCrochetEdge(chart,sequence.at(-1).id,sequence[0].id,'round');
      addCrochetEdge(chart,previous,sequence[0].id,'join');
      previous=sequence[0].id;
    }
  }
  chart.text=chartToRoundText(chart);
  return chart;
}

export function generateFlowerTemplate({petals=8,colorIndex=0}={}){
  const chart=createCrochetChart({layout:'radial'});
  const count=clampInt(petals,4,16,8);
  const foundation=addCrochetNode(chart,{type:'ring',x:0,y:0,round:0,colorIndex});
  const inner=[];

  for(let i=0;i<count;i++){
    const p=pointOnCircle(i/count,1);
    inner.push(addCrochetNode(chart,{type:'sc',x:p.x,y:p.y,rotation:p.rotation,round:1,colorIndex}));
  }
  for(let i=0;i<inner.length;i++)addCrochetEdge(chart,inner[i].id,inner[(i+1)%inner.length].id,'round');
  if(inner[0])addCrochetEdge(chart,foundation.id,inner[0].id,'join');

  const outer=[];
  for(let i=0;i<count;i++){
    const angle=-Math.PI/2+i/count*Math.PI*2;
    const before=addCrochetNode(chart,{type:'ch',x:Math.cos(angle-.16)*1.55,y:Math.sin(angle-.16)*1.55,rotation:angle,round:2,colorIndex});
    const shell=addCrochetNode(chart,{type:'shell',x:Math.cos(angle)*2,y:Math.sin(angle)*2,rotation:angle+Math.PI/2,round:2,colorIndex});
    const after=addCrochetNode(chart,{type:'ch',x:Math.cos(angle+.16)*1.55,y:Math.sin(angle+.16)*1.55,rotation:angle,round:2,colorIndex});
    outer.push(before,shell,after);
  }
  for(let i=1;i<outer.length;i++)addCrochetEdge(chart,outer[i-1].id,outer[i].id,'thread');
  if(outer.length){
    addCrochetEdge(chart,outer.at(-1).id,outer[0].id,'round');
    addCrochetEdge(chart,inner[0].id,outer[0].id,'join');
  }
  chart.text=chartToRoundText(chart);
  return chart;
}

export function addCrochetNode(chart,node={}) {
  const id=node.id??`s${chart.nextId++}`;
  const created={
    id,
    type:CROCHET_SYMBOLS[node.type]?node.type:'sc',
    x:finite(node.x,0),
    y:finite(node.y,0),
    rotation:finite(node.rotation,0),
    scale:finite(node.scale,1),
    round:Number.isInteger(node.round)?node.round:null,
    colorIndex:Number.isInteger(node.colorIndex)?node.colorIndex:0,
    note:node.note??''
  };
  chart.nodes.push(created);
  return created;
}

export function removeCrochetNode(chart,id) {
  const before=chart.nodes.length;
  chart.nodes=chart.nodes.filter(n=>n.id!==id);
  chart.edges=chart.edges.filter(e=>e.from!==id&&e.to!==id);
  return before!==chart.nodes.length;
}

export function moveCrochetNode(chart,id,x,y) {
  const node=chart.nodes.find(n=>n.id===id);
  if(!node)return null;
  node.x=finite(x,node.x);
  node.y=finite(y,node.y);
  return node;
}

export function updateCrochetNode(chart,id,patch={}) {
  const node=chart.nodes.find(n=>n.id===id);
  if(!node)return null;
  if(patch.type&&CROCHET_SYMBOLS[patch.type])node.type=patch.type;
  if(Number.isFinite(+patch.rotation))node.rotation=+patch.rotation;
  if(Number.isFinite(+patch.scale))node.scale=Math.max(.25,Math.min(4,+patch.scale));
  if(Number.isInteger(patch.colorIndex))node.colorIndex=patch.colorIndex;
  if(Number.isInteger(patch.round)||patch.round===null)node.round=patch.round;
  return node;
}

export function addCrochetEdge(chart,from,to,kind='thread') {
  if(!from||!to||from===to)return null;
  if(chart.edges.some(e=>e.from===from&&e.to===to&&e.kind===kind))return null;
  const edge={id:`e${chart.edges.length+1}-${Date.now().toString(36)}`,from,to,kind};
  chart.edges.push(edge);
  return edge;
}

export function removeCrochetEdge(chart,id) {
  const before=chart.edges.length;
  chart.edges=chart.edges.filter(e=>e.id!==id);
  return before!==chart.edges.length;
}

export function nearestGuidePoint(chart,x,y,options={}) {
  if(chart?.guides?.snap===false)return{x,y,round:null};
  if(chart.layout==='radial'){
    const r=Math.max(.65,Math.round(Math.hypot(x,y)));
    const angle=Math.atan2(y,x);
    const segments=Math.max(6,clampInt(options.segments,6,200,24));
    const snapped=Math.round(angle/(Math.PI*2/segments))*(Math.PI*2/segments);
    return{x:Math.cos(snapped)*r,y:Math.sin(snapped)*r,round:r};
  }
  if(chart.layout==='square'){
    const r=Math.max(1,Math.round(Math.max(Math.abs(x),Math.abs(y))));
    if(Math.abs(x)>=Math.abs(y))return{x:Math.sign(x||1)*r,y:Math.max(-r,Math.min(r,Math.round(y*2)/2)),round:r};
    return{x:Math.max(-r,Math.min(r,Math.round(x*2)/2)),y:Math.sign(y||1)*r,round:r};
  }
  return{x:Math.round(x*4)/4,y:Math.round(y*4)/4,round:null};
}

export function chartToRoundText(chart) {
  const groups=new Map();
  const loose=[];
  for(const node of chart.nodes){
    if(Number.isInteger(node.round)){
      if(!groups.has(node.round))groups.set(node.round,[]);
      groups.get(node.round).push(node);
    }else loose.push(node);
  }

  const lines=[...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([round,nodes])=>{
    const counts=countByType(nodes);
    const phrase=Object.entries(counts).map(([type,count])=>`${count} ${CROCHET_SYMBOLS[type]?.short??type}`).join(', ');
    return round===0?`Base: ${phrase}`:`R${round}: ${phrase}`;
  });
  if(loose.length){
    const counts=countByType(loose);
    lines.push('Libre: '+Object.entries(counts).map(([type,count])=>`${count} ${CROCHET_SYMBOLS[type]?.short??type}`).join(', '));
  }
  return lines.join('\n');
}

export function parseRoundText(text,{layout='radial'}={}) {
  const rounds=[];
  const issues=[];
  for(const raw of String(text??'').split(/\r?\n/)){
    const line=raw.trim();
    if(!line)continue;
    const base=line.match(/^(?:Base|Foundation)\s*:\s*(.+)$/i);
    const m=line.match(/^(?:R|V|Round|Vuelta)\s*(\d+)\s*:\s*(.+)$/i);
    if(!m&&!base){issues.push(`No entendí: "${line}"`);continue}
    const round=base?0:Number(m[1]);
    const body=base?base[1]:m[2];
    const tokens=[];
    const rx=/(\d+)\s*(mr|ring|ch|sl\s*st|slst|sc|hdc|dc|tr|dtr|inc|dec|shell|v(?:\s*st)?|cluster|puff|popcorn|picot)\b/ig;
    let match;
    while((match=rx.exec(body))){
      const count=Number(match[1]);
      const type=normalizeType(match[2]);
      if(type)tokens.push({type,count});
    }
    if(!tokens.length){
      issues.push(`R${round}: no encontré cantidades + puntadas compatibles`);
      continue;
    }
    rounds.push({round,tokens});
  }

  const chart=createCrochetChart({layout});
  for(const r of rounds){
    const total=r.tokens.reduce((s,t)=>s+t.count,0);
    let cursor=0;
    for(const token of r.tokens){
      for(let i=0;i<token.count;i++){
        const t=(cursor+.5)/Math.max(1,total);
        const p=r.round===0
          ? {x:0,y:0,rotation:0}
          : (layout==='square'?pointOnSquare(t,r.round):pointOnCircle(t,r.round));
        addCrochetNode(chart,{type:token.type,x:p.x,y:p.y,rotation:p.rotation,round:r.round});
        cursor++;
      }
    }
    const nodes=chart.nodes.filter(n=>n.round===r.round);
    for(let i=0;i<nodes.length;i++)addCrochetEdge(chart,nodes[i].id,nodes[(i+1)%nodes.length].id,'round');
  }
  chart.text=String(text??'');
  chart.textMode='manual';
  return {chart,issues};
}

export function summarizeCrochetChart(chart) {
  const byType=countByType(chart.nodes);
  const rounds=[...new Set(chart.nodes.map(n=>n.round).filter(r=>Number.isInteger(r)&&r>0))].sort((a,b)=>a-b);
  return {
    stitches:chart.nodes.length,
    connections:chart.edges.length,
    rounds:rounds.length,
    byType
  };
}

function squareTangent(t){
  const p=((t%1)+1)%1*8;
  if(p<2)return{x:1,y:0};
  if(p<4)return{x:0,y:1};
  if(p<6)return{x:-1,y:0};
  return{x:0,y:-1};
}

function pointOnCircle(t,round){
  const angle=-Math.PI/2+t*Math.PI*2;
  return{x:Math.cos(angle)*round,y:Math.sin(angle)*round,rotation:angle+Math.PI/2};
}

function pointOnSquare(t,round){
  const p=((t%1)+1)%1*8;
  let x,y,rotation=0;
  if(p<2){x=-round+p*round;y=-round;rotation=0}
  else if(p<4){x=round;y=-round+(p-2)*round;rotation=Math.PI/2}
  else if(p<6){x=round-(p-4)*round;y=round;rotation=Math.PI}
  else{x=-round;y=round-(p-6)*round;rotation=-Math.PI/2}
  return{x,y,rotation};
}

function countByType(nodes){
  const out={};
  for(const n of nodes)out[n.type]=(out[n.type]??0)+1;
  return out;
}

function normalizeType(value){
  const v=value.toLowerCase().replace(/\s+/g,'');
  const map={mr:'ring',ring:'ring',ch:'ch',slst:'slst',sc:'sc',hdc:'hdc',dc:'dc',tr:'tr',dtr:'dtr',inc:'inc',dec:'dec',shell:'shell',v:'vst',vst:'vst',cluster:'cluster',puff:'puff',popcorn:'popcorn',picot:'picot'};
  return map[v]??null;
}

function clampInt(value,min,max,fallback){
  const n=Number.parseInt(value,10);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
function finite(value,fallback){const n=Number(value);return Number.isFinite(n)?n:fallback}
