import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(dir, p), 'utf8');
const catalog = JSON.parse(read('patterns.json'));
const ids = new Set();
const tags = new Set(['direct', 'bff-rest', 'bff-graphql', 'graphql', 'serverless', 'rendering']);

test('catalogue: 10 patterns et IDs uniques', () => {
  assert.ok(catalog.patterns.length >= 10);
  for (const p of catalog.patterns) {
    assert.match(p.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(p.id), 'Identifiant doublon : ' + p.id);
    ids.add(p.id);
  }
});
test('chaque fiche contient les champs nécessaires à une décision', () => {
  for (const p of catalog.patterns) {
    for (const key of ['title','subtitle','rendering','hosting','complexity','summary','problem','when','auth','security','operations']) {
      assert.ok(typeof p[key] === 'string' && p[key].length > 8, p.id + ': ' + key);
    }
    assert.ok(p.tags.length > 0 && p.tags.every((tag) => tags.has(tag)), p.id + ': tags');
    assert.ok(p.diagram.length >= 3 && p.diagram.every((n) => n.length === 3), p.id + ': flux');
    assert.ok(p.benefits.length >= 2 && p.tradeoffs.length >= 2, p.id + ': arbitrage');
  }
});
test('toutes les références sont valides et HTTPS', () => {
  const references = new Map(catalog.sources.map((s) => [s.id, s]));
  for (const p of catalog.patterns) {
    assert.ok(p.refs.length, p.id + ': sans sources');
    p.refs.forEach((id) => assert.ok(references.has(id), p.id + ': référence absente ' + id));
  }
  for (const source of catalog.sources) assert.match(source.url, /^https:\/\//);
});
test('couvre les quatre cas fondateurs et les variantes de rendu', () => {
  for (const tag of ['direct','bff-rest','bff-graphql','serverless','rendering']) {
    assert.ok(catalog.patterns.some((p) => p.tags.includes(tag)), 'Manque : ' + tag);
  }
  assert.ok(catalog.patterns.some((p) => p.tags.includes('serverless') && p.tags.includes('bff-rest')));
});
test('site autonome, accessible, manifest et cache hors ligne cohérents', () => {
  const html = read('index.html');
  const sw = read('sw.js');
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.match(html, /lang="fr"/);
  assert.match(html, /id="catalogue"/);
  assert.match(html, /id="comparison"/);
  assert.match(html, /<dialog/);
  assert.match(html, /fetch\("\.\/patterns\.json"/);
  assert.match(sw, /front-patterns-v1/);
  for (const path of ['index.html','patterns.json','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png']) {
    assert.match(sw, new RegExp(path.replaceAll('.', '\\.')));
  }
  assert.equal(manifest.scope, './');
  assert.ok(manifest.icons.some((x) => x.sizes === '192x192'));
  assert.ok(manifest.icons.some((x) => x.sizes === '512x512'));
});
test('un lien renvoie au portail et les ressources restent relatives', () => {
  const html=read('index.html');
  assert.match(html, /https:\/\/sims07\.github\.io\/tools-portal\//);
  assert.match(html, /fetch\("\.\/patterns\.json"/);
  assert.match(html, /register\("\.\/sw\.js"/);
});

test('le JavaScript inline est syntaxiquement valide', () => {
  const scripts = [...read('index.html').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0);
  for(const [,code] of scripts) assert.doesNotThrow(() => new Function(code));
});
