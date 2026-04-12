import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://llpvarriykewlumhkraz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscHZhcnJpeWtld2x1bWhrcmF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0NDk3MSwiZXhwIjoyMDkxNTIwOTcxfQ.-KLSqnI1Q1a_95CetCnxKLxOn3Wo45pja0SORANYJ2I';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const raw = readFileSync(join(__dirname, 'data', 'properties.json'), 'utf8');
const { properties } = JSON.parse(raw);

console.log(`Migrating ${properties.length} properties to Supabase...\n`);

for (const p of properties) {
  const row = {
    title: p.title || '',
    location: p.location || '',
    price: p.price || null,
    movein: p.movein || null,
    monthly: p.monthly || null,
    beds: p.beds || null,
    baths: p.baths || null,
    sqft: p.sqft || null,
    type: p.type || [],
    image: p.image || '',
    images: p.images || [],
    description: p.description || '',
    featured: p.featured || false,
    active: p.active !== undefined ? p.active : true,
  };

  const { data, error } = await supabase
    .from('properties')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.log(`  ✗ "${p.title}" — ${error.message}`);
  } else {
    console.log(`  ✓ "${p.title}" → ${data.id}`);
  }
}

console.log('\nDone! Properties are now in Supabase.');
console.log('Note: The old local IDs (p1, p2, p3) are replaced with UUIDs.');
console.log('The frontend uses /api/properties which returns all properties, so this is fine.');
