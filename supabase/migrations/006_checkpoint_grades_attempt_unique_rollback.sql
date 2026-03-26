-- =============================================================================
-- NarrVoca — Rollback for Migration 006
-- Drops the UNIQUE constraint on (uid, node_id, attempt_number).
-- =============================================================================

ALTER TABLE checkpoint_grades
  DROP CONSTRAINT IF EXISTS uq_checkpoint_grades_attempt;
