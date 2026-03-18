-- Add prospect_insights JSONB column to floorplans
-- Stores per-prospect upgrade insights shown in the sidebar during prospect demos
-- Schema: { insights: [{ label: string, value: string }] }
ALTER TABLE floorplans
ADD COLUMN IF NOT EXISTS prospect_insights jsonb DEFAULT NULL;
