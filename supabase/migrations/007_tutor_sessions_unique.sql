-- =============================================================================
-- NarrVoca — Migration 007
-- Adds UNIQUE constraint on (uid, story_id) to tutor_sessions.
-- Enforces one active tutor session per user per story.
-- Must be run AFTER Migration 003 (which creates tutor_sessions).
-- =============================================================================

ALTER TABLE tutor_sessions
  ADD CONSTRAINT uq_tutor_sessions_user_story
  UNIQUE (uid, story_id);
