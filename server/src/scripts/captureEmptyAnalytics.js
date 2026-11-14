const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = path.join(os.tmpdir(), 'chrome_cdp_empty_' + Date.now());
const ARTIFACT_DIR = 'C:\\Users\\tauqe\\.gemini\\antigravity\\brain\\25bc4cf9-7545-43e2-ba46-fa53880524e3';
const PORT = 9334;

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
  console.log('1. Launching isolated Chrome for Empty State verification...');
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

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) break;
    } catch {
      await sleep(300);
    }
  }

  const newTargetRes = await fetch(`http://127.0.0.1:${PORT}/json/new`, { method: 'PUT' });
  const target = await newTargetRes.json();
  const cdp = new CDPClient(target.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Navigate to login
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
  await sleep(2500);

  // Submit credentials for empty NGO
  await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]') || document.querySelector('#email');
      const passInput = document.querySelector('input[type="password"]') || document.querySelector('input[name="password"]') || document.querySelector('#password');
      if (!emailInput || !passInput) return 'Inputs not found';

      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(emailInput, 'empty.staff@emptyngo.org');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));

      nativeSetter.call(passInput, 'EmptyDemo2026!');
      passInput.dispatchEvent(new Event('input', { bubbles: true }));

      const submitBtn = document.querySelector('button[type="submit"]') || document.querySelector('.btn-login') || document.querySelector('button');
      if (submitBtn) submitBtn.click();
    })()`,
    awaitPromise: true
  });

  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const loc = await cdp.send('Runtime.evaluate', { expression: 'window.location.pathname' });
    if (loc.result.value !== '/login') break;
  }

  // Navigate to analytics
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/analytics' });

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    const state = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const hasCard = document.querySelectorAll('.analytics-kpi-card').length > 0;
        return hasCard;
      })()`,
      returnByValue: true
    });
    if (state.result.value) break;
  }

  await sleep(1500);

  // Capture Screenshot of Empty Dashboard
  const emptyShot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true
  });
  const emptyPath = path.join(ARTIFACT_DIR, 'analytics_dashboard_empty.png');
  fs.writeFileSync(emptyPath, Buffer.from(emptyShot.data, 'base64'));
  console.log('✅ Saved empty dashboard screenshot to:', emptyPath);

  cdp.close();
  chromeProcess.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

