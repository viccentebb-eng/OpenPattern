import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAmigurumi, buildRadialCrochetChart, validateRoundSequence } from '../src/crochet/round-engine.mjs';

test('radial crochet grows rounds parametrically',()=>{
  const data=buildRadialCrochetChart({rounds:4,startCount:6,growth:6,stitchType:'sc'});
  assert.deepEqual(data.rounds.map(r=>r.count),[6,12,18,24]);
  assert.equal(data.rounds[0].start,'magic-ring');
});

test('amigurumi sphere increases, holds and decreases',()=>{
  const data=buildAmigurumi({shape:'sphere',startCount:6,maxStitches:24,bodyRounds:4});
  assert.equal(data.rounds[0].count,6);
  assert.ok(data.rounds.some(r=>r.count===24));
  assert.ok(data.rounds.some(r=>r.decrease>0));
  assert.equal(validateRoundSequence(data.rounds).length,0);
});

test('amigurumi cup stays open',()=>{
  const data=buildAmigurumi({shape:'cup',startCount:6,maxStitches:24,bodyRounds:5});
  assert.equal(data.meta.closed,false);
  assert.equal(data.rounds.at(-1).count,24);
  assert.equal(data.rounds.at(-1).decrease,0);
});

test('amigurumi cylinder does not add closing decreases',()=>{
  const data=buildAmigurumi({shape:'cylinder',startCount:6,maxStitches:18,bodyRounds:3});
  assert.equal(data.rounds.at(-1).count,18);
  assert.equal(data.rounds.at(-1).decrease,0);
});
