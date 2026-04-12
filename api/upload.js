const { supabase } = require('./_supabase');
const { verifyAuth } = require('./_auth');
const crypto = require('crypto');

// Disable body parser so we can read raw multipart data
module.exports.config = {
  api: { bodyParser: false }
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!verifyAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  const contentType = req.headers['content-type'] || '';
  const boundary = contentType.match(/boundary=(.+)/)?.[1];
  if (!boundary) return res.status(400).json({ error: 'No boundary found' });

  const raw = await getRawBody(req);

  // Parse multipart
  const sep = Buffer.from('\r\n--' + boundary);
  let pos = raw.indexOf('--' + boundary);
  let fileData = null;
  let fileName = 'upload.jpg';

  while (pos !== -1) {
    const next = raw.indexOf(sep, pos + 2);
    const chunk = next === -1 ? raw.slice(pos) : raw.slice(pos, next);
    const hEnd = chunk.indexOf('\r\n\r\n');
    if (hEnd !== -1) {
      const hdr = chunk.slice(0, hEnd).toString();
      const body = chunk.slice(hEnd + 4, chunk.length - 2);
      const name = hdr.match(/name="([^"]+)"/)?.[1];
      const file = hdr.match(/filename="([^"]+)"/)?.[1];
      if (name === 'image' && file) {
        fileData = body;
        fileName = file;
      }
    }
    pos = next === -1 ? -1 : next + 2;
  }

  if (!fileData || !fileData.length) return res.status(400).json({ error: 'No file received' });

  const ext = fileName.match(/\.\w+$/)?.[0] || '.jpg';
  const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  const mime = mimeTypes[ext.toLowerCase()] || 'image/jpeg';
  const storageName = crypto.randomUUID() + ext;

  const { error } = await supabase.storage
    .from('property-images')
    .upload(storageName, fileData, { contentType: mime, upsert: false });

  if (error) return res.status(500).json({ error: error.message });

  const { data: urlData } = supabase.storage
    .from('property-images')
    .getPublicUrl(storageName);

  return res.status(200).json({ url: urlData.publicUrl });
};
