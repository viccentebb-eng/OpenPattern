// Adapter boundary for CrochetPARADE.
//
// OpenPattern keeps its own project model, but serializes structured crochet
// into CrochetPARADE's public pattern language so the upstream parser/graph/
// renderer can become the canonical crochet backend.
//
// No CrochetPARADE GPL source is copied in this file.

export function toCrochetParadeDsl(data, options={}) {
  if (!data || !Array.isArray(data.rounds)) throw new TypeError('Crochet data requires rounds.');
  const lines=[];
  const color=options.color;
  if (color) lines.push(`COLOR:${color}`);

  if (data.kind === 'amigurumi') {
    lines.push(...amigurumiToDsl(data));
  } else if (data.kind === 'crochet-round-chart') {
    lines.push(...radialToDsl(data));
  } else {
    throw new Error(`Unsupported crochet data kind: ${data.kind}`);
  }

  return lines.join('\n')+'\n';
}

export function crochetParadeBridgePlan() {
  return {
    engine:'CrochetPARADE',
    transport:'worker-adapter',
    inputs:['dsl-text','english-pattern'],
    outputs:['validated-pattern','stitch-graph','symbol-chart-svg','model-2d','model-3d','stats'],
    note:'Vendor or submodule integration requires final OpenPattern GPL-compatible root licensing.'
  };
}

function amigurumiToDsl(data){
  const rounds=data.rounds;
  if(!rounds.length)return[];
  const lines=['ring', `sc${rounds[0].count}inc`];
  for(let i=1;i<rounds.length;i++){
    const prev=rounds[i-1].count;
    const cur=rounds[i].count;
    lines.push(transitionToDsl(prev,cur));
  }
  return lines;
}

function radialToDsl(data){
  const rounds=data.rounds;
  if(!rounds.length)return[];
  const stitch=data.meta?.stitchType||'sc';
  const lines=['ring', `${stitch}${rounds[0].count}inc`];
  for(let i=1;i<rounds.length;i++){
    const prev=rounds[i-1].count;
    const cur=rounds[i].count;
    lines.push(transitionToDsl(prev,cur,stitch));
  }
  return lines;
}

function transitionToDsl(prev,cur,stitch='sc'){
  if(cur===prev)return `${cur}${stitch}`;
  if(cur>prev){
    const diff=cur-prev;
    if(prev>0 && diff>0 && prev%diff===0){
      const groups=diff;
      const plain=prev/groups-1;
      const body=plain<=0
        ? `${stitch}2inc`
        : `${plain===1?stitch:plain+stitch},${stitch}2inc`;
      return groups===1?body:`${groups}*[${body}]`;
    }
    return `${cur}${stitch}`;
  }
  const diff=prev-cur;
  if(cur>0 && diff>0 && cur%diff===0){
    const groups=diff;
    const plain=prev/groups-2;
    const body=plain<=0
      ? `${stitch}2tog`
      : `${plain===1?stitch:plain+stitch},${stitch}2tog`;
    return groups===1?body:`${groups}*[${body}]`;
  }
  return `${cur}${stitch}`;
}
