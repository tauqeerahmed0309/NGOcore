const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(os.tmpdir(), 'chrome_cdp_profile_' + Date.now());
const ARTIFACT_DIR = 'C:\\Users\\tauqe\\.gemini\\antigravity\\brain\\25bc4cf9-7545-43e2-ba46-fa53880524e3';
const PORT = 9333;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('1. Launching isolated headless Chrome...');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${TEMP_PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--window-size=1440,1200',
    'about:blank'
  ]);

  chromeProcess.on('error', (err) => {
    console.error('Failed to spawn Chrome:', err);
  });

  // Wait for remote debugging to be active
  console.log('2. Waiting for DevTools endpoint...');
  let version = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        version = await res.json();
        break;
      }
    } catch {
      await sleep(300);
    }
  }

  if (!version) {
    chromeProcess.kill();
    throw new Error('Chrome remote debugging did not respond.');
  }

  console.log('Connected to Chrome version:', version.Browser);

  // Create new page target
  const newTargetRes = await fetch(`http://127.0.0.1:${PORT}/json/new`, { method: 'PUT' });
  const target = await newTargetRes.json();
  const cdp = new CDPClient(target.webSocketDebuggerUrl);
  await cdp.connect();

  console.log('3. Enabling Page & Runtime domains...');
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Navigate to Login page
  console.log('4. Navigating to http://localhost:5173/login ...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
  await sleep(2500);

  // Fill in login credentials
  console.log('5. Submitting staff credentials...');
  const loginEval = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]') || document.querySelector('#email');
      const passInput = document.querySelector('input[type="password"]') || document.querySelector('input[name="password"]') || document.querySelector('#password');
      if (!emailInput || !passInput) return 'Inputs not found';

      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(emailInput, 'analytics.staff@shine.org');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));

      nativeSetter.call(passInput, 'ShineDemo2026!');
      passInput.dispatchEvent(new Event('input', { bubbles: true }));

      const submitBtn = document.querySelector('button[type="submit"]') || document.querySelector('.btn-login') || document.querySelector('button');
      if (!submitBtn) return 'Submit button not found';
      submitBtn.click();
      return 'Submitted';
    })()`,
    awaitPromise: true
  });
  console.log('Login form evaluation result:', loginEval.result.value);

  // Poll until redirected away from /login
  console.log('Waiting for login redirect...');
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const loc = await cdp.send('Runtime.evaluate', { expression: 'window.location.pathname' });
    if (loc.result.value !== '/login') {
      console.log('Redirected to:', loc.result.value);
      break;
    }
  }

  // Navigate to /analytics
  console.log('6. Navigating to http://localhost:5173/analytics ...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/analytics' });
  
  // Poll until analytics page is loaded and not showing loading skeleton
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    const state = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const hasCard = document.querySelectorAll('.analytics-kpi-card').length > 0;
        const hasError = !!document.querySelector('.alert-error');
        const isSkeleton = !!document.querySelector('.analytics-skeleton-view');
        return { hasCard, hasError, isSkeleton, path: window.location.pathname };
      })()`,
      returnByValue: true
    });
    if (state.result.value?.hasCard) {
      console.log('Dashboard loaded successfully!');
      break;
    }
  }

  // Check page title and content
  const pageCheck = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const title = document.querySelector('.analytics-header-title')?.textContent || '';
      const kpis = Array.from(document.querySelectorAll('.analytics-kpi-card')).map(c => ({
        label: c.querySelector('.analytics-kpi-label')?.textContent,
        value: c.querySelector('.analytics-kpi-value')?.textContent
      }));
      const charts = document.querySelectorAll('.trend-svg').length;
      const statusCards = document.querySelectorAll('.analytics-status-card').length;
      return { title, kpis, charts, statusCards, url: window.location.href };
    })()`,
    returnByValue: true
  });
  console.log('Dashboard render check:', JSON.stringify(pageCheck.result.value, null, 2));

  // Capture Full Page Screenshot (1440px Desktop)
  console.log('7. Capturing full-page desktop screenshot...');
  const desktopShot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true
  });
  const desktopPath = path.join(ARTIFACT_DIR, 'analytics_dashboard_desktop.png');
  fs.writeFileSync(desktopPath, Buffer.from(desktopShot.data, 'base64'));
  console.log('✅ Saved desktop screenshot to:', desktopPath);

  // Test Timeframe Switch to 12M
  console.log('8. Testing timeframe switch to 12M...');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn12 = Array.from(document.querySelectorAll('.analytics-timeframe-btn')).find(b => b.textContent.includes('12M'));
      if (btn12) btn12.click();
    })()`
  });
  await sleep(2000);

  const shot12M = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true
  });
  const path12M = path.join(ARTIFACT_DIR, 'analytics_dashboard_12m.png');
  fs.writeFileSync(path12M, Buffer.from(shot12M.data, 'base64'));
  console.log('✅ Saved 12M timeframe screenshot to:', path12M);

  // Test Mobile Responsive View (iPhone 14 / 390x844)
  console.log('9. Testing mobile responsive view (390x844)...');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await cdp.send('Page.reload');
  await sleep(2500);

  const mobileShot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true
  });
  const mobilePath = path.join(ARTIFACT_DIR, 'analytics_dashboard_mobile.png');
  fs.writeFileSync(mobilePath, Buffer.from(mobileShot.data, 'base64'));
  console.log('✅ Saved mobile responsive screenshot to:', mobilePath);

  // Clean up
  cdp.close();
  chromeProcess.kill();
  console.log('10. Cleaned up Chrome process and completed verification!');
  process.exit(0);
}

run().catch((err) => {
  console.error('CDP automation error:', err);
  process.exit(1);
});
