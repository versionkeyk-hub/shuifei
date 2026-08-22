ALTER TABLE fertilizer_plan_items ADD COLUMN native_product_id TEXT REFERENCES legacy_products(id) ON DELETE SET NULL;
ALTER TABLE fertilizer_plan_items ADD COLUMN native_specification_id TEXT REFERENCES legacy_product_specs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fertilizer_plan_items_native_product ON fertilizer_plan_items(native_product_id);
