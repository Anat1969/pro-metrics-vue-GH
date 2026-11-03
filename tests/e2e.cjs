// בדיקת קצה לקצה מול vite preview. ai-menu.js נטען מעותק מקומי, כי הסביבה לא תמיד מגיעה ל-vercel.app.
// usage: node tests/e2e.cjs http://127.0.0.1:4170/ <dir-with-ai-menu.js-and-ashdod-logo.png>
const { chromium } = require('playwright');
const fs = require('fs');
const [base, assets] = process.argv.slice(2);
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };

async function page(b, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...opts });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', e => p.errors.push(e.message));
  await p.route('**/appofapp-gh.vercel.app/ai-menu.js', r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(`${assets}/ai-menu.js`) }));
  await p.route('**/appofapp-gh.vercel.app/ashdod-logo.png', r => r.fulfill({ contentType: 'image/png', body: fs.readFileSync(`${assets}/ashdod-logo.png`) }));
  await p.route('**/basemaps.cartocdn.com/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64') }));
  const snap = JSON.parse(fs.readFileSync(__dirname + '/../src/data/plans-snapshot.json', 'utf8'));
  await p.route('**/rest/v1/plan_projects*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(
    r.request().url().includes('geojson')
      ? Object.entries(snap.geo).map(([id, g]) => ({ id, center: g.center, geojson: { type: 'FeatureCollection', features: g.polygons.map(c => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: c } })) } }))
      : snap.plans) }));
  await p.route('**/rest/v1/plan_media*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(snap.docs) }));
  await p.route('**/rest/v1/shchuna_plan_scores*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(snap.scores) }));
  await p.route('**/rest/v1/quarters*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(snap.quarters) }));
  return p;
}
const score = p => p.locator('.kpi-big').textContent().then(Number);

(async () => {
  const b = await chromium.launch();
  const p = await page(b);
  await p.goto(base, { waitUntil: 'networkidle' });

  ok(await p.locator('ai-menu .logo').isVisible(), 'logo button in the top bar');
  ok(await p.locator('ai-menu').getAttribute('brand') === 'ashdod', 'municipality logo (brand="ashdod")');
  ok(!(await p.locator('header >> text=העתקת קישור').first().isVisible().catch(() => false)), 'no loose development buttons in the bar');
  ok(await p.locator('.home-iso polygon').count() > 50, 'home: isometric city of plans rendered');
  ok(await p.getByText('נתונים חיים').isVisible(), 'home: live data from the city database (mocked)');
  ok(await p.getByText('מכשיר המדידה').first().isVisible() && await p.getByText('לאשר עכשיו?', { exact: false }).isVisible(), 'home: the two apps and their two questions are stated');
  ok(await p.getByText('אין עדיין בדיקות ידניות').isVisible(), 'home: empty manual list explained');
  const chipBg = await p.evaluate(() => { const b = document.createElement('button'); b.className = 'chip'; document.body.append(b); const c = getComputedStyle(b).backgroundColor; b.remove(); return c; });
  ok(chipBg !== 'rgba(0, 0, 0, 0)', 'chips look like buttons (background)');

  // ── לוח התוכניות ──
  await p.getByRole('button', { name: 'לוח התוכניות בעיר' }).click();
  await p.waitForURL(/#\/plans/);
  ok(await p.locator('.plan-row').count() === 18, 'plans: 18 plans listed (17 urban renewal + 1 new construction)');
  await p.locator('.dash-filters').getByRole('button', { name: /^התחדשות עירונית/ }).click();
  ok(await p.locator('.plan-row').count() === 17, 'kind selector: 17 urban renewal');
  await p.locator('.dash-filters').getByRole('button', { name: 'הכול' }).nth(1).click();
  ok(await p.locator('.gb-group').count() === 3, 'plans: three gates (תב"ע, תוכנית בינוי, בדיעבד)');
  const passBefore = Number(await p.locator('.kpis .kpi-big').first().textContent());
  for (let i = 0; i < 5; i++) await p.getByRole('button', { name: 'הורדת היעד בתב"ע' }).click();
  const passAfter = Number(await p.locator('.kpis .kpi-big').first().textContent());
  ok(passAfter > passBefore, `lowering the תב"ע target to 30 changes verdicts (${passBefore} → ${passAfter} pass)`);
  await p.getByRole('button', { name: 'העלאת היעד בתב"ע' }).click({ clickCount: 1 });
  for (let i = 0; i < 4; i++) await p.getByRole('button', { name: 'העלאת היעד בתב"ע' }).click();
  await p.locator('.gb-row').first().click();
  ok(p.url().includes('p='), 'selected plan is kept in the URL');
  ok(await p.locator('.ind-panel .tone h4').first().isVisible(), 'plan panel shows the verdict');
  ok(await p.locator('.ask').count() > 0, 'plan panel lists what to require');
  ok(await p.locator('.stage').count() >= 2 && (await p.locator('.stage.now').textContent()).includes('עד'), 'panel shows max requestable now, and what moves to the next stages');
  ok(await p.locator('.checks li').count() >= 6 && !!(await p.locator('.checks li').first().getAttribute('title')), 'automatic checks listed, each with how it was checked');
  ok((await p.locator('a', { hasText: 'המדידה, עם ציטוטים' }).getAttribute('href')).startsWith('https://shchuna360.vercel.app/plans/'), 'link to the measurement app');
  ok((await p.locator('a', { hasText: 'דף התוכנית' }).getAttribute('href')).startsWith('https://ashdod-ma-nivne.vercel.app/p/'), 'link to the plan in מה נבנה סביבי');
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await p.getByRole('button', { name: 'נוסח לפרוטוקול' }).click();
  const memo = await p.evaluate(() => navigator.clipboard.readText());
  ok(/אפשר לדרוש עד \d+ נקודות. הוכחו \d+/.test(memo), 'committee text copied, with the stage maximum');
  // הדוח המלא
  await p.getByRole('link', { name: 'הדוח המלא' }).click();
  await p.waitForURL(/#\/report\//);
  ok(await p.locator('.rp-sec').count() === 7, 'report: 7 sections');
  ok(await p.locator('.rp-metrics tbody tr').count() === 44, 'report: all 44 metrics with how each was checked');
  ok(await p.locator('.rp-sec').nth(2).locator('tbody tr').count() >= 6, 'report: automatic checks table');
  ok((await p.locator('.rp-sec').nth(6).textContent()).includes('מידע כללי שחסר'), 'report: missing information stated');
  ok((await p.locator('.rp-sec').nth(5).textContent()).length > 200, 'report: stage ג conditions (permit and execution)');
  const [wdl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'הורדת Word' }).click()]);
  ok(fs.readFileSync(await wdl.path()).subarray(0, 2).toString() === 'PK', 'report: Word download is a .docx');
  ok((await p.locator('.rp-letter').textContent()).includes('הנדון:'), 'report: developer letter ready to send');
  const [ldl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'המכתב כ-Word' }).click()]);
  ok(fs.readFileSync(await ldl.path()).subarray(0, 2).toString() === 'PK', 'letter: Word');
  await p.goBack();
  await p.getByRole('button', { name: 'התוכנית הבאה' }).click();
  ok(await p.locator('.petal').count() === 44, 'plan rose drawn from the measurement');
  // מפה
  await p.locator('.view-switch').getByRole('button', { name: 'מפה' }).click();
  await p.waitForTimeout(300);
  ok(p.url().includes('m=map') && await p.locator('.plan-map path').count() === 18, 'map: 18 plan boundaries from GIS ' + p.url());
  const vb0 = await p.locator('.plan-map').getAttribute('viewBox');
  await p.getByRole('button', { name: 'התקרבות' }).click();
  ok(await p.locator('.plan-map').getAttribute('viewBox') !== vb0, 'map: zoom in button');
  await p.getByRole('button', { name: 'איפוס המפה' }).click();
  ok(await p.locator('.plan-map').getAttribute('viewBox') === vb0, 'map: reset');
  await p.locator('.plan-map path').nth(2).click();
  ok(p.url().includes('p='), 'map: click selects the plan');
  await p.locator('.view-switch').getByRole('button', { name: 'לוח השערים' }).click();
  // מינימום לפרק
  await p.getByRole('group', { name: 'מינימום לכל פרק' }).getByRole('button', { name: '50%' }).click();
  await p.locator('.gb-row').first().click();
  ok(await p.locator('.checks li', { hasText: 'מינימום 50% לכל פרק' }).count() === 1, 'chapter minimum adds an explained check');
  await p.getByRole('group', { name: 'מינימום לכל פרק' }).getByRole('button', { name: 'כבוי' }).click();
  ok(await p.locator('.checks li', { hasText: 'לכל פרק' }).count() === 0, 'chapter minimum off by default and can be turned off');
  await p.getByRole('button', { name: 'סגירה' }).click();
  // דוח ועדה מרוכז
  await p.getByRole('link', { name: 'דוח ועדה מרוכז' }).click();
  await p.waitForURL(/#\/batch/);
  ok(await p.locator('.rp-table tbody tr').count() === 18, 'committee report: all 18 plans');
  const [bdl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'הורדת Word' }).click()]);
  ok(fs.readFileSync(await bdl.path()).subarray(0, 2).toString() === 'PK', 'committee report: Word');
  await p.getByRole('button', { name: 'אישור תב"ע' }).click();
  ok(await p.locator('.rp-table tbody tr').count() === 5, 'committee report: filter by gate');
  await p.goto(base + '#/plans', { waitUntil: 'networkidle' });
  await p.locator('.dash-filters').getByRole('button', { name: /^תלויה בראיות/ }).click();
  ok((await p.locator('.plan-row').count()) === (await p.locator('.plan-row .ops-dot[title="תלויה בראיות"]').count()), 'verdict selector filters the list');
  await p.locator('.search input').fill('אחד העם');
  ok((await p.locator('.plan-row').count()) <= 1, 'plan search');
  await p.locator('.search .x').click();

  await p.goto(base, { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'בדיקה לדוגמה' }).click();
  await p.waitForURL(/#\/project\/demo-/);
  ok(await p.locator('.petal').count() === 44, 'dashboard: 44 petals in the rose');
  const s0 = await score(p);
  ok(s0 > 0, `dashboard: demo score ${s0}`);

  await p.locator('.petal[data-id="a03"]').click();
  ok((await p.locator('.ind-title').textContent()).includes('צמידות דופן'), 'petal click opens the indicator in the side column');
  ok(p.url().includes('i=a03'), 'selected indicator is kept in the URL');
  await p.locator('.score-squares button').nth(1).click();
  await p.waitForTimeout(150);
  const s1 = await score(p);
  ok(s1 === s0 - 3, `score square updates the total (${s0} → ${s1})`);
  ok(await p.getByRole('button', { name: 'בתהליך' }).getAttribute('aria-pressed') === 'true', 'lower score sets status "in progress"');
  ok(await p.locator('.ind-notes + .voice .voice-btn').isVisible(), 'recording button under the notes field');
  await p.locator('.ind-notes').fill('נבדק מול תשריט התב"ע');
  await p.reload({ waitUntil: 'networkidle' });
  ok(await score(p) === s1, 'score persists after reload');
  ok(await p.locator('.ind-notes').inputValue() === 'נבדק מול תשריט התב"ע', 'notes persist after reload');
  await p.getByRole('button', { name: 'המדד הבא' }).click();
  ok(p.url().includes('i=a04'), 'next indicator button');
  await p.getByRole('button', { name: 'סגירה' }).click();
  ok(await p.getByText('הערכה אוטומטית').first().isVisible(), 'closing returns to the self-explaining evaluation');

  await p.getByRole('button', { name: /^מרחב טבעי וציבורי/ }).first().click();
  ok((await p.locator('.ind-row').count()) === 20, 'chapter selector: one click selects one chapter (20)');
  await p.getByRole('button', { name: 'הוספת שימוש יעיל במשאבים' }).click();
  ok((await p.locator('.ind-row').count()) === 29, 'chapter selector: "+" adds a chapter (29)');
  await p.locator('.dash-filters').getByRole('button', { name: 'הכול' }).first().click();
  ok((await p.locator('.ind-row').count()) === 44, 'chapter selector: "הכול" resets (44)');

  await p.locator('.search input').fill('מים');
  const n = await p.locator('.ind-row').count();
  ok(n > 0 && n < 10, `hebrew search "מים" finds ${n} indicators`);
  ok(await p.locator('.petal[style*="opacity: 0.18"]').count() > 30, 'search dims non-matching petals');
  await p.locator('.search .x').click();
  ok((await p.locator('.ind-row').count()) === 44, 'search X clears');

  await p.locator('.ops-row').first().click();
  ok(await p.locator('.ind-panel .score-squares').isVisible(), 'opportunity row opens its indicator');

  await p.getByRole('link', { name: 'יומן שינויים' }).click();
  ok(await p.locator('.tl-row').count() > 10, 'timeline lists score changes');

  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('.dash-head').getByRole('button', { name: 'ייצוא דוח Word' }).click()]);
  const head = fs.readFileSync(await dl.path()).subarray(0, 2).toString();
  ok(head === 'PK', 'Word export downloads a .docx file');

  await p.locator('ai-menu .logo').click();
  ok(await p.locator('ai-menu').getByText('מחיקת הפרויקט').isVisible(), 'delete lives inside the logo menu');
  await p.locator('ai-menu').getByText('מחיקת הפרויקט').click();
  await p.getByRole('button', { name: 'ביטול' }).click();
  ok(p.url().includes('/project/'), 'delete asks first, cancel keeps the project');

  const cdp = await p.context().newCDPSession(p);
  await p.goto(base, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  ok(inst.installabilityErrors.length === 0, `installable (${JSON.stringify(inst.installabilityErrors)})`);
  ok(p.errors.length === 0, `no JS errors (${p.errors.join(' | ')})`);

  // נייד + הפחתת תנועה
  const m = await page(b, { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await m.goto(base, { waitUntil: 'networkidle' });
  await m.getByRole('button', { name: 'בדיקה לדוגמה' }).click();
  await m.waitForURL(/project/);
  const hs = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok(!hs, 'mobile: no horizontal scroll');
  await m.getByRole('tab', { name: 'רשימה' }).click();
  await m.locator('.ind-row').nth(4).click();
  ok(await m.locator('.ind-panel .score-squares').isVisible(), 'mobile: list row opens the indicator tab');
  const anim = await m.evaluate(() => getComputedStyle(document.querySelector('.petal-fill') || document.body).animationName);
  ok(anim === 'none', 'reduced motion: no animation');
  ok(m.errors.length === 0, `mobile: no JS errors (${m.errors.join(' | ')})`);

  await b.close();
  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
