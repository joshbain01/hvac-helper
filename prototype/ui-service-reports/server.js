import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 5185;

http.createServer((req, res) => {
  const file = req.url === '/' ? 'index.html' : req.url.slice(1);
  const full = path.join(__dirname, file);
  if (!full.startsWith(__dirname)) return res.writeHead(403).end('Forbidden');
  fs.readFile(full, (err, data) => {
    if (err) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
}).listen(port, () => console.log(`Service report prototype running at http://127.0.0.1:${port}`));
