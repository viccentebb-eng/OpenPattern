import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCrochetEdge,
  addCrochetNode,
  chartToRoundText,
  createCrochetChart,
  generateCrochetTemplate,
  nearestGuidePoint,
  parseRoundText,
  removeCrochetNode,
  summarizeCrochetChart
} from '../src/crochet/chart-model.mjs';

test('radial template creates foundation ring and editable rounds',()=>{
  const chart=generateCrochetTemplate({layout:'radial',rounds:3,startCount:6,growth:6,stitchType:'dc'});
  assert.equal(chart.nodes[0].type,'ring');
  assert.equal(chart.nodes.filter(n=>n.round===1).length,6);
  assert.equal(chart.nodes.filter(n=>n.round===2).length,12);
  assert.equal(chart.nodes.filter(n=>n.round===3).length,18);
  assert.equal(summarizeCrochetChart(chart).rounds,3);
});

test('square template places stitches on square perimeters',()=>{
  const chart=generateCrochetTemplate({layout:'square',rounds:2,startCount:8,growth:8,stitchType:'sc'});
  const round2=chart.nodes.filter(n=>n.round===2);
  assert.ok(round2.every(n=>Math.abs(n.x)===2||Math.abs(n.y)===2));
});

test('crochet chart nodes and connections are editable',()=>{
  const chart=createCrochetChart({layout:'freeform'});
  const a=addCrochetNode(chart,{type:'ch',x:0,y:0});
  const b=addCrochetNode(chart,{type:'dc',x:1,y:0});
  addCrochetEdge(chart,a.id,b.id,'thread');
  assert.equal(chart.edges.length,1);
  removeCrochetNode(chart,a.id);
  assert.equal(chart.nodes.length,1);
  assert.equal(chart.edges.length,0);
});

test('round text parses into a radial chart',()=>{
  const {chart,issues}=parseRoundText('R1: 6 sc\nR2: 12 dc\nR3: 18 ch',{layout:'radial'});
  assert.deepEqual(issues,[]);
  assert.equal(chart.nodes.length,36);
  assert.match(chartToRoundText(chart),/R2: 12 dc/);
  const roundTrip=parseRoundText('Base: 1 MR\nR1: 6 sc',{layout:'radial'});
  assert.equal(roundTrip.issues.length,0);
  assert.equal(roundTrip.chart.nodes[0].type,'ring');
});

test('guide snapping supports radial and square layouts',()=>{
  const radial=createCrochetChart({layout:'radial'});
  const rp=nearestGuidePoint(radial,1.8,.2,{segments:8});
  assert.ok(Math.abs(Math.hypot(rp.x,rp.y)-2)<1e-9);
  const square=createCrochetChart({layout:'square'});
  const sp=nearestGuidePoint(square,1.8,.4);
  assert.equal(Math.abs(sp.x),2);
});
