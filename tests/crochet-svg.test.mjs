import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFlowerTemplate, generateGrannySquareTemplate } from '../src/crochet/chart-model.mjs';
import { crochetChartToSvg } from '../src/crochet/chart-svg.mjs';

test('crochet SVG exporter emits vector output for a flower chart',()=>{
  const chart=generateFlowerTemplate({petals:8,colorIndex:0});
  const svg=crochetChartToSvg(chart,{palette:[{rgb:[20,40,80]}]});
  assert.match(svg,/^<\?xml/);
  assert.match(svg,/<svg/);
  assert.match(svg,/<ellipse|<path|<circle/);
  assert.match(svg,/rgb\(20,40,80\)/);
});

test('crochet SVG exporter includes square guides for granny layout',()=>{
  const chart=generateGrannySquareTemplate({rounds:2,colorIndex:0});
  const svg=crochetChartToSvg(chart,{showGuides:true});
  assert.match(svg,/<rect x=/);
  assert.match(svg,/stroke-opacity="\.16"/);
});
