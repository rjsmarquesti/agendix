-- Migration: adiciona campo checkout_url em agent_configs
-- Permite que o admin configure URL de checkout dedicada no Agente IA
-- sem depender de regex no campo promptBase

ALTER TABLE "agent_configs" ADD COLUMN IF NOT EXISTS "checkout_url" TEXT;
