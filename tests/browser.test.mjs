import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = 'http://127.0.0.1:8765/';
let browser;

test.before(async () => {
  browser = await chromium.launch({ headless: true });
});
test.after(async () => {
  await browser?.close();
});

test('desktop : recherche, schéma vertical complet et parcours serverless', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  await page.locator('.pattern').first().waitFor();
  assert.equal(await page.locator('.pattern').count(), 15);
  await page.getByRole('button', { name: 'Serverless', exact: true }).click();
  assert.ok(await page.locator('.pattern').count() >= 5);
  await page.locator('#pattern-serverless-async [data-open]').click();
  const dialog = page.locator('#detail');
  await dialog.waitFor({ state: 'visible' });
  assert.equal(await dialog.locator('.architecture-svg').count(), 1);
  assert.ok(await dialog.locator('.arch-node').count() >= 7);
  assert.ok(await dialog.locator('.edge').count() >= 6);
  assert.ok((await dialog.locator('svg').getAttribute('height')) > 500);
  assert.ok((await dialog.locator('.serverless-grid > div').count()) >= 6);
  await dialog.getByText(/liaisons et protocoles/).click();
  assert.ok(await dialog.locator('.flow-details li').count() >= 8);
  await page.screenshot({ path: 'artifacts/architecture-serverless-desktop.png', fullPage: false });
  await dialog.getByRole('button', { name: /Fermer/ }).click();
  await page.getByRole('button', { name: 'Tous', exact: true }).click();
  await page.locator('#search').fill('mobile natif');
  assert.ok(await page.locator('.pattern').count() >= 1);
  assert.deepEqual(errors, []);
  await page.close();
});

test('mobile : glossaire, schéma haut-bas et clients distincts', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('.pattern').first().waitFor();
  await page.locator('[data-filter="mobile"]').click();
  assert.ok(await page.locator('.pattern').count() >= 3);
  await page.locator('#pattern-mobile-native-direct [data-open]').click();
  const dialog = page.locator('#detail');
  await dialog.waitFor({ state: 'visible' });
  assert.ok((await dialog.locator('.arch-node').count()) >= 6);
  assert.match(await dialog.locator('.diagram-scroll').getAttribute('class'), /diagram-scroll/);
  assert.ok(await dialog.getByText(/Aucun CDN|Un CDN web n'est pas/).count() >= 1);
  await page.screenshot({path:'artifacts/architecture-mobile-detail.png',fullPage:false});
  await dialog.getByRole('button',{name:/Fermer/}).click();
  await page.locator('#glossaire').scrollIntoViewIfNeeded();
  assert.ok(await page.locator('.glossary-item').count() >= 14);
  await page.locator('.glossary-item').filter({hasText:'Static Site Generation'}).locator('summary').click();
  assert.ok(await page.getByText(/pages HTML sont générées|pages sont/).count() > 0);
  assert.deepEqual(errors,[]);
  await page.close();
});
