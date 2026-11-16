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
 assert.equal(await page.locator('.pattern').count(),17);
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

test('arbre intégral : toutes les branches restent visibles quand le choix avance',async()=>{
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
 await page.locator('[data-select-path="0"]').click();
 await page.locator('[data-select-path="0.1"]').click();
 await page.locator('[data-select-path="0.1.1"]').click();
 assert.equal(await page.locator('.tree-question').count(),initialQuestions);
 assert.equal(await page.locator('.tree-leaf').count(),initialOutcomes);
 assert.equal(await page.locator('.tree-choice.is-chosen').count(),3);
 assert.equal(await page.locator('#decisionResult .result-links li').count(),2);
 assert.match(page.url(),/#path=0\.1\.1/);
 await page.screenshot({path:'artifacts/decision-tree-entire-selected.png',fullPage:false});
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

test('arbre → fiche CMS → retour au parcours puis comparaison directe',async()=>{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'decision-tree.html',{waitUntil:'networkidle'});
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
  assert.equal(await page.locator('.pattern').count(),17);
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
