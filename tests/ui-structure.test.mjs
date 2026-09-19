import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');

test('technique selector lives outside the optional image conversion panel',()=>{
  const techniquePos=html.indexOf('id="technique"');
  const conversionPos=html.indexOf('id="imageConversionPanel"');
  assert.ok(techniquePos>=0,'technique selector missing');
  assert.ok(conversionPos>=0,'image conversion panel missing');
  assert.ok(techniquePos<conversionPos,'technique selector must remain visible when image conversion is hidden');
});

test('project section remains independent from Conversion Studio',()=>{
  assert.match(html,/class="section project-section"/);
  assert.match(html,/class="section conversion" id="imageConversionPanel"/);
  assert.match(html,/id="techniqueSourceMode"/);
});


test('Crochet Studio has independent drawing controls',()=>{
  assert.match(html,/id="crochetStudioPanel"/);
  assert.match(html,/id="crochetSymbolPalette"/);
  assert.match(html,/data-crochet-tool="select"/);
  assert.match(html,/data-crochet-tool="place"/);
  assert.match(html,/data-crochet-tool="connect"/);
  assert.match(html,/data-crochet-tool="delete"/);
});

test('generic grid tools can be hidden without hiding project controls',()=>{
  const gridTools=html.indexOf('id="gridToolsPanel"');
  const project=html.indexOf('class="section project-section"');
  assert.ok(gridTools>=0);
  assert.ok(project>=0);
  assert.notEqual(gridTools,project);
});
