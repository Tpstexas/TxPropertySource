const { supabase } = require('./_supabase');
const { verifyAuth } = require('./_auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── GET: list all properties ──────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Map to match frontend expected format
    const props = (data || []).map(p => ({
      id: p.id,
      title: p.title,
      location: p.location,
      price: p.price ? Number(p.price) : null,
      movein: p.movein ? Number(p.movein) : null,
      monthly: p.monthly ? Number(p.monthly) : null,
      beds: p.beds ? Number(p.beds) : null,
      baths: p.baths ? Number(p.baths) : null,
      sqft: p.sqft ? Number(p.sqft) : null,
      type: p.type || [],
      image: p.image || '',
      images: p.images || [],
      description: p.description || '',
      featured: p.featured,
      active: p.active,
      createdAt: p.created_at,
    }));

    return res.status(200).json(props);
  }

  // ── POST: create new property ─────────────────────────────
  if (req.method === 'POST') {
    if (!verifyAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body || {};
    const row = {
      title: body.title || '',
      location: body.location || '',
      price: body.price || null,
      movein: body.movein || null,
      monthly: body.monthly || null,
      beds: body.beds || null,
      baths: body.baths || null,
      sqft: body.sqft || null,
      type: body.type || [],
      image: body.image || '',
      images: body.images || [],
      description: body.description || '',
      featured: body.featured || false,
      active: body.active !== undefined ? body.active : true,
    };

    const { data, error } = await supabase
      .from('properties')
      .insert(row)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({
      ...data,
      price: data.price ? Number(data.price) : null,
      movein: data.movein ? Number(data.movein) : null,
      monthly: data.monthly ? Number(data.monthly) : null,
      createdAt: data.created_at,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
