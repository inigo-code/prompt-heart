// Renders the Heart Apps developer brand (an app tile with a heart popping out of it) to SVG and PNG with headless Chrome.
// Usage (needs puppeteer-core and Chrome): node scripts/make-brand.mjs store/developer
// Set CHROME to the browser's path if it is not the default Windows install.
import { writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const out = process.argv[2];
const DARK = { bg: '#121110', tiles: '#F2B84B', heart: '#FF4D6D', text: '#F6F4EF' };
// Gold on cream is 1.6:1, so the light version deepens the tiles and the heart to clear 3:1.
const LIGHT = { bg: '#F6F4EF', tiles: '#B87A12', heart: '#E8395A', text: '#1C1A17' };

// "Heart Apps" in Inter Display Bold at 200px, tracked -1%, outlined so the files need no font. Ink spans x 10.8–1020.2, cap height 145.5 above y=0.
const WORDMARK = 'M10.8 0L40.9 0L40.9-61.3L102.7-61.3L102.7 0L132.7 0L132.7-145.5L102.7-145.5L102.7-87.1L40.9-87.1L40.9-145.5L10.8-145.5Z M198.9 2.3C223.9 2.3 243.8-11.9 247.6-32.4L221.3-32.4C218.7-24.4 211.0-19.2 199.8-19.2C184.6-19.2 175.8-29.1 175.3-44.3L248.7-44.3L248.7-52.1C248.7-83.5 228.3-105.5 197.9-105.5C168.3-105.5 147.3-82.9 147.3-51.5C147.3-20.1 167.6 2.3 198.9 2.3ZM175.5-62.7C177.1-75.6 185.6-83.6 198.5-83.6C211.5-83.6 220.1-75.6 221.5-62.7Z M293.7 1.8C309.5 1.8 318.4-4.5 323.8-14.6L324.2-14.6L324.2 0L352.3 0L352.3-69.9C352.3-92.0 336.1-105.3 307.9-105.3C279.6-105.3 262.8-91.8 261.5-70.5L288.6-70.5C289.3-78.4 296.3-83.9 307.0-83.9C317.6-83.9 323.9-78.6 323.9-71.0L323.9-70.3C323.9-63.7 317.3-62.8 298.4-60.9C277.0-59.0 258.2-52.3 258.2-29.1C258.2-8.5 273.1 1.8 293.7 1.8ZM301.7-18.3C292.0-18.3 285.7-22.6 285.7-29.9C285.7-38.1 293.6-41.9 303.4-43.4C312.7-44.8 320.8-46.2 324.1-48.0L324.1-37.7C324.1-26.6 315.5-18.3 301.7-18.3Z M370.7 0L399.5 0L399.5-55.9C399.5-71.4 408.2-79.6 420.0-79.6C424.9-79.6 430.2-79.2 432.4-79.1L432.4-103.6C430.0-103.7 427.2-103.8 423.9-103.8C410.3-103.8 402.5-97.9 398.7-85.5L398.4-85.5L398.4-103.1L370.7-103.1Z M502.5-103.1L481.5-103.1L481.5-131.3L452.6-131.3L452.6-103.1L434.9-103.1L434.9-80.6L452.6-80.6L452.6-27.3C452.6-8.6 463.1 0 485.8 0L502.5 0L502.5-22.6L491.5-22.6C483.7-22.6 481.5-24.8 481.5-31.8L481.5-80.6L502.5-80.6Z M546.6 0L579.0 0L589.6-31.7L644.0-31.7L654.1 0L687.4 0L636.3-145.5L597.7-145.5ZM597.7-55.8L602.6-70.8C607.3-85.6 611.8-100.5 617.1-118.6C622.3-100.5 626.8-85.6 631.3-70.8L636.1-55.8Z M696.5 40.8L725.4 40.8L725.4-15.4L725.6-15.4C731.6-3.8 742.1 2.1 755.6 2.1C782.6 2.1 800.3-19.3 800.3-51.7C800.3-83.3 782.2-105.3 755.8-105.3C742.4-105.3 731.6-99.9 725.3-89.2L725.0-89.2L725.0-103.1L696.5-103.1ZM748.2-21.3C733.7-21.3 724.0-33.2 724.0-51.7C724.0-70.0 733.7-82.0 748.2-82.0C762.2-82.0 771.3-71.0 771.3-51.7C771.3-32.3 762.2-21.3 748.2-21.3Z M814.1 40.8L842.9 40.8L842.9-15.4L843.2-15.4C849.1-3.8 859.6 2.1 873.2 2.1C900.1 2.1 917.8-19.3 917.8-51.7C917.8-83.3 899.7-105.3 873.4-105.3C860.0-105.3 849.1-99.9 842.8-89.2L842.5-89.2L842.5-103.1L814.1-103.1ZM865.7-21.3C851.2-21.3 841.5-33.2 841.5-51.7C841.5-70.0 851.2-82.0 865.7-82.0C879.7-82.0 888.8-71.0 888.8-51.7C888.8-32.3 879.7-21.3 865.7-21.3Z M974.5 2.5C1001.4 2.5 1020.2-10.9 1020.2-31.5C1020.2-46.7 1010.6-55.7 989.8-59.8L970.3-63.6C962.4-65.2 957.8-68.7 957.8-73.9C957.8-80.1 963.7-84.9 973.6-84.9C983.8-84.9 990.8-78.7 991.0-70.4L1017.6-70.4C1017.1-91.9 999.5-105.3 972.8-105.3C946.0-105.3 929.1-92.4 929.1-72.9C929.1-56.8 939.7-46.7 959.7-42.8L977.8-39.3C986.2-37.6 991.2-34.4 991.2-28.9C991.2-22.6 984.6-18.1 974.0-18.1C962.8-18.1 956.1-23.4 955.0-32.4L926.7-32.4C928.5-10.3 947.7 2.5 974.5 2.5Z';

/** Watch Heart's heart, centred on (cx, cy) with half-size h: its ink spans ±0.79h across and from -0.6h to +0.8h down. */
const heartPath = (cx, cy, h) => `M ${cx} ${cy + h * 0.8}
    C ${cx - h * 1.3} ${cy - h * 0.05}, ${cx - h * 0.78} ${cy - h * 1.0}, ${cx} ${cy - h * 0.42}
    C ${cx + h * 0.78} ${cy - h * 1.0}, ${cx + h * 1.3} ${cy - h * 0.05}, ${cx} ${cy + h * 0.8} Z`;

/**
 * The mark, drawn in a 1024 box: an app tile with a heart-shaped hole, and the heart that just popped out of it, turning as it jumps.
 * The heart stays a small accent, as it is in each app's own icon: one big red heart is the stock symbol for health apps.
 * A ring of background around the flying heart bites into the tile's corner, so the outline alone is its own shape.
 * A dot eye and a smile, cut out like the hole, turn the tile into a face with the heart for its other eye, love-struck enough
 * that it popped. The face is what still reads at 32px, where the hole is only a few pixels.
 */
let n = 0;
// Measured ink of the tile and the flying heart together, centred in the box.
const INK = { x: 234, y: 222, w: 555, h: 580 };
const TILE = { y: 302, size: 500 };
function mark({ tiles, heart }) {
  const id = `pop${n++}`;
  const [x, y, size, round] = [234, TILE.y, TILE.size, 144];
  const [h, ring, turn] = [130, 20, 14];
  const [holeX, holeY] = [x + size * 0.68, y + size * 0.34];
  const [outX, outY] = [holeX + 96, holeY - 150];
  const flying = `<path d="${heartPath(outX, outY, h)}" transform="rotate(${turn} ${outX} ${outY})"`;
  // The eye sits level with the hole's middle; the smile is centred under the two.
  const eye = `<circle cx="${x + 158}" cy="${holeY + 0.04 * h}" r="40" fill="black"/>`;
  const [smileL, smileR, smileY, dip] = [x + 126, x + 386, y + 338, 120];
  const smile = `<path d="M ${smileL} ${smileY} Q ${(smileL + smileR) / 2} ${smileY + dip} ${smileR} ${smileY}" fill="none" stroke="black" stroke-width="52" stroke-linecap="round"/>`;
  return `
    <mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="white"/><path d="${heartPath(holeX, holeY, h)}" fill="black"/>${flying} fill="black" stroke="black" stroke-width="${ring * 2}" stroke-linejoin="round"/>${eye}${smile}</mask>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${round}" fill="${tiles}" mask="url(#${id})"/>
    ${flying} fill="${heart}"/>`;
}

const svg = (w, h, body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>`;

/** Mark and wordmark side by side, drawn in a box of `width`; the cap height is centred on the tile, which stands about twice as tall. */
function lockup(colors, width) {
  const [markH, capH, space, pad] = [340, 150, 88, 40];
  const k = markH / INK.h;
  const t = capH / 145.5;
  const textX = pad + INK.w * k + space;
  const w = textX + 1020.2 * t + pad;
  const h = markH + pad * 2;
  const s = width / w;
  return {
    width: Math.round(w * s),
    height: Math.round(h * s),
    body: `<g transform="scale(${s})">
      <g transform="translate(${pad - INK.x * k} ${pad - INK.y * k}) scale(${k})">${mark(colors)}</g>
      <path d="${WORDMARK}" fill="${colors.text}" transform="translate(${textX - 10.8 * t} ${pad + (TILE.y + TILE.size / 2 - INK.y) * k + capH / 2}) scale(${t})"/>
    </g>`,
  };
}

const tight = (body) => svg(1024, 1024, body).replace('width="1024" height="1024" viewBox="0 0 1024 1024"', 'width="620" height="620" viewBox="202 202 620 620"');
const white = { tiles: '#FFFFFF', heart: '#FFFFFF' };
const black = { tiles: '#000000', heart: '#000000' };
const lockDark = lockup(DARK, 1600);
const lockLight = lockup(LIGHT, 1600);
const header = lockup(DARK, 1900);
const preview = lockup(DARK, 820);

const files = {
  // Masters, transparent.
  'mark.svg': svg(1024, 1024, mark(DARK)),
  // Cropped close around the ink, for small places like a site header or a favicon, where the 1024 box's margin would waste a third of it.
  'mark-tight.svg': tight(mark(DARK)),
  'mark-light-tight.svg': tight(mark(LIGHT)),
  'mark-light.svg': svg(1024, 1024, mark(LIGHT)),
  'mark-white.svg': svg(1024, 1024, mark(white)),
  'mark-black.svg': svg(1024, 1024, mark(black)),
  'lockup.svg': svg(lockDark.width, lockDark.height, lockDark.body),
  'lockup-light.svg': svg(lockLight.width, lockLight.height, lockLight.body),
  // Play Console: developer icon 512 x 512 and header image 4096 x 2304, each under 1 MB.
  'play-developer-icon-512.png': svg(1024, 1024, mark(DARK), DARK.bg),
  'play-developer-header-4096x2304.png': svg(4096, 2304, `<g transform="translate(${(4096 - header.width) / 2} ${(2304 - header.height) / 2})">${header.body}</g>`, DARK.bg),
  // The link preview for the website, at the 1200 x 630 that Facebook, X, Slack and messaging apps all crop from.
  'og-image-1200x630.png': svg(1200, 630, `<g transform="translate(${(1200 - preview.width) / 2} ${(630 - preview.height) / 2})">${preview.body}</g>`, DARK.bg),
  'mark-1024.png': svg(1024, 1024, mark(DARK)),
  'apple-touch-icon-180.png': svg(1024, 1024, mark(DARK), DARK.bg),
  'lockup.png': svg(lockDark.width, lockDark.height, lockDark.body),
  'lockup-light.png': svg(lockLight.width, lockLight.height, lockLight.body),
};
const sizes = { 'play-developer-icon-512.png': [512, 512], 'apple-touch-icon-180.png': [180, 180] };

const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
for (const [name, markup] of Object.entries(files)) {
  if (name.endsWith('.svg')) {
    writeFileSync(`${out}/${name}`, markup + '\n');
  } else {
    const [, w, h] = markup.match(/width="(\d+)" height="(\d+)"/);
    const [width, height] = sizes[name] ?? [+w, +h];
    // Drawn through a canvas rather than a screenshot, so even the opaque files come out as the 32-bit PNG Play asks for.
    const png = await page.evaluate(async (markup, width, height) => {
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
      await img.decode();
      const canvas = Object.assign(document.createElement('canvas'), { width, height });
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      return canvas.toDataURL('image/png').split(',')[1];
    }, markup, width, height);
    writeFileSync(`${out}/${name}`, Buffer.from(png, 'base64'));
  }
  console.log('wrote', name);
}
await browser.close();
