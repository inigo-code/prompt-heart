// node cap.mjs <name> [theme] -- steps...   Loads the seeded web app at phone size and runs steps, then saves out/<name>.png
// steps: tap x y | click "text" [nth] | type "text" | key K | wait ms | scroll x y dy | eval js | go /path
import fs from 'node:fs';
import { connect } from '../../video/source/drive.mjs';
const [name, theme = 'dark', ...rest] = process.argv.slice(2);
const steps = rest[0] === '--' ? rest.slice(1) : rest;
const d = await connect();
await d.send('Page.enable'); await d.send('Runtime.enable');
await d.send('Emulation.setDeviceMetricsOverride', { width: 412, height: +(process.env.H || 877), deviceScaleFactor: 2.5, mobile: true });
await d.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme === 'light' ? 'light' : 'dark' }] });
const seed = JSON.parse(fs.readFileSync('seed.json', 'utf8'));
const variants = JSON.parse(fs.readFileSync('seed-settings.json', 'utf8'));
seed['promptheart/settings'] = JSON.stringify(variants[theme]);
await d.evaluate(`(()=>{localStorage.clear(); const s=${JSON.stringify(JSON.stringify(seed))}; for (const [k,v] of Object.entries(JSON.parse(s))) localStorage.setItem(k,v); return 1})()`);
await d.send('Page.navigate', { url: 'http://localhost:8095/' }); await d.sleep(4000);
for (let i = 0; i < steps.length; i++) {
  const s = steps[i];
  if (s === 'tap') { await d.tap(+steps[++i], +steps[++i]); await d.sleep(700); }
  else if (s === 'click') { const t = steps[++i]; const n = /^\d+$/.test(steps[i + 1] ?? '') ? +steps[++i] : 0; await d.click(t, n); await d.sleep(900); }
  else if (s === 'type') { await d.type(steps[++i]); await d.sleep(300); }
  else if (s === 'key') { await d.key(steps[++i]); await d.sleep(300); }
  else if (s === 'wait') await d.sleep(+steps[++i]);
  else if (s === 'scroll') { await d.scroll(+steps[++i], +steps[++i], +steps[++i]); await d.sleep(600); }
  else if (s === 'eval') console.log(await d.evaluate(steps[++i]));
  else if (s === 'go') { await d.evaluate(`history.pushState({},'',${JSON.stringify(steps[++i])}); dispatchEvent(new PopStateEvent('popstate'))`); await d.sleep(1200); }
  else if (s === 'map') console.log(await d.map());
}
fs.mkdirSync('out', { recursive: true });
await d.shot(`out/${name}.png`);
d.close(); console.log('saved', name);
