import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAmigurumi, buildRadialCrochetChart } from '../src/crochet/round-engine.mjs';
import { crochetParadeBridgePlan, toCrochetParadeDsl } from '../src/crochet/crochetparade-adapter.mjs';

test('amigurumi serializes to CrochetPARADE ring syntax',()=>{
  const data=buildAmigurumi({shape:'sphere',startCount:6,maxStitches:18});
  const dsl=toCrochetParadeDsl(data);
  assert.match(dsl,/^ring\nsc6inc\n/);
  assert.match(dsl,/6\*\[/);
});

test('radial chart serializes chosen stitch family',()=>{
  const data=buildRadialCrochetChart({rounds:3,startCount:6,growth:6,stitchType:'dc'});
  const dsl=toCrochetParadeDsl(data);
  assert.match(dsl,/dc6inc/);
  assert.match(dsl,/dc2inc/);
});

test('CrochetPARADE bridge remains a separate engine boundary',()=>{
  const plan=crochetParadeBridgePlan();
  assert.equal(plan.engine,'CrochetPARADE');
  assert.ok(plan.outputs.includes('stitch-graph'));
  assert.ok(plan.outputs.includes('symbol-chart-svg'));
});
