-- =============================================================================
-- NarrVoca — Rollback for Migration 007
-- Drops the UNIQUE constraint on (uid, story_id) from tutor_sessions.
-- =============================================================================

ALTER TABLE tutor_sessions
  DROP CONSTRAINT IF EXISTS uq_tutor_sessions_user_story;
