-- =============================================================================
-- NarrVoca RAG — Rollback for Migration 004
-- Drops the match_embeddings function.
-- =============================================================================

DROP FUNCTION IF EXISTS match_embeddings(vector, int, text);
