import { createServer } from 'http';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const ADMIN_PASSWORD = 'TxPropSource2024';   // ← change this to something private
const DATA_FILE   = join(__dirname, 'data', 'properties.json');
const UPLOADS_DIR = join(__dirname, 'uploads');

// In-memory sessions (token → expiry)
const sessions = new Map();

// ── Startup: ensure folders & data file ──────────────────────────────────────
if (!existsSync(join(__dirname, 'data')))    await mkdir(join(__dirname, 'data'),    { recursive: true });
if (!existsSync(UPLOADS_DIR))               await mkdir(UPLOADS_DIR,               { recursive: true });
if (!existsSync(DATA_FILE))                 await writeFile(DATA_FILE, JSON.stringify({ properties: [] }, null, 2));

// ── Helpers ──────────────────────────────────────────────────────────────────
async function readProps()      { return JSON.parse(await readFile(DATA_FILE, 'utf8')); }
async function writeProps(data) { await writeFile(DATA_FILE, JSON.stringify(data, null, 2)); }

function isAuth(req) {
  const h = req.headers['authorization'] || '';
  if (!h.startsWith('Bearer ')) return false;
  const s = sessions.get(h.slice(7));
  if (!s || Date.now() > s.expires) { sessions.delete(h.slice(7)); return false; }
  return true;
}

function readBody(req) {
  return new Promise((ok, fail) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end',  () => ok(Buffer.concat(chunks)));
    req.on('error', fail);
  });
}

async function parseJSON(req) {
  try { return JSON.parse(await readBody(req)); } catch { return {}; }
}

async function parseMultipart(req) {
  const raw = await readBody(req);
  const boundary = (req.headers['content-type'] || '').match(/boundary=(.+)/)?.[1];
  if (!boundary) return {};
  const parts = {};
  const sep = Buffer.from('\r\n--' + boundary);
  let pos = raw.indexOf('--' + boundary);
  while (pos !== -1) {
    const next = raw.indexOf(sep, pos + 2);
    const chunk = next === -1 ? raw.slice(pos) : raw.slice(pos, next);
    const hEnd = chunk.indexOf('\r\n\r\n');
    if (hEnd !== -1) {
      const hdr = chunk.slice(0, hEnd).toString();
      const body = chunk.slice(hEnd + 4, chunk.length - 2);
      const name = hdr.match(/name="([^"]+)"/)?.[1];
      const file = hdr.match(/filename="([^"]+)"/)?.[1];
      if (name) parts[name] = file ? { filename: file, data: body } : body.toString();
    }
    pos = next === -1 ? -1 : next + 2;
  }
  return parts;
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

// ── Server ────────────────────────────────────────────────────────────────────
createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' });
    return res.end();
  }

  // ── POST /api/auth ──────────────────────────────────────────────────────────
  if (url === '/api/auth' && method === 'POST') {
    const body = await parseJSON(req);
    if (body.password === ADMIN_PASSWORD) {
      const token = randomUUID();
      sessions.set(token, { expires: Date.now() + 24 * 3600 * 1000 });
      return json(res, 200, { token });
    }
    return json(res, 401, { error: 'Incorrect password' });
  }

  // ── GET /api/properties ─────────────────────────────────────────────────────
  if (url === '/api/properties' && method === 'GET') {
    const data = await readProps();
    return json(res, 200, data.properties || []);
  }

  // ── POST /api/properties ────────────────────────────────────────────────────
  if (url === '/api/properties' && method === 'POST') {
    if (!isAuth(req)) return json(res, 401, { error: 'Unauthorized' });
    const body = await parseJSON(req);
    const data = await readProps();
    const prop = { id: randomUUID(), createdAt: new Date().toISOString(), active: true, featured: false, ...body };
    data.properties.unshift(prop);
    await writeProps(data);
    return json(res, 201, prop);
  }

  // ── PUT /api/properties/:id ─────────────────────────────────────────────────
  const editMatch = url.match(/^\/api\/properties\/([^/]+)$/);
  if (editMatch && method === 'PUT') {
    if (!isAuth(req)) return json(res, 401, { error: 'Unauthorized' });
    const body = await parseJSON(req);
    const data = await readProps();
    const idx = data.properties.findIndex(p => p.id === editMatch[1]);
    if (idx === -1) return json(res, 404, { error: 'Not found' });
    data.properties[idx] = { ...data.properties[idx], ...body };
    await writeProps(data);
    return json(res, 200, data.properties[idx]);
  }

  // ── DELETE /api/properties/:id ──────────────────────────────────────────────
  if (editMatch && method === 'DELETE') {
    if (!isAuth(req)) return json(res, 401, { error: 'Unauthorized' });
    const data = await readProps();
    data.properties = data.properties.filter(p => p.id !== editMatch[1]);
    await writeProps(data);
    return json(res, 200, { ok: true });
  }

  // ── POST /api/upload ────────────────────────────────────────────────────────
  if (url === '/api/upload' && method === 'POST') {
    if (!isAuth(req)) return json(res, 401, { error: 'Unauthorized' });
    const parts = await parseMultipart(req);
    const file = parts.image;
    if (!file?.data) return json(res, 400, { error: 'No file received' });
    const ext = extname(file.filename || '.jpg') || '.jpg';
    const filename = randomUUID() + ext;
    await writeFile(join(UPLOADS_DIR, filename), file.data);
    return json(res, 200, { url: '/uploads/' + filename });
  }

  // ── Static files ────────────────────────────────────────────────────────────
  let filePath;
  if (url === '/' || url === '')                      filePath = join(__dirname, 'index.html');
  else if (url === '/admin' || url === '/admin/')      filePath = join(__dirname, 'admin.html');
  else if (url === '/properties' || url === '/properties/') filePath = join(__dirname, 'properties.html');
  else if (/^\/property\/[^/]+\/?$/.test(url))            filePath = join(__dirname, 'property.html');
  else                                                 filePath = join(__dirname, url);

  try {
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}).listen(PORT, () => {
  console.log(`\n  TxPropertySource`);
  console.log(`  Site:  http://localhost:${PORT}`);
  console.log(`  Admin: http://localhost:${PORT}/admin`);
  console.log(`  Password: ${ADMIN_PASSWORD}\n`);
});
