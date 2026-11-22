// Serves the web export on 8095, with index.html for every route (the app is one page).
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2]);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
http.createServer((q, r) => {
  let p = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(8095, () => console.log('serving 8095'));
