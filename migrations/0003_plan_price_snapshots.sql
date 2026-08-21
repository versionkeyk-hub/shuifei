ALTER TABLE fertilizer_plan_items ADD COLUMN product_sku_specification TEXT NOT NULL DEFAULT '';
ALTER TABLE fertilizer_plan_items ADD COLUMN quoted_price REAL;
ALTER TABLE fertilizer_plan_items ADD COLUMN source_ref_json TEXT NOT NULL DEFAULT '{}';
