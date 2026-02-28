-- =============================================================================
-- NarrVoca Extension Schema — Rollback for Migration 001
-- Drops all 11 NarrVoca tables in reverse dependency order.
-- Does NOT touch the 5 original Vocora tables.
-- =============================================================================

DROP TABLE IF EXISTS interaction_log      CASCADE;
DROP TABLE IF EXISTS user_vocab_mastery   CASCADE;
DROP TABLE IF EXISTS user_node_progress   CASCADE;
DROP TABLE IF EXISTS node_grammar         CASCADE;
DROP TABLE IF EXISTS node_vocabulary      CASCADE;
DROP TABLE IF EXISTS branching_logic      CASCADE;
DROP TABLE IF EXISTS node_text            CASCADE;
DROP TABLE IF EXISTS story_nodes          CASCADE;
DROP TABLE IF EXISTS grammar_points       CASCADE;
DROP TABLE IF EXISTS vocabulary           CASCADE;
DROP TABLE IF EXISTS stories              CASCADE;
