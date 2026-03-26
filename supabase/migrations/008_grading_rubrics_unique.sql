-- =============================================================================
-- NarrVoca — Migration 008
-- Adds UNIQUE constraint on (node_id, criterion) to grading_rubrics.
-- Prevents duplicate rubric criteria being seeded or inserted for the same node.
-- Must be run AFTER Migration 003 (which creates grading_rubrics).
-- =============================================================================

ALTER TABLE grading_rubrics
  ADD CONSTRAINT uq_grading_rubrics_node_criterion
  UNIQUE (node_id, criterion);
