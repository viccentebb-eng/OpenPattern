const techniques = new Map();

export function registerTechnique(definition) {
  if (!definition?.id || !definition?.name || !Array.isArray(definition.capabilities)) {
    throw new TypeError('Technique requires id, name and capabilities.');
  }
  techniques.set(definition.id, Object.freeze({
    sourceMode: 'manual',
    group: 'Other',
    ...definition
  }));
}

export function getTechnique(id) {
  return techniques.get(id) ?? null;
}

export function listTechniques() {
  return [...techniques.values()];
}

[
  {
    id:'tapestry-crochet',
    name:'Tapestry crochet',
    group:'Crochet · Colorwork',
    sourceMode:'image-grid',
    capabilities:['grid','sequence','materials','measurements']
  },
  {
    id:'c2c-crochet',
    name:'C2C crochet',
    group:'Crochet · Colorwork',
    sourceMode:'image-grid',
    capabilities:['grid','sequence','materials','measurements']
  },
  {
    id:'crochet-round-chart',
    name:'Crochet chart editor',
    group:'Crochet · Symbols',
    sourceMode:'manual',
    capabilities:['symbols','sequence','measurements','radial','square','freeform','text']
  },
  {
    id:'amigurumi',
    name:'Amigurumi · rounds',
    group:'Crochet · Construction',
    sourceMode:'sequence',
    capabilities:['sequence','validation','measurements','graph']
  },
  {
    id:'bead-loom',
    name:'Bead loom',
    group:'Beadwork · Grid',
    sourceMode:'image-grid',
    capabilities:['grid','materials','measurements']
  },
  {
    id:'peyote-flat',
    name:'Peyote flat',
    group:'Beadwork · Geometry',
    sourceMode:'geometry',
    capabilities:['geometry','materials','measurements','sequence']
  },
  {
    id:'peyote-star',
    name:'Peyote star',
    group:'Beadwork · Geometry',
    sourceMode:'geometry',
    capabilities:['geometry','materials','measurements','sequence']
  },
  {
    id:'bead-rosette',
    name:'Bead rosette / mandala',
    group:'Beadwork · Geometry',
    sourceMode:'geometry',
    capabilities:['geometry','materials','measurements','sequence','thread-graph']
  },
  {
    id:'bead-crochet-rope',
    name:'Bead crochet rope',
    group:'Beadwork · Crochet rope',
    sourceMode:'geometry',
    capabilities:['geometry','materials','measurements','sequence','thread-graph','repeat']
  },
  {
    id:'cross-stitch',
    name:'Cross stitch',
    group:'Embroidery',
    sourceMode:'image-grid',
    capabilities:['grid','materials','measurements']
  },
  {
    id:'knitting-colorwork',
    name:'Knitting colorwork',
    group:'Knitting',
    sourceMode:'image-grid',
    capabilities:['grid','sequence','materials','measurements']
  }
].forEach(registerTechnique);
