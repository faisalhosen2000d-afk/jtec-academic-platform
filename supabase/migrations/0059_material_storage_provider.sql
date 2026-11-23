ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS material_storage_provider TEXT NOT NULL DEFAULT 'b2'
CHECK (material_storage_provider IN ('b2', 'supabase'));