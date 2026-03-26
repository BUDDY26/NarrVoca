-- =============================================================================
-- NarrVoca — Rollback for Migration 009
-- Drops the updated_at column from user_node_progress.
-- =============================================================================

ALTER TABLE user_node_progress
  DROP COLUMN IF EXISTS updated_at;
