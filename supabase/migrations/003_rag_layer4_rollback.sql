-- =============================================================================
-- NarrVoca RAG Layer 4 Migration — Rollback for Migration 003
-- Date: 2026-02-28
--
-- Drops the 6 RAG tables in reverse FK dependency order.
-- Does NOT drop the pgvector extension — other tables or extensions may use it.
-- =============================================================================

DROP TABLE IF EXISTS tutor_sessions;
DROP TABLE IF EXISTS checkpoint_grades;
DROP TABLE IF EXISTS grading_rubrics;
DROP TABLE IF EXISTS rag_context_chunks;
DROP TABLE IF EXISTS rag_query_log;
DROP TABLE IF EXISTS embedding_store;

-- To also remove pgvector (only if no other vector columns remain):
-- DROP EXTENSION IF EXISTS vector;
