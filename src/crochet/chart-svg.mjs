export function crochetChartToSvg(chart,{palette=[],width=1200,height=1200,showGuides=true,showConnections=true}={}){
  const bounds=boundsFor(chart.nodes);
  const spanX=Math.max(2,bounds.maxX-bounds.minX);
  const spanY=Math.max(2,bounds.maxY-bounds.minY);
  const pad=70;
  const scale=Math.min((width-pad*2)/spanX,(height-pad*2)/spanY);
  const cx=(bounds.minX+bounds.maxX)/2;
  const cy=(bounds.minY+bounds.maxY)/2;
  const project=(n)=>({x:width/2+(n.x-cx)*scale,y:height/2+(n.y-cy)*scale});

  const nodes=chart.nodes.map(n=>({...n,...project(n)}));
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const parts=[
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="white"/>',
    '<g fill="none" stroke-linecap="round" stroke-linejoin="round">'
  ];

  if(showGuides)parts.push(...guideSvg(chart,{width,height,scale,ox:width/2,oy:height/2}));

  if(showConnections){
    parts.push('<g stroke="#555" stroke-opacity=".28" stroke-width="1.4">');
    for(const edge of chart.edges){
      const a=byId.get(edge.from),b=byId.get(edge.to);
      if(!a||!b)continue;
      parts.push(`<line x1="${fmt(a.x)}" y1="${fmt(a.y)}" x2="${fmt(b.x)}" y2="${fmt(b.y)}"/>`);
    }
    parts.push('</g>');
  }

  parts.push('<g>');
  for(const node of nodes){
    const color=rgb(palette[node.colorIndex]?.rgb??[30,30,30]);
    parts.push(stitchSvg(node,color,Math.max(16,Math.min(36,scale*.46))));
  }
  parts.push('</g></g></svg>');
  return parts.join('\n');
}

function guideSvg(chart,{width,height,scale,ox,oy}){
  const out=['<g stroke="#52708a" stroke-opacity=".16" stroke-width="1">'];
  const maxRound=Math.max(1,...chart.nodes.map(n=>Number.isInteger(n.round)?n.round:0));
  if(chart.layout==='radial'){
    for(let r=1;r<=maxRound;r++)out.push(`<circle cx="${ox}" cy="${oy}" r="${fmt(r*scale)}"/>`);
  }else if(chart.layout==='square'){
    for(let r=1;r<=maxRound;r++){
      const d=r*scale;
      out.push(`<rect x="${fmt(ox-d)}" y="${fmt(oy-d)}" width="${fmt(d*2)}" height="${fmt(d*2)}"/>`);
    }
  }
  out.push('</g>');
  return out;
}

function stitchSvg(node,color,size){
  const rot=(node.rotation??0)*180/Math.PI;
  const transform=`translate(${fmt(node.x)} ${fmt(node.y)}) rotate(${fmt(rot)}) scale(${fmt(node.scale??1)})`;
  const a=[];
  const common=`stroke="${color}" stroke-width="${fmt(Math.max(1.4,size*.075))}"`;

  if(node.type==='ring'){
    a.push(`<circle cx="0" cy="0" r="${fmt(size*.36)}" ${common}/>`);
  }else if(node.type==='ch'){
    a.push(`<ellipse cx="0" cy="0" rx="${fmt(size*.38)}" ry="${fmt(size*.19)}" ${common}/>`);
  }else if(node.type==='slst'){
    a.push(`<circle cx="0" cy="0" r="${fmt(size*.12)}" fill="${color}" stroke="none"/>`);
  }else if(node.type==='sc'){
    const d=size*.28;
    a.push(`<path d="M ${fmt(-d)} ${fmt(-d)} L ${fmt(d)} ${fmt(d)} M ${fmt(d)} ${fmt(-d)} L ${fmt(-d)} ${fmt(d)}" ${common}/>`);
  }else if(['hdc','dc','tr','dtr'].includes(node.type)){
    const slashes={hdc:0,dc:1,tr:2,dtr:3}[node.type];
    a.push(tallSvg(size,slashes,common));
  }else if(node.type==='inc'||node.type==='dec'){
    const close=node.type==='dec';
    a.push(`<path d="M ${fmt(-size*.25)} ${fmt(size*.34)} L ${fmt(close?0:-size*.25)} ${fmt(-size*.34)} M ${fmt(size*.25)} ${fmt(size*.34)} L ${fmt(close?0:size*.25)} ${fmt(-size*.34)} M ${fmt(-size*.45)} ${fmt(-size*.34)} L ${fmt(size*.45)} ${fmt(-size*.34)}" ${common}/>`);
  }else if(node.type==='vst'){
    a.push(`<path d="M 0 ${fmt(size*.36)} L ${fmt(-size*.32)} ${fmt(-size*.34)} M 0 ${fmt(size*.36)} L ${fmt(size*.32)} ${fmt(-size*.34)}" ${common}/>`);
  }else if(node.type==='shell'||node.type==='cluster'){
    const count=node.type==='shell'?5:3;
    let d='';
    for(let i=0;i<count;i++){
      const t=count===1?.5:i/(count-1),x=(t-.5)*size*.85;
      d+=`M 0 ${fmt(size*.34)} L ${fmt(x)} ${fmt(-size*.34)} `;
    }
    a.push(`<path d="${d.trim()}" ${common}/>`);
  }else if(node.type==='puff'||node.type==='popcorn'){
    const count=node.type==='puff'?4:5;
    let d='';
    for(let i=0;i<count;i++){
      const t=i/(count-1),x=(t-.5)*size*.48;
      d+=`M 0 ${fmt(size*.34)} Q ${fmt(x*1.6)} 0 ${fmt(x)} ${fmt(-size*.28)} Q ${fmt(x*.4)} ${fmt(-size*.4)} 0 ${fmt(size*.34)} `;
    }
    a.push(`<path d="${d.trim()}" ${common}/>`);
  }else if(node.type==='picot'){
    a.push(`<path d="M ${fmt(-size*.34)} ${fmt(size*.12)} L 0 ${fmt(-size*.34)} L ${fmt(size*.34)} ${fmt(size*.12)}" ${common}/>`);
    a.push(`<ellipse cx="0" cy="${fmt(-size*.38)}" rx="${fmt(size*.16)}" ry="${fmt(size*.08)}" ${common}/>`);
  }else{
    a.push(`<text x="0" y="0" fill="${color}" stroke="none" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-size="${fmt(size*.7)}">${escapeXml(node.type)}</text>`);
  }
  return `<g transform="${transform}">${a.join('')}</g>`;
}

function tallSvg(size,slashes,common){
  const h=size*.72;
  let d=`M 0 ${fmt(-h/2)} L 0 ${fmt(h/2)} M ${fmt(-size*.24)} ${fmt(-h/2)} L ${fmt(size*.24)} ${fmt(-h/2)} `;
  for(let i=0;i<slashes;i++){
    const y=-size*.08+i*size*.15;
    d+=`M ${fmt(-size*.18)} ${fmt(y+size*.1)} L ${fmt(size*.18)} ${fmt(y-size*.1)} `;
  }
  return `<path d="${d.trim()}" ${common}/>`;
}

function boundsFor(nodes){
  if(!nodes?.length)return{minX:-4,maxX:4,minY:-4,maxY:4};
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const n of nodes){minX=Math.min(minX,n.x);maxX=Math.max(maxX,n.x);minY=Math.min(minY,n.y);maxY=Math.max(maxY,n.y)}
  return{minX:minX-1.25,maxX:maxX+1.25,minY:minY-1.25,maxY:maxY+1.25};
}
function rgb([r,g,b]){return`rgb(${r},${g},${b})`}
function fmt(v){return Number(v.toFixed(3))}
function escapeXml(v){return String(v).replace(/[<>&"']/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[ch]))}
