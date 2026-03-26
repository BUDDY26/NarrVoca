-- =============================================================================
-- NarrVoca — Rollback for Migration 010
-- Drops the last_reviewed_at column from user_vocab_mastery.
-- =============================================================================

ALTER TABLE user_vocab_mastery
  DROP COLUMN IF EXISTS last_reviewed_at;
