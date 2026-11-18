// Checks the frontend adapter against mocked Member 3 response shapes; no real database is used.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const { spawn } = require('node:child_process')
const assert = require('node:assert/strict')
const path = require('node:path')
const origin = 'http://127.0.0.1:5181'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5181', '--strictPort'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, VITE_DEMO_MODE: 'false' }, windowsHide: true, stdio: 'ignore' })
let browser
;(async () => {
  let ready = false
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if ((await fetch(origin)).ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert(ready, 'Live-mode test server should start')
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  let loginStatus = 200, role = 'CLIENT', meAuthorized = false, registration, decisionConflict = false
  await page.route('http://localhost:8000/**', async route => {
    const request = route.request(), pathname = new URL(request.url()).pathname
    const fulfill = (status, value) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
    if (pathname === '/auth/login') return fulfill(loginStatus, loginStatus === 200 ? { access_token: 'test-token', token_type: 'bearer' } : { detail: 'Your account is not active' })
    if (pathname === '/auth/me') { meAuthorized = request.headers().authorization === 'Bearer test-token'; return fulfill(200, { id: 42, name: 'Test Client', email: 'client@example.com', role, status: 'ACTIVE' }) }
    if (pathname === '/auth/register') { registration = request.postDataJSON(); return fulfill(422, { detail: [{ loc: ['body', 'phone'], msg: 'Phone number is invalid', type: 'value_error' }] }) }
    if (pathname === '/requests' && decisionConflict) return fulfill(200, [{ id: 'request-1', client_id: '42', company_id: 'company-1', company_name: 'Test Company', service: 'Inspection', description: 'Inspect the kitchen', address: 'Colombo', preferred_date: '2026-12-15', status: 'QUOTED', quotation_id: 'quote-1' }])
    if (pathname === '/quotations/quote-1') return fulfill(200, { id: 'quote-1', request_id: 'request-1', company_name: 'Test Company', service: 'Inspection', status: 'SENT', items: [{ description: 'Inspection', quantity: 1, unit_price: 3000 }], total: 3000 })
    if (pathname === '/quotations/quote-1/approve') return fulfill(409, { detail: 'This quotation has changed. Refresh before approving.' })
    if (['/requests', '/jobs', '/invoices'].includes(pathname)) return fulfill(200, [])
    return fulfill(404, { detail: 'Not implemented' })
  })
  async function signIn() {
    await page.goto(origin + '/login')
    await page.getByLabel('Email address').fill('client@example.com')
    await page.getByLabel(/^Password/).fill('Example123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  }
  await signIn(); await page.getByRole('heading', { name: 'Hello, Test.' }).waitFor(); assert(meAuthorized, 'Token-only login must authenticate GET /auth/me'); assert.equal(await page.locator('.sf-demo').count(), 0)
  decisionConflict = true
  await page.getByRole('tab', { name: 'Quotations', exact: true }).click()
  await page.getByRole('link', { name: 'View details →', exact: true }).click()
  await page.getByRole('button', { name: 'Approve quotation', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm decision', exact: true }).click()
  await page.getByText('This quotation has changed. Refresh before approving.', { exact: true }).waitFor()
  assert.equal(await page.getByText('Your decision was saved.', { exact: true }).count(), 0)
  await page.getByRole('button', { name: 'Go back', exact: true }).click()
  await page.getByRole('button', { name: 'Approve quotation', exact: true }).waitFor()
  loginStatus = 403; await signIn(); await page.getByText('Your account is not active', { exact: true }).waitFor(); assert.equal(await page.getByLabel('Email address').inputValue(), 'client@example.com')
  loginStatus = 200; role = 'SYSTEM_ADMIN'; await signIn(); await page.getByRole('heading', { name: 'Your operational workspace' }).waitFor()
  role = 'UNSUPPORTED'; await signIn(); await page.getByText('This account role is not supported by the current release.', { exact: true }).waitFor()
  await page.goto(origin + '/register'); await page.getByLabel('Full name').fill('Test Client'); await page.getByLabel('Phone number').fill('0771234567'); await page.getByLabel('Email address').fill('client@example.com'); await page.getByLabel(/^Password/).fill('Example123!'); await page.getByRole('button', { name: 'Create account' }).click(); await page.getByText('Phone number is invalid', { exact: true }).waitFor(); assert.equal(registration.phone, '0771234567'); assert.equal(await page.getByLabel('Full name').inputValue(), 'Test Client')
  assert.deepEqual(errors, [])
  console.log('PASS: token-only login, authorized current-user lookup, uppercase roles, inactive-account feedback, unsupported roles, registration path/phone payload, FastAPI validation, preserved form values.')
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => { if (browser) await browser.close(); server.kill() })
