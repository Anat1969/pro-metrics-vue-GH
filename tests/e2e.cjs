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
  ok(await p.locator('.home-iso polygon').count() > 100, 'home: isometric 3D neighborhood rendered');
  ok(await p.getByText('עוד אין פרויקטים').isVisible(), 'home: empty state explained');

  await p.getByRole('button', { name: 'פתיחת פרויקט לדוגמה' }).click();
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
  await m.getByRole('button', { name: 'פתיחת פרויקט לדוגמה' }).click();
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
