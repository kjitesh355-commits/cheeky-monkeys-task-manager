import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 30-step end-to-end acceptance suite: signup -> department/project/task ->
// board/planner/AI -> channel/doc persistence -> invite -> logout -> re-login.
//
// WARNING: phase 0 WIPES the target Supabase project — it truncates every
// public table and deletes all auth users. Only run against a disposable
// workspace (local dev or the demo project), never against real user data.
//
// Configuration (environment variables; locally read from .env.local):
//   BASE                        app under test, default http://localhost:3000
//                               (--base=<url> overrides, e.g. production)
//   SUPABASE_URL                or NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   server-side Supabase secret (DB assertions)
//   SUPABASE_PAT                management API token (phase-0 TRUNCATE SQL)

const loadLocalEnv = () => {
  try {
    const text = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    const out = {};
    for (const line of text.split(/\r?\n/)) {
      if (line.trim().startsWith('#')) continue;
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
};

const localEnv = loadLocalEnv();
const fromEnv = (key) => process.env[key] || localEnv[key];

const baseArg = process.argv.find((a) => a.startsWith('--base='));
const BASE = baseArg ? baseArg.slice('--base='.length) : fromEnv('BASE') || 'http://localhost:3000';
const SUPA = fromEnv('SUPABASE_URL') || fromEnv('NEXT_PUBLIC_SUPABASE_URL');
const SEC = fromEnv('SUPABASE_SERVICE_ROLE_KEY');
const PAT = fromEnv('SUPABASE_PAT');

const missing = [
  !SUPA && 'SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)',
  !SEC && 'SUPABASE_SERVICE_ROLE_KEY',
  !PAT && 'SUPABASE_PAT',
].filter(Boolean);
if (missing.length) {
  console.error(`Missing required configuration: ${missing.join(', ')}`);
  console.error('Set them in the environment or in .env.local (see .env.example).');
  process.exit(2);
}

const PROJECT_REF = new URL(SUPA).hostname.split('.')[0];

const results = [];
const consoleErrors = [];
const pageErrors = [];
let section = 'boot';

const check = (name, ok, extra) => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${extra ? ' :: ' + extra : ''}`);
};

const step = async (name, fn) => {
  section = name;
  try {
    const extra = await fn();
    check(name, true, typeof extra === 'string' ? extra : undefined);
  } catch (e) {
    check(name, false, String(e && e.message ? e.message : e).slice(0, 300));
  }
};

const mgmt = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PAT}` },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`mgmt ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const rest = async (path) => {
  const r = await fetch(`${SUPA}/rest/v1/${path}`, {
    headers: { apikey: SEC, Authorization: `Bearer ${SEC}` },
  });
  if (!r.ok) throw new Error(`rest ${r.status} ${path} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const poll = async (fn, ms = 8000, iv = 300) => {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < ms) {
    try {
      last = await fn();
      if (last) return last;
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, iv));
  }
  return last;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`${section}: ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', (e) => pageErrors.push(`${section}: ${String(e).slice(0, 200)}`));

  const waitNav = () => page.locator('[title="My Tasks"]').first().waitFor({ state: 'visible', timeout: 30000 });
  const modalSubmit = () => page.locator('.fixed.inset-0.z-50 form button[type="submit"]').last();
  const ts = Date.now();
  const email = `acceptance-${ts}@company.com`;
  const mateEmail = `acceptance-mate-${ts}@company.com`;
  const password = 'Acceptance123!';
  let meId = null;
  let mateId = null;

  // ---------- Phase 0: reset the workspace so this run starts from zero ----------
  console.log('--- phase 0: reset workspace ---');
  try {
    const tables = await mgmt("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'");
    const names = tables.map((t) => t.table_name);
    if (names.length) await mgmt(`truncate table ${names.map((n) => `"${n}"`).join(', ')} cascade`);
    const au = await fetch(`${SUPA}/auth/v1/admin/users?page=1&per_page=100`, {
      headers: { apikey: SEC, Authorization: `Bearer ${SEC}` },
    });
    const auBody = await au.json();
    const users = auBody.users || [];
    for (const u of users) {
      await fetch(`${SUPA}/auth/v1/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { apikey: SEC, Authorization: `Bearer ${SEC}` },
      });
    }
    console.log(`reset ok: ${names.length} tables truncated, ${users.length} auth users deleted`);
  } catch (e) {
    console.log('RESET FAILED: ' + e.message);
    await browser.close();
    process.exit(2);
  }

  // ================= 1. Unauthenticated / redirects to /login =================
  await step('1. unauthenticated / redirects to login', async () => {
    await page.goto(BASE + '/');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    return new URL(page.url()).pathname;
  });

  // ================= 2. Signup form renders =================
  await step('2. signup form renders (Request Access)', async () => {
    await page.goto(BASE + '/signup');
    await page.getByText('Request Access').first().waitFor({ timeout: 10000 });
    // wait for hydration to settle (pre-hydration DOM can transiently hold two form copies)
    await page.waitForFunction(() => document.querySelectorAll('input#name').length === 1, null, {
      timeout: 15000,
    });
  });

  // ================= 3. Signup succeeds via UI =================
  await step('3. signup succeeds via UI', async () => {
    await page.locator('#name').fill('Acceptance Admin');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('#confirmPassword').fill(password);
    await page.locator('form button[type="submit"]').click();
    await page.getByText(/Account created/).first().waitFor({ timeout: 10000 });
    return email;
  });

  // ================= 4. Profile auto-created with ADMIN role =================
  await step('4. profile auto-created in DB with role ADMIN (trigger)', async () => {
    const row = await poll(async () => {
      const r = await rest(`profiles?email=eq.${encodeURIComponent(email)}&select=id,name,email,role`);
      return r.length ? r[0] : null;
    }, 8000);
    if (!row) throw new Error('profile row not created by signup trigger');
    if (row.role !== 'ADMIN') throw new Error(`role=${row.role}, expected ADMIN (first signup)`);
    if (row.name !== 'Acceptance Admin') throw new Error(`name=${row.name}`);
    meId = row.id;
    return `id ${meId}, role ${row.role}`;
  });

  // ================= 5. Unauthenticated API call -> 401 =================
  await step('5. unauthenticated API call rejected with 401', async () => {
    const r = await fetch(BASE + '/api/tasks');
    if (r.status !== 401) throw new Error(`status ${r.status}, expected 401`);
    return 'GET /api/tasks -> 401';
  });

  // ================= 6. Login via UI lands in workspace =================
  await step('6. login via UI lands in workspace', async () => {
    // Signup auto-confirms (mailer_autoconfirm) and leaves a session;
    // clear cookies so the login form path is exercised for real.
    await page.context().clearCookies();

    await page.goto(BASE + '/login');
    await page.getByPlaceholder('you@company.com').first().fill(email);
    await page.locator('form input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
    await waitNav();
    const path = new URL(page.url()).pathname;
    if (path === '/login') throw new Error('still on /login');
    return path;
  });

  // ================= 7. Create department =================
  await step('7. create department (DB-backed)', async () => {
    await waitNav();
    await page.getByRole('button', { name: 'Create more' }).click();
    await page.getByRole('menuitem', { name: 'New Department' }).click();
    await page.getByPlaceholder('e.g. Finance, Legal, Customer Support').fill('Acceptance Dept');
    await modalSubmit().click();
    await page.getByPlaceholder('e.g. Finance, Legal, Customer Support').waitFor({ state: 'detached', timeout: 8000 });
    const rows = await poll(async () => {
      const r = await rest('departments?select=id,name');
      return r.find((d) => d.name === 'Acceptance Dept') || null;
    }, 8000);
    if (!rows) throw new Error('department row not found in DB');
    return `id ${rows.id}`;
  });

  // ================= 8. Create project =================
  await step('8. create project (DB-backed)', async () => {
    await page.getByRole('button', { name: 'Create more' }).click();
    await page.getByRole('menuitem', { name: 'New Project' }).click();
    await page.getByPlaceholder('e.g. Q4 Website Redesign & Brand Launch').fill('Acceptance Project');
    await modalSubmit().click();
    await page.getByPlaceholder('e.g. Q4 Website Redesign & Brand Launch').waitFor({ state: 'detached', timeout: 8000 });
    const rows = await poll(async () => {
      const r = await rest('projects?select=id,name');
      return r.find((p) => p.name === 'Acceptance Project') || null;
    }, 8000);
    if (!rows) throw new Error('project row not found in DB');
    return `id ${rows.id}`;
  });

  // ================= 9. Create task (due today) =================
  await step('9. create task due today (DB-backed)', async () => {
    await page.getByRole('button', { name: 'Task', exact: true }).first().click();
    await page.waitForSelector('input[placeholder="e.g. September Social Media Campaign Creative"]', { timeout: 8000 });
    await page.fill('input[placeholder="e.g. September Social Media Campaign Creative"]', 'Acceptance Task');
    await page.locator('form input[type="date"]').first().fill(new Date().toISOString().split('T')[0]);
    await page.locator('form button[type="submit"]:has-text("Create Task")').click();
    await page.waitForTimeout(800);
    const rows = await poll(async () => {
      const r = await rest(`tasks?title=eq.${encodeURIComponent('Acceptance Task')}&select=id,title,status`);
      return r.length ? r : null;
    }, 8000);
    if (!rows) throw new Error('task row not found in DB');
    return `id ${rows[0].id}, status ${rows[0].status}`;
  });

  // ================= 10. Task appears in My Tasks =================
  await step('10. task visible in My Tasks list', async () => {
    await page.locator('[title="My Tasks"]').first().click();
    await page.waitForURL(/\/my-tasks/, { timeout: 10000 });
    await page.getByText('Acceptance Task').first().waitFor({ timeout: 10000 });
  });

  // ================= 11. Task card on Board =================
  await step('11. task card visible in Board view', async () => {
    await page.getByRole('button', { name: 'Board' }).first().click();
    await page.waitForURL(/view=board/, { timeout: 10000 });
    await page.getByText('Acceptance Task').first().waitFor({ timeout: 10000 });
    await page.getByRole('button', { name: 'List' }).first().click();
    await page.waitForTimeout(400);
  });

  // ================= 12. Task detail panel opens =================
  await step('12. task detail panel opens with title', async () => {
    await page.getByText('Acceptance Task').first().click();
    await page.waitForSelector('aside[role="dialog"]', { timeout: 8000 });
    const visible = await page.locator('aside[role="dialog"]').getByText('Acceptance Task').first().isVisible();
    if (!visible) throw new Error('title not shown in detail panel');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // ================= 13. AI assistant answers "due today" =================
  await step('13. AI due-today answer references the task', async () => {
    await page.goto(BASE + '/ai-assistant');
    await waitNav();
    const input = page.getByPlaceholder(/Show me my overdue/);
    await input.waitFor({ timeout: 15000 });
    await input.fill("What's due today?");
    await input.press('Enter');
    await page.getByText('Due today').first().waitFor({ timeout: 12000 });
    const hasTask = (await page.getByText('Acceptance Task').count()) > 0;
    if (!hasTask) throw new Error('answer lacks task title');
    return 'Due today + task title in answer';
  });

  // ================= 14. Planner counts =================
  await step('14. planner shows 1 due / 0 completed / 0 overdue', async () => {
    await page.goto(BASE + '/planner');
    await waitNav();
    await page.getByText(/1 due . 0 completed . 0 overdue/).first().waitFor({ timeout: 12000 });
  });

  // ================= 15. My Tasks filter empty + clear =================
  await step('15. my-tasks filter shows empty then Clear restores', async () => {
    await page.goto(BASE + '/my-tasks');
    await waitNav();
    await page.getByText('Acceptance Task').first().waitFor({ timeout: 10000 });
    await page.fill('input[placeholder="Filter tasks..."]', 'zzz-no-match');
    await page.getByText('No tasks match your filters').first().waitFor({ timeout: 6000 });
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByText('Acceptance Task').first().waitFor({ timeout: 6000 });
  });

  // ================= 16. Complete via checkbox =================
  await step('16. complete task via checkbox (DB -> COMPLETED)', async () => {
    const row = page
      .locator('xpath=//div[contains(@class,"cursor-pointer")][.//text()[contains(., "Acceptance Task")]]')
      .first();
    await row.locator('button').first().click();
    await page.getByText('COMPLETED (').first().waitFor({ timeout: 15000 });
    const rows = await poll(async () => {
      const r = await rest(`tasks?title=eq.${encodeURIComponent('Acceptance Task')}&select=status`);
      return r.length && r[0].status === 'COMPLETED' ? r : null;
    }, 15000);
    if (!rows) throw new Error('DB status not COMPLETED');
    return 'UI section + DB status';
  });

  // ================= 17. Completion persists after reload =================
  await step('17. completion persists after full reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await waitNav();
    await page.getByText('Acceptance Task').first().waitFor({ timeout: 12000 });
    const r = await rest(`tasks?title=eq.${encodeURIComponent('Acceptance Task')}&select=status`);
    if (!r.length || r[0].status !== 'COMPLETED') throw new Error(`status=${r[0] && r[0].status}`);
    return 'UI + DB after reload';
  });

  // ================= 18. Create channel =================
  await step('18. create channel (DB-backed, composer active)', async () => {
    await page.goto(BASE + '/communication');
    await waitNav();
    await page.getByRole('button', { name: 'Create more' }).click();
    await page.getByRole('menuitem', { name: 'New Channel' }).click();
    await page.getByPlaceholder('e.g. marketing-updates').fill('acceptance-updates');
    await modalSubmit().click();
    await page.getByPlaceholder(/Message #/).first().waitFor({ timeout: 10000 });
    const rows = await poll(async () => {
      const r = await rest('channels?select=id,name');
      return r.length ? r : null;
    }, 8000);
    if (!rows) throw new Error('channel row not found in DB');
    return rows.map((c) => c.name).join(',');
  });

  // ================= 19. Send message =================
  await step('19. send channel message (appears in feed)', async () => {
    const composer = page.getByPlaceholder(/Message #/).first();
    await composer.fill('Hello from acceptance test');
    await composer.press('Enter');
    await page.getByText('Hello from acceptance test').first().waitFor({ timeout: 10000 });
  });

  // ================= 20. Message persists after reload =================
  await step('20. message persists after full reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await waitNav();
    await page.getByText('Hello from acceptance test').first().waitFor({ timeout: 12000 });
    const r = await poll(async () => {
      const rows = await rest('messages?select=id');
      return rows.length ? rows : null;
    }, 6000);
    if (!r) throw new Error('no messages in DB');
    return `DB rows: ${r.length}`;
  });

  // ================= 21. Create document =================
  await step('21. create document (editor opens, DB row)', async () => {
    await page.goto(BASE + '/docs');
    await waitNav();
    await page.locator('[title="New Document"]').first().waitFor({ timeout: 10000 });
    await page.locator('[title="New Document"]').first().click();
    await page.locator('input[aria-label="Document title"]').waitFor({ timeout: 10000 });
    const rows = await poll(async () => {
      const r = await rest('documents?select=id,title');
      return r.length ? r : null;
    }, 8000);
    if (!rows) throw new Error('document row not found in DB');
    return `id ${rows[0].id}`;
  });

  // ================= 22. Edit doc -> autosaves =================
  await step('22. edit document autosaves (Saved indicator)', async () => {
    await page.locator('input[aria-label="Document title"]').fill('Acceptance Doc');
    await page.getByText('Saved', { exact: true }).first().waitFor({ timeout: 10000 });
    await page.locator('textarea[aria-label="Document content"]').fill('Acceptance content: runbooks live here.');
    await page.waitForTimeout(1500);
    const val = await page.locator('textarea[aria-label="Document content"]').inputValue();
    if (!val.includes('Acceptance content')) throw new Error('content not in editor');
  });

  // ================= 23. Doc persists after reload =================
  await step('23. document title+content persist after reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await waitNav();
    await page.locator('input[aria-label="Document title"]').waitFor({ timeout: 12000 });
    const title = await page.locator('input[aria-label="Document title"]').inputValue();
    if (title !== 'Acceptance Doc') throw new Error(`title=${title}`);
    const content = await page.locator('textarea[aria-label="Document content"]').inputValue();
    if (!content.includes('Acceptance content')) throw new Error(`content=${content.slice(0, 60)}`);
    return 'title + content after reload';
  });

  // ================= 24. Invite teammate =================
  await step('24. invite teammate (second profile created)', async () => {
    await page.getByRole('button', { name: 'Invite Team' }).click();
    await page.getByText('Invite Team Member').first().waitFor({ timeout: 8000 });
    await page.getByPlaceholder('colleague@company.com').fill(mateEmail);
    await modalSubmit().click();
    await page.waitForTimeout(1500);
    const row = await poll(async () => {
      const r = await rest(`profiles?email=eq.${encodeURIComponent(mateEmail)}&select=id,role`);
      return r.length ? r[0] : null;
    }, 12000);
    if (!row) throw new Error('invitee profile not created (invite API or trigger failed)');
    mateId = row.id;
    return `id ${mateId}, role ${row.role}`;
  });

  // ================= 25. Assignment creates notification =================
  await step('25. assigning task creates notification row (DB pipeline)', async () => {
    const t = await rest(`tasks?title=eq.${encodeURIComponent('Acceptance Task')}&select=id`);
    if (!t.length) throw new Error('task missing');
    const resp = await page.request.patch(`${BASE}/api/tasks/${t[0].id}`, {
      data: { assigneeIds: [meId, mateId] },
    });
    if (!resp.ok()) throw new Error(`PATCH ${resp.status()} ${(await resp.text()).slice(0, 200)}`);
    const notif = await poll(async () => {
      const rows = await rest('notifications?select=*');
      return rows.some((r) => JSON.stringify(r).includes(mateId)) ? rows : null;
    }, 8000);
    if (!notif) throw new Error('no notification row for invitee');
    const row = notif.find((r) => JSON.stringify(r).includes(mateId));
    return `type ${row.type}`;
  });

  // ================= 26. Command palette =================
  await step('26. command palette opens with Ctrl+K and closes', async () => {
    await page.keyboard.press('Control+k');
    await page.locator('[aria-label="Command palette"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.locator('[aria-label="Command palette"]').waitFor({ state: 'detached', timeout: 5000 });
  });

  // ================= 27. Analytics KPIs from real data =================
  await step('27. analytics KPIs: Total=1, Completed=1', async () => {
    await page.goto(BASE + '/analytics');
    await waitNav();
    await page.locator('h1:has-text("Executive Analytics")').waitFor({ timeout: 12000 });
    const kpiValue = async (label) => {
      const card = page.locator('.clean-card').filter({ hasText: label }).first();
      return ((await card.locator('div.text-2xl').textContent().catch(() => '')) || '').trim();
    };
    const total = await poll(async () => {
      const v = await kpiValue('Total Tasks');
      return v === '1' ? v : null;
    }, 10000);
    if (total !== '1') throw new Error(`Total Tasks=${total || await kpiValue('Total Tasks')}`);
    const completed = await kpiValue('Completed');
    if (completed !== '1') throw new Error(`Completed=${completed}`);
    return 'Total=1, Completed=1';
  });

  // ================= 28. Custom 404 =================
  await step('28. unknown route renders custom 404', async () => {
    await page.goto(BASE + '/definitely-not-a-page');
    await page.getByText('Page not found').first().waitFor({ timeout: 10000 });
  });

  // ================= 29. Logout via profile modal =================
  await step('29. logout via profile modal returns to /login', async () => {
    await page.goto(BASE + '/home');
    await waitNav();
    await page.locator('button[title="View Profile"]').first().click();
    await page.getByRole('button', { name: 'Sign out' }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Sign out' }).click();
    try {
      await page.waitForURL(/\/login/, { timeout: 8000 });
    } catch {}
    try {
      await page.goto(BASE + '/home');
    } catch {}
    await page.waitForURL(/\/login/, { timeout: 12000 });
    return new URL(page.url()).pathname;
  });

  // ================= 30. Re-login: everything still there =================
  await step('30. re-login: task, message and doc all persist', async () => {
    await page.getByPlaceholder('you@company.com').first().fill(email);
    await page.locator('form input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
    await waitNav();

    await page.locator('[title="My Tasks"]').first().click();
    await page.waitForURL(/\/my-tasks/, { timeout: 10000 });
    await page.getByText('Acceptance Task').first().waitFor({ timeout: 12000 });

    await page.goto(BASE + '/communication');
    await waitNav();
    await page.getByText('Hello from acceptance test').first().waitFor({ timeout: 12000 });

    await page.goto(BASE + '/docs');
    await waitNav();
    await page.getByText('Acceptance Doc').first().waitFor({ timeout: 12000 });
    return 'task + message + doc after re-login';
  });

  // ================= summary =================
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log('\n================ ACCEPTANCE SUMMARY ================');
  console.log(`${passed}/${results.length} passed, ${failed} failed`);
  if (pageErrors.length) {
    console.log(`\nPAGE ERRORS (${pageErrors.length}):`);
    pageErrors.forEach((e) => console.log('  ' + e));
  }
  if (consoleErrors.length) {
    console.log(`\nCONSOLE ERRORS (${consoleErrors.length}, first 10):`);
    consoleErrors.slice(0, 10).forEach((e) => console.log('  ' + e));
  }
  if (failed) {
    console.log('\nFAILED STEPS:');
    results.filter((r) => !r.ok).forEach((r) => console.log('  ' + r.name));
  }
  console.log('====================================================');

  await browser.close();
  process.exit(failed || pageErrors.length ? 1 : 0);
})().catch((e) => {
  console.log('FATAL: ' + (e.stack || e));
  process.exit(2);
});
