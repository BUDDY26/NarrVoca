-- =============================================================================
-- NarrVoca — Rollback for Migration 008
-- Drops the UNIQUE constraint on (node_id, criterion) from grading_rubrics.
-- =============================================================================

ALTER TABLE grading_rubrics
  DROP CONSTRAINT IF EXISTS uq_grading_rubrics_node_criterion;
