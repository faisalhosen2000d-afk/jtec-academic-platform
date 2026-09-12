-- JTEC Academic Platform
-- Phase M Notice Permission Foundation
-- Migration 0006

ALTER TABLE public.staff_scopes
ADD COLUMN IF NOT EXISTS can_publish_notices boolean NOT NULL DEFAULT false;