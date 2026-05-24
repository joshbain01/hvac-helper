import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);

  let filePath = '';

  // Intercept the design system CSS request and map it to docs/css/design-system.css
  if (req.url === '/css/design-system.css') {
    filePath = path.join(__dirname, '..', '..', 'docs', 'css', 'design-system.css');
  } else {
    // Standard static serving
    const urlPath = req.url.split('?')[0]; // Strip query parameters
    filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
  }

  // Ensure path is within allowed boundaries to prevent directory traversal
  const resolvedPath = path.resolve(filePath);
  const rootDir = path.resolve(path.join(__dirname, '..', '..'));
  if (!resolvedPath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden: Directory traversal blocked');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('==================================================');
  console.log(`🚀 UI OCR Scanner Prototype server running at:`);
  console.log(`   ${url}`);
  console.log('==================================================');
  console.log('Press Ctrl+C to stop the server.');

  // Try to open browser automatically on Windows
  try {
    exec(`start ${url}`);
  } catch (e) {
    // Ignore opening failures, user can click the printed URL
  }
});
