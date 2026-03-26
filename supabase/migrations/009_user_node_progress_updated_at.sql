-- =============================================================================
-- NarrVoca — Migration 009
-- Adds updated_at column to user_node_progress.
-- Enables tracking when a user's node progress was last modified.
-- Must be run AFTER Migration 001 (which creates user_node_progress).
-- =============================================================================

ALTER TABLE user_node_progress
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
