// Minimal static file server for the project root (used by the headless renderer and the local preview).
// Answers byte ranges, which the browser needs to seek in the original video.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.csv': 'text/csv' };

export function startServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, url === '/' ? '/index.html' : url);
    if (file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const size = fs.statSync(file).size;
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      let start = range[1] ? Number(range[1]) : size - Number(range[2]);
      let end = range[1] && range[2] ? Number(range[2]) : size - 1;
      start = Math.max(0, start); end = Math.min(end, size - 1);
      if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
      res.writeHead(206, { 'Content-Type': type, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] || 8080);
  startServer(port).then(() => console.log(`preview: http://127.0.0.1:${port}/?play (click to start the audio), ?t=9.5, ?t=9.5&view=bts, ?lab=reimu`));
}
