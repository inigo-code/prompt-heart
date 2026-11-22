import fs from 'node:fs';
import { connect } from '../../video/source/drive.mjs';
const d = await connect();
for (const n of ['home', 'library', 'profile']) {
  const url = await d.evaluate(`(async()=>{const b=await (await fetch('/tmp/site-${n}.png')).blob(); const i=await createImageBitmap(b); const c=document.createElement('canvas'); c.width=780; c.height=1688; const x=c.getContext('2d'); x.imageSmoothingQuality='high'; x.drawImage(i,0,0,780,780*i.height/i.width); return c.toDataURL('image/webp',0.86)})()`);
  fs.writeFileSync(`dist/${n}.webp`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(n, fs.statSync(`dist/${n}.webp`).size);
}
d.close();
