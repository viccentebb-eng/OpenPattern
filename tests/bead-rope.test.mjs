import test from 'node:test';
import assert from 'node:assert/strict';
import { beadRunsForRepeat, buildBeadCrochetRope, detectLinearRepeat } from '../src/geometry/bead-rope.mjs';

function pattern(width,height,cells){
  return { grid:{ width,height,cells } };
}

test('rope repeat detector finds the smallest repeated bead sequence',()=>{
  const grid={ width:3,height:3,cells:[1,2,3,1,2,3,1,2,3] };
  assert.equal(detectLinearRepeat(grid),3);
  assert.deepEqual(beadRunsForRepeat(grid),[
    {colorIndex:1,count:1},
    {colorIndex:2,count:1},
    {colorIndex:3,count:1}
  ]);
});

test('rope repeat detector ignores unused trailing background',()=>{
  const grid={ width:3,height:3,cells:[1,1,2,1,1,2,0,0,0] };
  assert.equal(detectLinearRepeat(grid),3);
});

test('bead crochet rope draft maps every bead to source cells',()=>{
  const p=pattern(4,2,[0,1,2,3,4,5,6,7]);
  const layout=buildBeadCrochetRope(p,{circumference:4,view:'draft'});
  assert.equal(layout.nodes.length,8);
  assert.deepEqual(layout.nodes.map(n=>n.sourceIndex),[0,1,2,3,4,5,6,7]);
  assert.equal(layout.meta.circumference,4);
});

test('bead crochet rope corrected view staggers short and long rows',()=>{
  const p=pattern(4,3,Array.from({length:12},(_,i)=>i%2));
  const layout=buildBeadCrochetRope(p,{circumference:4,view:'corrected'});
  assert.equal(layout.nodes[0].x,0.5);
  assert.equal(layout.nodes[0].y,0);
  assert.equal(layout.nodes[4].x,0);
  assert.equal(layout.nodes[4].y,1);
});

test('finished rope projects beads around a cylindrical front/back depth',()=>{
  const p=pattern(6,2,Array(12).fill(1));
  const layout=buildBeadCrochetRope(p,{circumference:6,view:'rope'});
  assert.equal(layout.nodes.length,12);
  assert.ok(layout.nodes.some(n=>n.depth>0.5));
  assert.ok(layout.nodes.some(n=>n.depth<0));
  assert.equal(layout.meta.rounds,2);
});
