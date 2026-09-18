// Crochet round/amigurumi construction engine.
//
// Increase/decrease notation and the basic sphere/cylinder/cup construction
// are JavaScript adaptations of MIT-licensed CrochetPhoto2Pattern concepts.
// The data model is OpenPattern-specific. See THIRD_PARTY.md.

export const CROCHET_STITCHES = {
  sc: { id:'sc', label:'Single crochet / punto bajo', symbol:'×' },
  hdc:{ id:'hdc',label:'Half double crochet / medio alto',symbol:'T' },
  dc: { id:'dc', label:'Double crochet / punto alto', symbol:'T/' },
  tr: { id:'tr', label:'Treble crochet', symbol:'T//' },
  ch: { id:'ch', label:'Chain / cadena', symbol:'○' }
};

export function buildRadialCrochetChart(params={}) {
  const rounds=clampInt(params.rounds,1,30,6);
  const startCount=clampInt(params.startCount,3,60,6);
  const growth=clampInt(params.growth,0,24,6);
  const stitchType=CROCHET_STITCHES[params.stitchType]?.id??'sc';
  const direction=params.direction==='ccw'?'ccw':'cw';
  const out=[];

  for(let round=1;round<=rounds;round+=1){
    const count=startCount+growth*(round-1);
    out.push({
      round,
      count,
      stitchType,
      direction,
      start:round===1?(params.startMethod??'magic-ring'):'continue',
      instruction:roundInstruction(round,count,startCount,growth,stitchType)
    });
  }
  return {kind:'crochet-round-chart',rounds:out,meta:{startCount,growth,stitchType,direction}};
}

export function buildAmigurumi(params={}) {
  const shape=['sphere','cylinder','cup','cone'].includes(params.shape)?params.shape:'sphere';
  const startCount=normalizeSectorCount(params.startCount??6);
  const maxStitches=normalizeTarget(params.maxStitches??36,startCount);
  const bodyRounds=clampInt(params.bodyRounds,1,80,6);
  const rounds=[];

  let count=startCount;
  rounds.push(roundRecord(1,count,0,0,`Magic ring: ${count} sc`));

  while(count<maxStitches){
    const before=count;
    count=Math.min(maxStitches,count+startCount);
    rounds.push(roundRecord(rounds.length+1,count,count-before,0,increaseInstruction(before,count,startCount)));
  }

  if(shape==='cone'){
    // Rebuild as slower shaping: one increase sector every second round.
    return buildCone({startCount,maxStitches,bodyRounds});
  }

  const holdRounds=shape==='sphere'
    ? Math.max(2,Math.round(maxStitches/startCount))
    : bodyRounds;

  for(let i=0;i<holdRounds;i+=1){
    rounds.push(roundRecord(rounds.length+1,count,0,0,`${count} sc`));
  }

  if(shape==='sphere'){
    while(count>startCount*2){
      const before=count;
      count=Math.max(startCount*2,count-startCount);
      rounds.push(roundRecord(rounds.length+1,count,0,before-count,decreaseInstruction(before,count,startCount)));
    }
  }else if(shape==='cylinder'){
    // Keep an open-ended construction by default.
  }else if(shape==='cup'){
    // Cup is intentionally open: no decrease rounds.
  }

  return {
    kind:'amigurumi',
    shape,
    rounds,
    meta:{
      startCount,
      maxStitches,
      bodyRounds,
      totalStitches:rounds.reduce((sum,r)=>sum+r.count,0),
      closed:shape==='sphere'
    }
  };
}

export function validateRoundSequence(rounds){
  const issues=[];
  for(let i=0;i<rounds.length;i+=1){
    const r=rounds[i];
    if(!Number.isInteger(r.count)||r.count<=0)issues.push(`R${r.round}: invalid stitch count`);
    if(i>0){
      const prev=rounds[i-1];
      const delta=r.count-prev.count;
      if(Math.abs(delta)>24)issues.push(`R${r.round}: large transition ${prev.count}→${r.count}`);
      if((r.increase||0)&&(r.decrease||0))issues.push(`R${r.round}: simultaneous increase/decrease not supported yet`);
    }
  }
  return issues;
}

export function roundProfile(rounds){
  const max=Math.max(1,...rounds.map(r=>r.count));
  return rounds.map(r=>({round:r.round,width:r.count/max,count:r.count}));
}

function buildCone({startCount,maxStitches,bodyRounds}){
  const rounds=[roundRecord(1,startCount,0,0,`Magic ring: ${startCount} sc`)];
  let count=startCount;
  let hold=0;
  while(count<maxStitches){
    hold+=1;
    if(hold%2===0){
      const before=count;
      count=Math.min(maxStitches,count+startCount);
      rounds.push(roundRecord(rounds.length+1,count,count-before,0,increaseInstruction(before,count,startCount)));
    }else{
      rounds.push(roundRecord(rounds.length+1,count,0,0,`${count} sc`));
    }
  }
  for(let i=0;i<bodyRounds;i+=1)rounds.push(roundRecord(rounds.length+1,count,0,0,`${count} sc`));
  return {
    kind:'amigurumi',
    shape:'cone',
    rounds,
    meta:{startCount,maxStitches,bodyRounds,totalStitches:rounds.reduce((s,r)=>s+r.count,0),closed:false}
  };
}

function roundRecord(round,count,increase,decrease,instruction){
  return {round,count,increase,decrease,instruction};
}

function roundInstruction(round,count,startCount,growth,stitch){
  if(round===1)return `Magic ring · ${count} ${stitch}`;
  if(growth===0)return `${count} ${stitch}`;
  const before=count-growth;
  if(growth===startCount&&before%startCount===0){
    const plain=before/startCount-1;
    if(plain<=0)return `inc × ${startCount} · ${count} sts`;
    return `(${plain===1?'':plain+' '}${stitch}, inc) × ${startCount} · ${count} sts`;
  }
  return `increase evenly ${growth} · ${count} sts`;
}

function increaseInstruction(before,after,sectors){
  const plain=Math.max(0,before/sectors-1);
  if(plain===0)return `inc × ${sectors} · ${after} sts`;
  return `(${plain===1?'sc':plain+' sc'}, inc) × ${sectors} · ${after} sts`;
}

function decreaseInstruction(before,after,sectors){
  const plain=Math.max(0,before/sectors-2);
  if(plain===0)return `dec × ${sectors} · ${after} sts`;
  return `(${plain===1?'sc':plain+' sc'}, dec) × ${sectors} · ${after} sts`;
}

function normalizeSectorCount(value){
  const n=clampInt(value,3,12,6);
  return n;
}

function normalizeTarget(value,sector){
  const n=clampInt(value,sector,240,36);
  return Math.max(sector,Math.round(n/sector)*sector);
}

function clampInt(value,min,max,fallback){
  const n=Number.parseInt(value,10);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
