-- =============================================================================
-- NarrVoca — Migration 006
-- Adds UNIQUE constraint on (uid, node_id, attempt_number) to checkpoint_grades.
-- Prevents duplicate attempt numbers for the same user at the same node.
-- Must be run AFTER Migration 003 (which creates checkpoint_grades).
-- =============================================================================

ALTER TABLE checkpoint_grades
  ADD CONSTRAINT uq_checkpoint_grades_attempt
  UNIQUE (uid, node_id, attempt_number);
