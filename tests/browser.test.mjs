import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = 'http://127.0.0.1:8765/';
let browser;
test.before(async () => { browser = await chromium.launch({headless:true}); });
test.after(async () => { await browser?.close(); });

test('desktop : une fiche se lit sur une page complète, jamais dans une popup', async () => {
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});
 await page.locator('.pattern').first().waitFor();
 assert.equal(await page.locator('.pattern').count(),19);
 assert.equal(await page.locator('#detail').count(),0);
 await page.getByRole('button',{name:'Serverless',exact:true}).click();
 await page.locator('#pattern-serverless-async a.detail').click();
 await page.waitForURL('**/pattern.html?id=serverless-async');
 assert.equal(await page.locator('dialog').count(),0);
 assert.equal(await page.locator('.architecture-svg').count(),1);
 assert.ok(await page.locator('.arch-node').count()>=7);
 assert.ok(await page.locator('.edge').count()>=6);
 assert.ok(await page.locator('.serverless-grid > div').count()>=6);
 await page.locator('.flow-details summary').click();
 assert.ok(await page.locator('.flow-details li').count()>=8);
 assert.equal(await page.locator('.toc').isVisible(),true);
 await page.screenshot({path:'artifacts/architecture-serverless-full-page.png',fullPage:false});
 await page.getByRole('link',{name:'Toutes les architectures'}).click();
 await page.waitForURL('**/index.html');
 await page.locator('#search').fill('mobile natif');
 assert.ok(await page.locator('.pattern').count()>=1);
 assert.deepEqual(errors,[]);
 await page.close();
});

test('mobile : fiche indépendante, navigation et glossaire',async()=>{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});
 await page.locator('.pattern').first().waitFor();
 await page.locator('[data-filter="mobile"]').click();
 assert.ok(await page.locator('.pattern').count()>=3);
 await page.locator('#pattern-mobile-native-direct a.detail').click();
 await page.waitForURL('**/pattern.html?id=mobile-native-direct');
 assert.equal(await page.locator('dialog').count(),0);
 assert.ok(await page.locator('.arch-node').count()>=6);
 assert.ok(await page.locator('.diagram-scroll').count()>0);
 assert.ok(await page.getByText(/Aucun CDN|Un CDN web n'est pas/).count()>=1);
 await page.screenshot({path:'artifacts/architecture-mobile-full-page.png',fullPage:false});
 await page.getByRole('link',{name:'Toutes les architectures'}).click();
 await page.locator('#glossaire').scrollIntoViewIfNeeded();
 assert.ok(await page.locator('.glossary-item').count()>=14);
 await page.locator('.glossary-item').filter({hasText:'Static Site Generation'}).locator('summary').click();
 assert.ok(await page.getByText(/pages HTML sont générées|pages sont/).count()>0);
 assert.deepEqual(errors,[]);
 await page.close();
});

test('comparaison : barre persistante et choix conservés à travers les filtres',async()=>{
 const page=await browser.newPage({viewport:{width:1366,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});
 await page.locator('.pattern').first().waitFor();
 const tray=page.locator('#compareTray');
 assert.equal(await tray.isVisible(),false);
 await page.locator('#pattern-spa-rest-direct [data-compare]').check();
 assert.equal(await tray.isVisible(),true);
 assert.equal(await page.locator('#launchCompare').isDisabled(),true);
 await page.locator('#pattern-bff-rest [data-compare]').check();
 assert.equal(await page.locator('#launchCompare').isEnabled(),true);
 await page.locator('#launchCompare').click();
 assert.equal(await page.locator('#comparison').isVisible(),true);
 assert.equal(await page.locator('#comparison thead th').count(),3);
 await page.screenshot({path:'artifacts/comparison-desktop.png'});
 await page.locator('#closeComparison').click();
 await page.getByRole('button',{name:'CMS & headless'}).click();
 assert.equal(await page.locator('.pattern').count(),2);
 assert.equal(await tray.isVisible(),true);
 await page.locator('#compareChoices [data-remove-compare="bff-rest"]').click();
 assert.equal(await page.locator('#launchCompare').isDisabled(),true);
 await page.locator('#clearSelection').click();
 assert.equal(await tray.isVisible(),false);
 assert.deepEqual(errors,[]);
 await page.close();
});

test('graphe complet : le chemin est conservé sans masquer les branches',async()=>{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'decision-tree.html',{waitUntil:'networkidle'});
 await page.locator('[data-select-path="0"]').waitFor();
 const initialQuestions=await page.locator('.tree-question').count();
 const initialOutcomes=await page.locator('.tree-leaf').count();
 assert.ok(initialQuestions>=13);
 assert.ok(initialOutcomes>=20);
 assert.equal(await page.locator('#tree-cms').count(),1);
 assert.equal(await page.locator('#tree-app').count(),1);
 assert.equal(await page.locator('#tree-async').count(),1);
 assert.ok(await page.locator('.graph-link').count()>80);
 await page.locator('[data-select-path="0"]').click();
 await page.locator('[data-select-path="0.1"]').click();
 await page.locator('[data-select-path="0.1.1"]').click();
 assert.equal(await page.locator('.tree-question').count(),initialQuestions);
 assert.equal(await page.locator('.tree-leaf').count(),initialOutcomes);
 assert.equal(await page.locator('.tree-choice.is-chosen').count(),3);
 assert.equal(await page.locator('.graph-link.is-active').count(),6);
 assert.equal(await page.locator('#decisionResult .result-links li').count(),2);
 assert.match(page.url(),/#path=0\.1\.1/);
 await page.screenshot({path:'artifacts/decision-graph-selected-desktop.png'});
 await page.reload({waitUntil:'networkidle'});
 await page.locator('[data-select-path="0"]').waitFor();
 assert.equal(await page.locator('.tree-choice.is-chosen').count(),3);
 await page.locator('[data-jump-to="tree-app"]').click();
 assert.match(page.url(),/#path=0\.1\.1/);
 await page.locator('[data-select-path="1.1"]').click();
 assert.equal(await page.locator('.tree-question').count(),initialQuestions);
 assert.equal(await page.locator('.tree-choice.is-chosen').count(),2);
 assert.match(page.url(),/#path=1\.1/);
 await page.locator('#startOver').click();
 assert.equal(await page.locator('.tree-choice.is-chosen').count(),0);
 assert.equal(await page.locator('.tree-question').count(),initialQuestions);
 assert.deepEqual(errors,[]);
 await page.close();
});

test('graphe → fiche CMS → retour au parcours puis comparaison directe',async()=>{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'decision-tree.html',{waitUntil:'networkidle'});
 await page.locator('[data-select-path="0"]').click();
 await page.locator('[data-select-path="0.1"]').click();
 await page.locator('[data-select-path="0.1.1"]').click();
 const result=page.locator('#decisionResult');
 assert.equal(await result.locator('.result-links li').count(),2);
 assert.match(await result.innerText(),/CMS headless/);
 await result.locator('.result-links a').first().click();
 await page.waitForURL('**/pattern.html?id=cms-headless&treePath=0.1.1');
 assert.equal(await page.locator('.architecture-svg').count(),1);
 assert.equal(await page.locator('dialog').count(),0);
 await page.locator('.controls a').filter({hasText:'Retour à l’arbre de décision'}).click();
 await page.waitForURL('**/decision-tree.html#path=0.1.1');
 assert.equal(await page.locator('.tree-choice.is-chosen').count(),3);
 await page.locator('#decisionResult .result-compare').click();
 await page.waitForURL('**/index.html#compare=cms-headless,multi-channel-bff');
 await page.locator('#comparison').waitFor({state:'visible'});
 assert.equal(await page.locator('#comparison thead th').count(),3);
 assert.deepEqual(errors,[]);
 await page.close();
});

test('comparaison mobile : action visible et tableau accessible',async()=>{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
 await page.goto(url,{waitUntil:'networkidle'});
 await page.locator('.pattern').first().waitFor();
 await page.locator('#pattern-cms-coupled [data-compare]').check();
 await page.locator('#pattern-cms-headless [data-compare]').check();
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 assert.equal(await page.locator('#launchCompare').isVisible(),true);
 await page.locator('#launchCompare').click();
 assert.equal(await page.locator('#comparison').isVisible(),true);
 assert.equal(await page.locator('#comparison thead th').count(),3);
 await page.screenshot({path:'artifacts/comparison-mobile.png'});
 await page.close();
});


test('cartes : aucun défilement interne du teaser sur toutes les tailles et tous les patterns', async()=>{
 const page=await browser.newPage({viewport:{width:1440,height:930}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [320,360,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('.pattern').first().waitFor();
  assert.equal(await page.locator('.pattern').count(),19);
  const result=await page.locator('.pattern').evaluateAll(cards=>cards.map(card=>{
    const preview=card.querySelector('.card-preview');
    const flow=preview.querySelector('.card-preview-flow');
    const parts=[...flow.querySelectorAll('.preview-node')];
    const cardRect=card.getBoundingClientRect(),flowRect=flow.getBoundingClientRect();
    return {
      id:card.id,
      hasScroll:flow.scrollWidth>flow.clientWidth+1||preview.scrollWidth>preview.clientWidth+1||
        card.scrollWidth>card.clientWidth+1,
      count:parts.length,
      nodesFit:parts.every(node=>{
        const r=node.getBoundingClientRect();
        return r.width>=44&&r.left>=flowRect.left-1&&r.right<=flowRect.right+1;
      }),
      labelPresent:!!card.querySelector('.card-value'),
      link:card.querySelector('a.detail')?.getAttribute('href'),
      tooWide:flowRect.right>cardRect.right+1
    };
  }));
  for(const item of result){
    assert.equal(item.hasScroll,false,'scroll interne '+width+'px : '+item.id);
    assert.equal(item.tooWide,false,'prévisualisation déborde de la carte '+width+'px : '+item.id);
    assert.equal(item.nodesFit,true,'un repère sort de la carte '+width+'px : '+item.id);
    assert.equal(item.count,3,'pas trois repères : '+item.id);
    assert.equal(item.labelPresent,true,'accroche absente : '+item.id);
    assert.match(item.link,/^\.\/pattern\.html\?id=/);
  }
  if(width===390)await page.screenshot({path:'artifacts/cards-no-scroll-mobile.png',fullPage:false});
  if(width===1440)await page.screenshot({path:'artifacts/cards-no-scroll-desktop.png',fullPage:false});
 }
 assert.deepEqual(errors,[]);
 await page.close();
});

test('graphe par niveaux : alignement, zoom, déplacement et responsive',async()=>{
 for(const width of [320,390,768,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'decision-tree.html',{waitUntil:'networkidle'});
  await page.locator('[data-depth="6"]').first().waitFor();
  const layout=await page.evaluate(()=>{
   const levels=new Map();
   document.querySelectorAll('.graph-node[data-depth]').forEach(el=>{
    const depth=Number(el.dataset.depth),top=Number.parseFloat(el.style.top);
    if(!levels.has(depth))levels.set(depth,new Set());
    levels.get(depth).add(top);
   });
   return {
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    aligned:[...levels.values()].every(row=>row.size===1),
    questions:document.querySelectorAll('.tree-question').length,
    leaves:document.querySelectorAll('.tree-leaf').length,
    edges:document.querySelectorAll('.graph-link').length,
    viewportWidth:document.querySelector('#graphViewport').clientWidth,
    worldWidth:document.querySelector('#treePanel').offsetWidth
   };
  });
  assert.ok(layout.overflow<=1,'débordement de page '+width+'px : '+layout.overflow);
  assert.equal(layout.aligned,true,'nœuds d’un même niveau non alignés');
  assert.ok(layout.questions>=13&&layout.leaves>=20&&layout.edges>80);
  assert.ok(layout.worldWidth>layout.viewportWidth,'la carte ne dispose pas de son espace panoramique');
  const zoom=page.locator('#zoomValue');
  const start=Number.parseInt(await zoom.innerText());
  await page.locator('#zoomIn').click();
  assert.ok(Number.parseInt(await zoom.innerText())>start,'le bouton zoom + ne fonctionne pas');
  await page.locator('#fitGraph').click();
  const fit=Number.parseInt(await zoom.innerText());
  await page.locator('#focusStart').click();
  assert.ok(Number.parseInt(await zoom.innerText())>fit,'le bouton Départ doit rendre les nœuds lisibles');
  // À 100 % sur mobile, les branches latérales sont volontairement hors écran :
  // le raccourci de navigation doit permettre d'atteindre un choix par un vrai clic.
  await page.locator('[data-jump-to="tree-cms"]').click();
  await page.locator('[data-select-path="0"]').click();
  // Les chemins plus profonds sont testés indépendamment du cadrage (pan/zoom).
  await page.locator('[data-select-path="0.1"]').evaluate(el=>el.click());
  await page.locator('[data-select-path="0.1.1"]').evaluate(el=>el.click());
  assert.equal(await page.locator('.tree-branch.is-on-path').count(),3);
  assert.equal(await page.locator('.graph-link.is-active').count(),6);
  assert.equal(await page.locator('.tree-leaf.is-chosen').count(),1);
  assert.equal(await page.locator('.tree-question').count(),layout.questions);
  await page.locator('#focusPath').click();
  if(width===390||width===1280)await page.screenshot({path:'artifacts/decision-graph-'+width+'.png'});
  assert.deepEqual(errors,[]);
  await page.close();
 }
});


test('graphe lisible : largeur d’écran exploitée et zoom natif à 100 %',async()=>{
 for(const width of [1280,1440,1920,2560]){
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'decision-tree.html',{waitUntil:'networkidle'});
  await page.locator('[data-select-path="0"]').waitFor();
  const measures=await page.evaluate(()=>{
   const root=document.querySelector('.wrap').getBoundingClientRect();
   const canvas=document.querySelector('#graphViewport').getBoundingClientRect();
   const cssTransform=document.querySelector('#treePanel').style.transform;
   return {rootWidth:root.width,canvasWidth:canvas.width,transform:cssTransform,
    typeSize:getComputedStyle(document.querySelector('.graph-node strong')).fontSize,
    bodyOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  });
  assert.ok(measures.rootWidth>=Math.min(width-44,2048),'conteneur trop étroit : '+width+'px / '+measures.rootWidth);
  assert.ok(measures.canvasWidth>=width*.64,'graphe trop étroit : '+width+'px / '+measures.canvasWidth);
  assert.ok(measures.bodyOverflow<=1,'débordement de la page : '+width);
  assert.equal(await page.locator('#zoomValue').innerText(),'100 %');
  assert.doesNotMatch(measures.transform,/scale\(/,'le texte ne doit pas être rasterisé à un zoom par défaut');
  assert.ok(Number.parseFloat(measures.typeSize)>=14);
  await page.locator('[data-select-path="0"]').click();
  await page.locator('[data-select-path="0.1"]').click();
  await page.locator('[data-select-path="0.1.1"]').click();
  assert.equal(await page.locator('#zoomValue').innerText(),'100 %');
  assert.doesNotMatch(await page.locator('#treePanel').evaluate(el=>el.style.transform),/scale\(/);
  assert.equal(await page.locator('.tree-choice.is-chosen').count(),3);
  if(width===1920){
   await page.screenshot({path:'artifacts/decision-graph-sharp-wide-1920.png'});
   const before=await page.locator('#graphViewport').evaluate(el=>el.clientWidth);
   await page.locator('#togglePathPanel').click();
   await page.waitForTimeout(80);
   const after=await page.locator('#graphViewport').evaluate(el=>el.clientWidth);
   assert.ok(after>=before+220,'le masquage du parcours ne libère pas la largeur');
   assert.equal(await page.locator('#pathPanel').isVisible(),false);
   assert.equal(await page.locator('#togglePathPanel').getAttribute('aria-expanded'),'false');
   assert.equal(await page.locator('.tree-choice.is-chosen').count(),3);
   await page.screenshot({path:'artifacts/decision-graph-sharp-full-width-1920.png'});
   await page.locator('#togglePathPanel').click();
   assert.equal(await page.locator('#pathPanel').isVisible(),true);
   assert.equal(await page.locator('#decisionResult .result-links li').count(),2);
  }
  assert.deepEqual(errors,[]);
  await page.close();
 }
});

test('graphe net : translation alignée aux pixels physiques à DPR 2',async()=>{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
 await page.goto(url+'decision-tree.html',{waitUntil:'networkidle'});
 await page.locator('[data-select-path="0"]').waitFor();
 await page.locator('[data-select-path="0"]').click();
 const actual=await page.locator('#treePanel').evaluate(el=>{
  const s=el.style.transform;
  const m=s.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
  return {transform:s,tx:m?Number(m[1]):NaN,ty:m?Number(m[2]):NaN};
 });
 assert.doesNotMatch(actual.transform,/scale\(/);
 assert.ok(Number.isFinite(actual.tx)&&Number.isFinite(actual.ty));
 assert.ok(Math.abs(actual.tx*2-Math.round(actual.tx*2))<.0001);
 assert.ok(Math.abs(actual.ty*2-Math.round(actual.ty*2))<.0001);
 await page.close();
});


test('patterns sans backend : filtre, assistant, fiches détaillées, comparaison et mobile',async()=>{
 const page=await browser.newPage({viewport:{width:1366,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});
 await page.locator('.pattern').first().waitFor();
 await page.locator('[data-filter="local-first"]').click();
 assert.equal(await page.locator('.pattern').count(),2);
 assert.equal(await page.locator('#pattern-spa-localstorage').count(),1);
 assert.equal(await page.locator('#pattern-pwa-indexeddb').count(),1);
 await page.locator('#pattern-spa-localstorage [data-compare]').check();
 await page.locator('#pattern-pwa-indexeddb [data-compare]').check();
 await page.locator('#launchCompare').click();
 assert.equal(await page.locator('#comparison thead th').count(),3);
 await page.locator('#closeComparison').click();
 await page.locator('#pattern-spa-localstorage .detail').click();
 await page.waitForURL('**/pattern.html?id=spa-localstorage');
 assert.equal(await page.locator('.architecture-svg').count(),1);
 assert.equal(await page.locator('dialog').count(),0);
 assert.ok(await page.getByText(/Éditeur personnel de documents ou de paramètres/).count()>=1);
 assert.equal(await page.locator('.arch-node').count(),4);
 assert.equal(await page.locator('.architecture-svg .arch-node-client').count(),1);
 assert.equal(await page.locator('.architecture-svg .arch-node-data').count(),2);
 assert.ok(await page.getByText('Application web (SPA)',{exact:true}).count()>=1);
 assert.equal(await page.getByText('Espace de travail',{exact:true}).count(),0);
 await page.screenshot({path:'artifacts/browser-only-simple-architecture-desktop.png'});
 await page.getByRole('link',{name:'Toutes les architectures'}).click();
 await page.locator('#dataSource').selectOption('local-rich');
 assert.match(await page.locator('#suggestTitle').innerText(),/offline-first/);
 assert.match(await page.locator('#suggestReason').innerText(),/IndexedDB/);
 assert.equal(await page.locator('#aggregation').isDisabled(),true);
 await page.locator('#suggestOpen').click();
 await page.waitForURL('**/pattern.html?id=pwa-indexeddb');
 assert.equal(await page.locator('.architecture-svg').count(),1);
 assert.equal(await page.locator('.arch-node').count(),5);
 assert.equal(await page.locator('.architecture-svg .arch-node-client').count(),1);
 assert.ok(await page.getByText('Service worker + cache').count()>=1);
 assert.equal(await page.getByText('Vues et recherches',{exact:true}).count(),0);
 await page.screenshot({path:'artifacts/browser-only-offline-architecture-desktop.png'});
 assert.deepEqual(errors,[]);
 await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
 await mobile.goto(url,{waitUntil:'networkidle'});
 await mobile.locator('[data-filter="local-first"]').click();
 assert.equal(await mobile.locator('.pattern').count(),2);
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
 await mobile.screenshot({path:'artifacts/local-first-cards-mobile.png'});
 await mobile.close();
});

test('arbre de décision local-first : retour fiche et comparaison du stockage',async()=>{
 const page=await browser.newPage({viewport:{width:1440,height:930}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'decision-tree.html',{waitUntil:'networkidle'});
 await page.locator('[data-select-path="1.0.4.2"]').waitFor();
 // Un graphe panoramique peut avoir une partie des choix hors écran :
 // on teste la sélection événementielle sans forcer le viewport à changer.
 await page.locator('[data-select-path="1.0.4.2"]').evaluate(el=>el.click());
 assert.match(page.url(),/#path=1\.0\.4\.2$/);
 assert.equal(await page.locator('.tree-choice.is-chosen').count(),4);
 assert.equal(await page.locator('#decisionResult .result-links li').count(),2);
 assert.match(await page.locator('#decisionResult').innerText(),/localStorage/);
 assert.match(await page.locator('#decisionResult').innerText(),/IndexedDB/);
 await page.locator('#decisionResult .result-links a').first().click();
 await page.waitForURL('**/pattern.html?id=spa-localstorage&treePath=1.0.4.2');
 await page.locator('.controls a').filter({hasText:'Retour à l’arbre de décision'}).click();
 await page.waitForURL('**/decision-tree.html#path=1.0.4.2');
 assert.equal(await page.locator('.tree-choice.is-chosen').count(),4);
 await page.locator('#decisionResult .result-compare').click();
 await page.waitForURL('**/index.html#compare=spa-localstorage,pwa-indexeddb');
 assert.equal(await page.locator('#comparison thead th').count(),3);
 assert.deepEqual(errors,[]);
 await page.close();
});
