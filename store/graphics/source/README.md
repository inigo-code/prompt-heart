# Store and README art

Makes the Play screenshots, feature graphic, README art (`docs/`) and the site's phone screens from the real web app, with made-up demo data.

1. `npx expo export -p web --output-dir <dir>`, then `node serve.cjs <dir>` (port 8095).
2. Start headless Chrome: `chrome --headless=new --remote-debugging-port=9333 --user-data-dir=<temp> http://localhost:8095/`.
3. `node seed.mjs` writes the demo data. `node cap.mjs <name> [dark|light|grid|welcome|whatsnew] -- <steps>` saves `out/<name>.png` (see the top of cap.mjs for steps; `map` lists what's on screen). Captures used: home, fill, detail, library, profile, history, select, grid, settings, welcome, whatsnew. Render `widget.html` at 412 x 877, scale 2.5, to `out/widget.png`.
4. `bash render.sh` composes `art.html` into `dist/`: `screenshots/01-06.png`, `feature-graphic.png`, `hero.png`, `gallery.png`, `new.png`.
5. Site screens: capture home, library and profile with `H=892` as `out/site-*.png`, copy them into `<dir>/tmp/`, then `node webp.mjs` writes `dist/*.webp` (780 x 1688).

The social posts (`../social/post.html`) crop the phone out of screenshots 01 and 03. The video is in `../video/source`.
