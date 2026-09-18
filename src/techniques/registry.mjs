const techniques = new Map();

export function registerTechnique(definition) {
  if (!definition?.id || !definition?.name || !Array.isArray(definition.capabilities)) {
    throw new TypeError('Technique requires id, name and capabilities.');
  }
  techniques.set(definition.id, Object.freeze({ ...definition }));
}

export function getTechnique(id) {
  return techniques.get(id) ?? null;
}

export function listTechniques() {
  return [...techniques.values()];
}

[
  ['tapestry-crochet', 'Tapestry crochet', ['grid', 'sequence', 'materials', 'measurements']],
  ['c2c-crochet', 'C2C crochet', ['grid', 'sequence', 'materials', 'measurements']],
  ['bead-loom', 'Bead loom', ['grid', 'materials', 'measurements']],
  ['peyote-flat', 'Peyote flat', ['geometry', 'materials', 'measurements', 'sequence']],
  ['peyote-star', 'Peyote star', ['geometry', 'materials', 'measurements', 'sequence']],
  ['bead-rosette', 'Bead rosette / mandala', ['geometry', 'materials', 'measurements', 'sequence', 'thread-graph']],
  ['cross-stitch', 'Cross stitch', ['grid', 'materials', 'measurements']],
  ['knitting-colorwork', 'Knitting colorwork', ['grid', 'sequence', 'materials', 'measurements']]
].forEach(([id, name, capabilities]) => registerTechnique({ id, name, capabilities }));
