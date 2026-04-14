-- Rent-to-own pivot: strip 'owner-finance' from properties.type arrays.
-- Leaves 'rent-to-own' and any future 'lease' values intact.
-- Safe to re-run: array_remove is idempotent.

UPDATE properties
SET type = array_remove(type, 'owner-finance')
WHERE 'owner-finance' = ANY(type);

-- Verify: should return zero rows.
-- SELECT id, title, type FROM properties WHERE 'owner-finance' = ANY(type);
