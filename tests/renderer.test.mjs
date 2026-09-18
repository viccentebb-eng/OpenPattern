import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAD_PROFILES, estimateTechniqueSize, getBeadProfile, techniqueLegendMeta } from '../web/technique-renderers.mjs';

test('bead profiles expose physical dimensions', () => {
  const profile = getBeadProfile('delica11');
  assert.equal(profile.label, 'Miyuki Delica 11/0');
  assert.ok(profile.diameterMm > profile.widthMm);
});

test('bead loom size estimate uses selected profile', () => {
  const size = estimateTechniqueSize('bead-loom', { width:10, height:5 }, { beadProfile:'delica11' });
  assert.equal(size.widthMm, 16);
  assert.equal(size.heightMm, 6.15);
});

test('bead legend reflects chosen profile', () => {
  const meta = techniqueLegendMeta('bead-loom', 0, { beadProfile:'aiko11' });
  assert.match(meta.catalog, /Aiko/);
  assert.equal(Object.keys(BEAD_PROFILES).length >= 4, true);
});
