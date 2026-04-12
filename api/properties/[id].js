const { supabase } = require('../_supabase');
const { verifyAuth } = require('../_auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { id } = req.query;

  // ── PUT: update property ──────────────────────────────────
  if (req.method === 'PUT') {
    if (!verifyAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body || {};
    const updates = {};
    if (body.title !== undefined)       updates.title = body.title;
    if (body.location !== undefined)    updates.location = body.location;
    if (body.price !== undefined)       updates.price = body.price;
    if (body.movein !== undefined)      updates.movein = body.movein;
    if (body.monthly !== undefined)     updates.monthly = body.monthly;
    if (body.beds !== undefined)        updates.beds = body.beds;
    if (body.baths !== undefined)       updates.baths = body.baths;
    if (body.sqft !== undefined)        updates.sqft = body.sqft;
    if (body.type !== undefined)        updates.type = body.type;
    if (body.image !== undefined)       updates.image = body.image;
    if (body.images !== undefined)      updates.images = body.images;
    if (body.description !== undefined) updates.description = body.description;
    if (body.featured !== undefined)    updates.featured = body.featured;
    if (body.active !== undefined)      updates.active = body.active;

    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });

    return res.status(200).json({
      ...data,
      price: data.price ? Number(data.price) : null,
      movein: data.movein ? Number(data.movein) : null,
      monthly: data.monthly ? Number(data.monthly) : null,
      createdAt: data.created_at,
    });
  }

  // ── DELETE: remove property ───────────────────────────────
  if (req.method === 'DELETE') {
    if (!verifyAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
