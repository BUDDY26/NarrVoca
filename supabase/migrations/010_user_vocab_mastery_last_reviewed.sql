-- =============================================================================
-- NarrVoca — Migration 010
-- Adds last_reviewed_at column to user_vocab_mastery.
-- Enables SRS analytics: distinguishes "never reviewed" from "not yet due"
-- and supports review streak / decay tracking.
-- Must be run AFTER Migration 001 (which creates user_vocab_mastery).
-- =============================================================================

ALTER TABLE user_vocab_mastery
  ADD COLUMN last_reviewed_at timestamptz;
