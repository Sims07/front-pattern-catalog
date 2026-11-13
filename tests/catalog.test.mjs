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
  assert.ok(catalog.patterns.length >= 15);
  for (const p of catalog.patterns) {
    assert.match(p.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(p.id), 'Identifiant doublon : ' + p.id);
    ids.add(p.id);
  }
});
test('chaque fiche contient les champs nécessaires à une décision', () => {
  for (const p of catalog.patterns) {
    for (const key of ['title','subtitle','rendering','hosting','complexity','summary','problem','when','auth','security','operations']) {
      assert.ok(typeof p[key] === 'string' && p[key].trim().length >= (['rendering','hosting','complexity','auth'].includes(key) ? 3 : 9), p.id + ': ' + key);
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
  assert.match(sw, /front-patterns-v2/);
  for (const path of ['index.html','patterns.json','diagrams.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png']) {
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

test('15 parcours pédagogiques avec canaux et étapes', () => {
  const ids = new Set();
  const validKinds = new Set(['client','cdn','gateway','bff','service','data','security','event','build','observability']);
  for (const p of catalog.patterns) {
    assert.ok(p.simple.length >= 40, p.id + ': manque explication simple');
    assert.ok(p.example.length >= 25, p.id + ': manque exemple');
    assert.ok(p.steps.length >= 4, p.id + ': manque déroulé');
    assert.ok(p.implementation.length >= 3, p.id + ': manque mise en oeuvre');
    assert.ok(p.audience.length > 0 && p.audience.every(x => ['web','mobile'].includes(x)), p.id + ': canal');
    assert.ok(p.mobileNote.length > 35, p.id + ': manque information mobile');
    assert.ok(p.preview.length >= 4, p.id + ': aperçu incomplet');
    const stages=p.architecture.stages;
    assert.ok(stages.length >= 4, p.id + ': pas assez de couches');
    const nodes=stages.flatMap(s=>s.nodes);
    assert.ok(nodes.length >= 7, p.id + ': moins de 7 briques');
    const names = new Set();
    for(const n of nodes) {
      assert.ok(n.name && n.detail, p.id + ': nœud sans légende');
      assert.ok(validKinds.has(n.kind), p.id + ': catégorie nœud');
      assert.ok(!names.has(n.id),p.id + ': id nœud dupliqué ' + n.id);
      names.add(n.id);
    }
    assert.ok(p.architecture.links.length >= 4,p.id + ': pas assez de liaisons');
    for(const l of p.architecture.links) {
      assert.ok(names.has(l.from),p.id + ': liaison départ inconnue ' + l.from);
      assert.ok(names.has(l.to),p.id + ': liaison arrivée inconnue ' + l.to);
      assert.ok(l.label,p.id + ': protocole absent');
    }
    ids.add(p.id);
  }
  assert.equal(ids.size,catalog.patterns.length);
});
test('serverless : 5 variantes détaillées avec runtime, état et scaling', () => {
  const matches = catalog.patterns.filter(p => p.tags.includes('serverless'));
  assert.ok(matches.length >= 5);
  for(const p of matches) {
    assert.ok(p.serverless, p.id + ': pas de zoom serverless');
    for(const key of ['trigger','compute','state','scale','watch','tradeoff']) {
      assert.ok(p.serverless[key].length >= 20,p.id + ': '+key);
    }
  }
});
test('clients web et mobile explicités sans confondre SPA et app native', () => {
  assert.ok(catalog.patterns.some(p=>p.audience.includes('mobile') && !p.audience.includes('web')));
  const native=catalog.patterns.find(p=>p.id==='mobile-native-direct');
  assert.ok(!native.architecture.stages.flatMap(s=>s.nodes).some(n=>n.kind==='cdn'));
  const serverless=catalog.patterns.find(p=>p.id==='serverless-bff-rest');
  assert.ok(serverless.architecture.links.some(l=>l.from==='web'&&l.to==='cdn'));
  assert.ok(serverless.architecture.links.some(l=>l.from==='web'&&l.to==='gw'));
  assert.ok(!serverless.architecture.links.some(l=>l.from==='cdn'&&l.to==='fn'));
});
test('glossaire des acronymes et distinction rendu / architecture', () => {
  const terms=new Set(catalog.glossary.map(x=>x.term));
  for(const key of ['SSR','SSG','CSR','BFF','SPA','GraphQL','Serverless','Cold start','API Gateway']) {
    assert.ok(terms.has(key),'terme manquant '+key);
  }
  assert.ok(catalog.glossary.every(x=>x.full&&x.simple&&x.example));
  const html=read('index.html');
  assert.match(html,/id="primerTitle"/);
  assert.match(html,/id="glossaryList"/);
  assert.match(html,/id="channel"/);
  assert.match(html,/PatternDiagrams.renderVertical\(p\)/);
});
test('moteur de diagrammes : schéma vertical, branches, flèches et échappement XSS', async () => {
  const vm = await import('node:vm');
  const context={};
  vm.runInNewContext(read('diagrams.js'),context);
  const draw=context.PatternDiagrams;
  assert.ok(draw);
  const p=catalog.patterns.find(x=>x.id==='serverless-async');
  const svg=draw.renderVertical(p);
  assert.match(svg,/<svg/);
  assert.match(svg,/marker-end="url\(#arrow-async\)"/);
  assert.match(svg,/File de messages/);
  assert.match(svg,/Dead-letter queue/);
  assert.match(svg,/liaisons et protocoles/);
  const preview=draw.preview(p);
  assert.ok((preview.match(/class="node /g)||[]).length>=4);
  assert.equal(draw.escapeHTML('<img src=x onerror="alert(1)">'),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('service worker conserve les données et le moteur des schémas hors-ligne', () => {
  const sw=read('sw.js');
  assert.match(sw,/\.\/diagrams\.js/);
  assert.match(sw,/\.\/patterns\.json/);
});
